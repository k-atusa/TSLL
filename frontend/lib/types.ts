export interface Comment {
  id: string;
  handle: string;
  body: string;
  createdAt: number;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  files: string[];
  createdAt: number; // nanoseconds timestamp
  likes?: number;
  dislikes?: number;
  comments?: Comment[];
}

export interface StorageStats {
  usedBytes: number;
  capBytes: number;
  postCount: number;
  fileCount: number;
}

export type BoardCategory = 'all' | 'hot' | 'general' | 'crypto' | 'tech' | 'news' | 'files';

export type SortMode = 'latest' | 'popular' | 'media';
