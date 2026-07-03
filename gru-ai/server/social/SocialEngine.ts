import { randomUUID } from 'node:crypto';
import type {
  AgentSocialProfile,
  AgentState,
  AgentType,
  SocialPost,
  SocialRelation,
  SocialState,
} from '../simulation/types.js';

const ANALYST_TYPES: AgentType[] = ['quant', 'mutual_fund', 'northbound', 'national_team', 'training_quant'];
const RUMOR_TYPES: AgentType[] = ['hot_money', 'retail'];

const LIKE_WEIGHT = 1;
const COLLECT_WEIGHT = 2;
const REPOST_WEIGHT = 3;
const GRAVITY = 1.5;
const TICKS_PER_HOUR = 30;
const FOLLOW_LIKE_THRESHOLD = 3;
const MAX_POSTS = 200;
const MAX_OWN_POSTS = 20;
const FEED_SIZE = 30;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function relationKey(followerId: string, followeeId: string): string {
  return `${followerId}->${followeeId}`;
}

function weightedInteractionCount(post: SocialPost): number {
  return post.likes * LIKE_WEIGHT + post.collects * COLLECT_WEIGHT + post.reposts * REPOST_WEIGHT + post.comments.length;
}

export class SocialEngine {
  private posts: Map<string, SocialPost> = new Map();
  private relations: Map<string, SocialRelation> = new Map();
  private profiles: Map<string, AgentSocialProfile> = new Map();
  private likeMatrix: Map<string, Map<string, number>> = new Map();
  private processedMessages: Set<string> = new Set();

  tick(agents: AgentState[], currentTick: number): SocialState {
    this.ensureProfiles(agents);
    this.ensureBaselineRelations(agents);
    this.promoteMessagesToPosts(agents, currentTick);
    this.simulateInteractions(agents, currentTick);
    this.updateRelations(currentTick);
    this.updateScores(currentTick);
    this.updateInfluenceScores();
    this.updateFeeds(agents);
    this.writeFeedBackToAgents(agents);
    this.pruneOldPosts();
    this.pruneProcessedMessages();
    return this.getState(currentTick);
  }

  getGraphData() {
    const nodes = Array.from(this.profiles.values()).map((profile) => ({
      id: profile.agentId,
      name: profile.agentName,
      type: profile.agentType,
      influenceScore: profile.influenceScore,
      followers: profile.followers.length,
      following: profile.following.length,
      postCount: profile.postCount,
    }));
    const links = Array.from(this.relations.values()).map((relation) => ({
      source: relation.followerId,
      target: relation.followeeId,
      weight: relation.weight,
    }));
    return { nodes, links };
  }

  getFeed(agentId: string): SocialPost[] {
    return this.profiles.get(agentId)?.feed ?? [];
  }

