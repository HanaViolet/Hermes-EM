import type { AgentType } from './market';

export interface SocialComment {
  agentId: string;
  agentName: string;
  content: string;
  tick: number;
}

export interface SocialPost {
  id: string;
  agentId: string;
  agentName: string;
  agentType: AgentType;
  content: string;
  tick: number;
  timestamp: number;
  sentiment: number;
  postType: 'opinion' | 'rumor' | 'analysis' | 'alert';
  likes: number;
  collects: number;
  reposts: number;
  comments: SocialComment[];
  score: number;
  originalMessageTick?: number;
}

export interface SocialRelation {
  followerId: string;
  followeeId: string;
  weight: number;
  createdTick: number;
  likeCount: number;
}

export interface AgentSocialProfile {
  agentId: string;
  agentName: string;
  agentType: AgentType;
  followers: string[];
  following: string[];
  influenceScore: number;
  postCount: number;
  totalLikes: number;
  feed: SocialPost[];
  ownPosts: SocialPost[];
}

export interface SocialMetrics {
  averageSentiment: number;
  rumorHeat: number;
  alertHeat: number;
  totalInteractions: number;
  averageInfluence: number;
  topInfluencers: string[];
  hotPostIds: string[];
}

export interface SocialState {
  posts: SocialPost[];
  relations: SocialRelation[];
  profiles: Record<string, AgentSocialProfile>;
  tick: number;
  metrics: SocialMetrics;
}

export interface GraphNode {
  id: string;
  name: string;
  type: AgentType;
  influenceScore: number;
  followers: number;
  following: number;
  postCount: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}
