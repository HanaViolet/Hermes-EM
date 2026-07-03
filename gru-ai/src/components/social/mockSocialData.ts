import type { SocialState } from '@/types/social';

const AGENTS = [
  { id: 'retail-001', name: '散户小陈', type: 'retail' as const, sentiment: 0.72 },
  { id: 'retail-002', name: '散户老李', type: 'retail' as const, sentiment: -0.31 },
  { id: 'hot-001', name: '游资快手', type: 'hot_money' as const, sentiment: 0.81 },
  { id: 'quant-001', name: '量化因子', type: 'quant' as const, sentiment: 0.18 },
  { id: 'fund-001', name: '公募稳健A', type: 'mutual_fund' as const, sentiment: 0.23 },
  { id: 'north-001', name: '北向资金', type: 'northbound' as const, sentiment: 0.35 },
  { id: 'nat-001', name: '国家队护盘', type: 'national_team' as const, sentiment: 0.10 },
  { id: 'hermes-001', name: 'Hermes Agent', type: 'training_quant' as const, sentiment: 0.05 },
];

const RAW_POSTS = [
  { agentIdx: 0, postType: 'opinion' as const, content: '新闻热度拉满，散户注意力快速聚集，但我会等盘口确认后再追。', likes: 34, collects: 12, reposts: 8, tick: 10 },
  { agentIdx: 2, postType: 'alert' as const, content: '封板资金开始试探，量价齐升但换手过快，追高要盯住撤单。', likes: 52, collects: 20, reposts: 15, tick: 12 },
  { agentIdx: 3, postType: 'analysis' as const, content: '动量因子转强，订单簿买盘倾斜，但拥挤度已进入观察区。', likes: 28, collects: 18, reposts: 6, tick: 14 },
  { agentIdx: 1, postType: 'rumor' as const, content: '听说主力在出货，传闻还没有验证，先降低仓位观察。', likes: 9, collects: 3, reposts: 2, tick: 15 },
  { agentIdx: 4, postType: 'analysis' as const, content: '估值区间仍可接受，公募更关注盈利质量和流动性折价。', likes: 21, collects: 14, reposts: 4, tick: 16 },
  { agentIdx: 5, postType: 'analysis' as const, content: '北向资金小幅流入，偏好低估值和高股息，短期情绪贡献有限。', likes: 44, collects: 22, reposts: 11, tick: 18 },
  { agentIdx: 6, postType: 'opinion' as const, content: '极端下跌时以稳定流动性为主，护盘不是直接拉升价格。', likes: 38, collects: 16, reposts: 9, tick: 25 },
  { agentIdx: 7, postType: 'analysis' as const, content: 'Hermes 认为情绪链正在过热，建议把仓位从进攻切到防守观察。', likes: 31, collects: 19, reposts: 7, tick: 26 },
  { agentIdx: 2, postType: 'rumor' as const, content: '龙头可能要变盘，传闻热度很高但成交反馈还没跟上。', likes: 41, collects: 11, reposts: 18, tick: 28 },
  { agentIdx: 3, postType: 'analysis' as const, content: '盘口深度下降、买卖价差扩大，情绪冲击正在传导到交易成本。', likes: 26, collects: 16, reposts: 5, tick: 42 },
];

const RELATIONS = [
  { followerId: 'retail-001', followeeId: 'hot-001', weight: 0.85, likeCount: 9 },
  { followerId: 'retail-001', followeeId: 'quant-001', weight: 0.62, likeCount: 6 },
  { followerId: 'retail-002', followeeId: 'nat-001', weight: 0.68, likeCount: 6 },
  { followerId: 'hot-001', followeeId: 'retail-001', weight: 0.44, likeCount: 4 },
  { followerId: 'quant-001', followeeId: 'north-001', weight: 0.50, likeCount: 5 },
  { followerId: 'fund-001', followeeId: 'north-001', weight: 0.60, likeCount: 6 },
  { followerId: 'fund-001', followeeId: 'quant-001', weight: 0.45, likeCount: 4 },
  { followerId: 'north-001', followeeId: 'nat-001', weight: 0.55, likeCount: 5 },
  { followerId: 'hermes-001', followeeId: 'quant-001', weight: 0.72, likeCount: 7 },
  { followerId: 'hermes-001', followeeId: 'hot-001', weight: 0.58, likeCount: 5 },
  { followerId: 'hermes-001', followeeId: 'retail-001', weight: 0.42, likeCount: 4 },
  { followerId: 'retail-001', followeeId: 'hermes-001', weight: 0.36, likeCount: 3 },
];