  getRecentPosts(limit: number): SocialPost[] {
    return Array.from(this.posts.values()).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  getProfile(agentId: string): AgentSocialProfile | null {
    return this.profiles.get(agentId) ?? null;
  }

  private ensureProfiles(agents: AgentState[]): void {
    const liveAgentIds = new Set(agents.map((agent) => agent.id));
    for (const id of this.profiles.keys()) {
      if (!liveAgentIds.has(id)) this.profiles.delete(id);
    }

    for (const agent of agents) {
      const existing = this.profiles.get(agent.id);
      if (existing) {
        existing.agentName = agent.name;
        existing.agentType = agent.type;
        continue;
      }
      this.profiles.set(agent.id, {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        followers: [],
        following: [],
        influenceScore: 0,
        postCount: 0,
        totalLikes: 0,
        feed: [],
        ownPosts: [],
      });
    }
  }

  private ensureBaselineRelations(agents: AgentState[]): void {
    if (this.relations.size > 0) return;

    const byType = new Map<AgentType, AgentState[]>();
    for (const agent of agents) {
      byType.set(agent.type, [...(byType.get(agent.type) ?? []), agent]);
    }

    const addTypeFollow = (fromType: AgentType, toTypes: AgentType[], weight: number) => {
      for (const from of byType.get(fromType) ?? []) {
        for (const toType of toTypes) {
          for (const to of byType.get(toType) ?? []) {
            if (from.id !== to.id) this.addRelation(from.id, to.id, weight, 0, 0);
          }
        }
      }
    };

    addTypeFollow('retail', ['hot_money', 'quant'], 0.35);
    addTypeFollow('hot_money', ['retail', 'quant'], 0.4);
    addTypeFollow('mutual_fund', ['northbound', 'quant'], 0.45);
    addTypeFollow('northbound', ['mutual_fund', 'national_team'], 0.4);
    addTypeFollow('quant', ['hot_money', 'mutual_fund', 'northbound'], 0.5);
    addTypeFollow('training_quant', ['quant', 'hot_money', 'retail'], 0.55);
    addTypeFollow('national_team', ['mutual_fund', 'northbound'], 0.32);
  }

  private addRelation(followerId: string, followeeId: string, weight: number, createdTick: number, likeCount: number): void {
    const key = relationKey(followerId, followeeId);
    const existing = this.relations.get(key);
    if (existing) {
      existing.weight = clamp01(Math.max(existing.weight, weight));
      existing.likeCount = Math.max(existing.likeCount, likeCount);
    } else {
      this.relations.set(key, {
        followerId,
        followeeId,
        weight: clamp01(weight),
        createdTick,
        likeCount,
      });
    }

    const follower = this.profiles.get(followerId);
    const followee = this.profiles.get(followeeId);
    if (follower && !follower.following.includes(followeeId)) follower.following.push(followeeId);
    if (followee && !followee.followers.includes(followerId)) followee.followers.push(followerId);
  }

  private promoteMessagesToPosts(agents: AgentState[], tick: number): void {
    for (const agent of agents) {
      const messages = agent.outbox.filter((message) => !message.to && message.content.trim().length > 0);
      for (const message of messages) {
        const messageKey = `${agent.id}:${message.tick}:${message.content}`;
        if (this.processedMessages.has(messageKey)) continue;
        this.processedMessages.add(messageKey);

        const post: SocialPost = {
          id: randomUUID(),
          agentId: agent.id,
          agentName: agent.name,
          agentType: agent.type,
          content: message.content,
          tick,
          timestamp: Date.now(),
          sentiment: agent.sentiment,
          postType: this.inferPostType(agent.type, agent.sentiment, message.content),
          likes: 0,
          collects: 0,
          reposts: 0,
          comments: [],
          score: 0,
          originalMessageTick: message.tick,
        };
        this.posts.set(post.id, post);

        const profile = this.profiles.get(agent.id);
        if (profile) {
          profile.postCount += 1;
          profile.ownPosts = [post, ...profile.ownPosts].slice(0, MAX_OWN_POSTS);
        }
      }
    }
  }

  private simulateInteractions(agents: AgentState[], tick: number): void {
    const recentPosts = Array.from(this.posts.values())
      .filter((post) => post.tick >= tick - 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);

    for (const post of recentPosts) {
      const authorProfile = this.profiles.get(post.agentId);
      const authorInfluence = authorProfile?.influenceScore ?? 0;

      for (const agent of agents) {
        if (agent.id === post.agentId) continue;
        const receiverProfile = this.profiles.get(agent.id);
        const followsAuthor = Boolean(receiverProfile?.following.includes(post.agentId));
        const sentimentAffinity = clamp01(1 - Math.abs(agent.sentiment - post.sentiment) / 1.6);
        const sameTypeBoost = agent.type === post.agentType ? 0.08 : 0;
        const followBoost = followsAuthor ? 0.12 : 0;
        const hotlistBoost = clamp01(post.score / 8) * 0.08;

        const likeProbability = clamp01(0.05 + sentimentAffinity * 0.22 + sameTypeBoost + followBoost + hotlistBoost);
        if (Math.random() < likeProbability) {
          post.likes += 1;
          this.recordLike(agent.id, post.agentId);
        }

        const collectProbability = clamp01(0.015 + (ANALYST_TYPES.includes(post.agentType) ? 0.04 : 0) + sameTypeBoost * 0.4);
        if (Math.random() < collectProbability) {
          post.collects += 1;
          this.recordLike(agent.id, post.agentId);
        }

        const repostProbability = clamp01(0.01 + authorInfluence * 0.12 + (post.postType === 'rumor' || post.postType === 'alert' ? 0.05 : 0));
        if (Math.random() < repostProbability) {
          post.reposts += 1;
          this.recordLike(agent.id, post.agentId);
        }

        const commentProbability = post.postType === 'alert' ? 0.025 : 0.01;
        if (Math.random() < commentProbability) {
          post.comments.push({
            agentId: agent.id,
            agentName: agent.name,
            content: agent.sentiment * post.sentiment >= 0
              ? '同向关注，等待盘口确认'
              : '观点有分歧，先看成交反馈',
            tick,
          });
        }
      }
    }
  }

  private recordLike(fromId: string, toId: string): void {
    if (!this.likeMatrix.has(fromId)) {
      this.likeMatrix.set(fromId, new Map());
    }
    const row = this.likeMatrix.get(fromId)!;
    row.set(toId, (row.get(toId) ?? 0) + 1);

    const existing = this.relations.get(relationKey(fromId, toId));
    if (existing) {
      existing.likeCount += 1;
      existing.weight = clamp01(existing.weight + 0.02);
    }
  }

  private updateRelations(currentTick: number): void {
    for (const [fromId, toMap] of this.likeMatrix) {
      for (const [toId, likeCount] of toMap) {
        if (likeCount >= FOLLOW_LIKE_THRESHOLD) {
          this.addRelation(fromId, toId, Math.min(1, likeCount / 10), currentTick, likeCount);
        }
      }
    }
  }

  private updateScores(currentTick: number): void {
    for (const post of this.posts.values()) {
      const ageTicks = Math.max(0, currentTick - post.tick);
      const ageHours = ageTicks / TICKS_PER_HOUR;
      post.score = Number((weightedInteractionCount(post) / Math.pow(ageHours + 2, GRAVITY)).toFixed(4));
    }
  }

  private updateFeeds(agents: AgentState[]): void {
    const globalTop = Array.from(this.posts.values()).sort((a, b) => b.score - a.score).slice(0, FEED_SIZE);

    for (const agent of agents) {
      const profile = this.profiles.get(agent.id);
      if (!profile) continue;

      const following = new Set(profile.following);
      const followingPosts = Array.from(this.posts.values())
        .filter((post) => following.has(post.agentId) && post.agentId !== agent.id)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.floor(FEED_SIZE * 0.7));

      const seen = new Set(followingPosts.map((post) => post.id));
      const fillPosts = globalTop
        .filter((post) => !seen.has(post.id) && post.agentId !== agent.id)
        .slice(0, FEED_SIZE - followingPosts.length);

      profile.feed = [...followingPosts, ...fillPosts];
    }
  }

