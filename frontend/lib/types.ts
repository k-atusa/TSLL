export interface Post {
  id: string;
  title: string;
  body: string;
  files: string[];
  createdAt: number; // nanoseconds timestamp
}

export type BoardCategory = 'all' | 'general' | 'crypto' | 'tech' | 'lounge' | 'files';

export type SortMode = 'latest' | 'popular' | 'media';

export interface ReactionState {
  fire: number;
  upvote: number;
  shield: number;
  bookmark: boolean;
}
