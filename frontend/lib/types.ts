export interface Comment {
  id: string;
  handle: string;
  body: string;
  createdAt: number;
}

export interface PostAttachment {
  id: string;
  filename: string;
}

export interface Post {
  id: string;
  gallery: string; // gallery ID this post belongs to
  handle?: string;
  title: string;
  body: string;
  files: string[];
  attachments?: PostAttachment[];
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

export interface GalleryInfo {
  id: string;
  name: string;
  shortName: string;
  icon: string;
}

// BoardCategory is "all" | "hot" | or a dynamic gallery ID string
export type BoardCategory = string;

export type SortMode = 'latest' | 'popular';