  private updateInfluenceScores(): void {
    for (const profile of this.profiles.values()) {
      profile.totalLikes = Array.from(this.posts.values())
        .filter((post) => post.agentId === profile.agentId)
        .reduce((sum, post) => sum + post.likes, 0);
    }

    const maxLikes = Math.max(1, ...Array.from(this.profiles.values()).map((profile) => profile.totalLikes));
    for (const profile of this.profiles.values()) {
      const followerFactor = Math.log(profile.followers.length + 2) / Math.log(50);
      const likeFactor = Math.log(profile.totalLikes + 1) / Math.log(maxLikes + 1);
      profile.influenceScore = Number(clamp01(followerFactor * 0.6 + likeFactor * 0.4).toFixed(4));
    }
  }

  private writeFeedBackToAgents(agents: AgentState[]): void {
    for (const agent of agents) {
      const profile = this.profiles.get(agent.id);
      if (profile) {
        agent.socialFeed = profile.feed.slice(0, 5);
      }
    }
  }

  private pruneOldPosts(): void {
    if (this.posts.size <= MAX_POSTS) return;
    const sorted = Array.from(this.posts.values()).sort((a, b) => b.score - a.score);
    const keep = new Set(sorted.slice(0, MAX_POSTS).map((post) => post.id));
    for (const id of this.posts.keys()) {
      if (!keep.has(id)) this.posts.delete(id);
    }
  }

  private pruneProcessedMessages(): void {
    if (this.processedMessages.size <= MAX_POSTS * 3) return;
    this.processedMessages = new Set(Array.from(this.processedMessages).slice(-MAX_POSTS * 2));
  }

  private inferPostType(type: AgentType, sentiment: number, content: string): SocialPost['postType'] {
    const lower = content.toLowerCase();
    if (lower.includes('传闻') || lower.includes('听说') || lower.includes('封单') || RUMOR_TYPES.includes(type)) {
      return 'rumor';
    }
    if (lower.includes('风险') || lower.includes('撤退') || lower.includes('恐慌') || Math.abs(sentiment) > 0.68) {
      return 'alert';
    }
    if (ANALYST_TYPES.includes(type)) return 'analysis';
    return 'opinion';
  }

  private getState(tick: number): SocialState {
    const posts = Array.from(this.posts.values()).sort((a, b) => b.score - a.score).slice(0, MAX_POSTS);
    const profiles = Array.from(this.profiles.values());
    const totalInteractions = posts.reduce((sum, post) => sum + weightedInteractionCount(post), 0);
    const averageSentiment = posts.length ? posts.reduce((sum, post) => sum + post.sentiment, 0) / posts.length : 0;
    const rumorHeat = posts.filter((post) => post.postType === 'rumor').reduce((sum, post) => sum + post.score, 0);
    const alertHeat = posts.filter((post) => post.postType === 'alert').reduce((sum, post) => sum + post.score, 0);

    return {
      posts,
      relations: Array.from(this.relations.values()),
      profiles: Object.fromEntries(this.profiles),
      tick,
      metrics: {
        averageSentiment: Number(averageSentiment.toFixed(4)),
        rumorHeat: Number(rumorHeat.toFixed(4)),
        alertHeat: Number(alertHeat.toFixed(4)),
        totalInteractions,
        averageInfluence: Number((profiles.reduce((sum, profile) => sum + profile.influenceScore, 0) / Math.max(1, profiles.length)).toFixed(4)),
        topInfluencers: profiles.sort((a, b) => b.influenceScore - a.influenceScore).slice(0, 5).map((profile) => profile.agentId),
        hotPostIds: posts.slice(0, 5).map((post) => post.id),
      },
    };
  }
}