function makePost(index: number, raw: typeof RAW_POSTS[number]) {
  const agent = AGENTS[raw.agentIdx];
  const sentiment = agent.sentiment;
  const age = (45 - raw.tick) / 30;
  const interactions = raw.likes + raw.collects * 2 + raw.reposts * 3;
  const score = Number((interactions / Math.pow(age + 2, 1.5)).toFixed(4));
  return {
    id: `mock-post-${index}`,
    agentId: agent.id,
    agentName: agent.name,
    agentType: agent.type,
    content: raw.content,
    tick: raw.tick,
    timestamp: Date.now() - (45 - raw.tick) * 3000,
    sentiment,
    postType: raw.postType,
    likes: raw.likes,
    collects: raw.collects,
    reposts: raw.reposts,
    comments: [],
    score,
    originalMessageTick: raw.tick,
  };
}

export const MOCK_SOCIAL_STATE: SocialState = (() => {
  const posts = RAW_POSTS.map((post, index) => makePost(index, post));
  const relations = RELATIONS.map((relation) => ({ ...relation, createdTick: 5 }));
  const influenceMap: Record<string, number> = {};

  for (const agent of AGENTS) {
    const followerCount = relations.filter((relation) => relation.followeeId === agent.id).length;
    const totalLikes = posts.filter((post) => post.agentId === agent.id).reduce((sum, post) => sum + post.likes, 0);
    const followerFactor = Math.log(followerCount + 2) / Math.log(12);
    const likeFactor = Math.log(totalLikes + 1) / Math.log(100);
    influenceMap[agent.id] = Math.min(1, Number((followerFactor * 0.6 + likeFactor * 0.4).toFixed(4)));
  }

  const sortedPosts = [...posts].sort((a, b) => b.score - a.score);
  const profiles: SocialState['profiles'] = {};

  for (const agent of AGENTS) {
    const ownPosts = sortedPosts.filter((post) => post.agentId === agent.id);
    const following = relations.filter((relation) => relation.followerId === agent.id).map((relation) => relation.followeeId);
    const followers = relations.filter((relation) => relation.followeeId === agent.id).map((relation) => relation.followerId);
    const followingSet = new Set(following);
    const followingPosts = sortedPosts.filter((post) => followingSet.has(post.agentId) && post.agentId !== agent.id).slice(0, 8);
    const seen = new Set(followingPosts.map((post) => post.id));
    const hotFill = sortedPosts.filter((post) => !seen.has(post.id) && post.agentId !== agent.id).slice(0, 10 - followingPosts.length);

    profiles[agent.id] = {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      followers,
      following,
      influenceScore: influenceMap[agent.id] ?? 0,
      postCount: ownPosts.length,
      totalLikes: ownPosts.reduce((sum, post) => sum + post.likes, 0),
      feed: [...followingPosts, ...hotFill],
      ownPosts,
    };
  }

  const totalInteractions = posts.reduce((sum, post) => sum + post.likes + post.collects * 2 + post.reposts * 3 + post.comments.length, 0);

  return {
    posts: sortedPosts,
    relations,
    profiles,
    tick: 45,
    metrics: {
      averageSentiment: Number((posts.reduce((sum, post) => sum + post.sentiment, 0) / Math.max(1, posts.length)).toFixed(4)),
      rumorHeat: Number(posts.filter((post) => post.postType === 'rumor').reduce((sum, post) => sum + post.score, 0).toFixed(4)),
      alertHeat: Number(posts.filter((post) => post.postType === 'alert').reduce((sum, post) => sum + post.score, 0).toFixed(4)),
      totalInteractions,
      averageInfluence: Number((Object.values(profiles).reduce((sum, profile) => sum + profile.influenceScore, 0) / Math.max(1, Object.keys(profiles).length)).toFixed(4)),
      topInfluencers: Object.values(profiles).sort((a, b) => b.influenceScore - a.influenceScore).slice(0, 5).map((profile) => profile.agentId),
      hotPostIds: sortedPosts.slice(0, 5).map((post) => post.id),
    },
  };
})();
