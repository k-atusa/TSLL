import { Post, StorageStats } from "./types";

const API_BASE = "";

// Helper: Format nanosecond timestamp to relative time string
export function formatTimeAgo(nanoTimestamp: number): string {
  if (!nanoTimestamp) return "Just now";
  const ms = Math.floor(nanoTimestamp / 1_000_000);
  const now = Date.now();
  const diffSec = Math.floor((now - ms) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return new Date(ms).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper: Generate anonymous tripcode / handle from post ID or title
export function generateAnonId(id: string): { handle: string; color: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = Math.abs(hash).toString(16).padStart(6, "0").slice(0, 6);
  const colors = [
    "from-cyan-500 to-blue-600",
    "from-purple-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-pink-500 to-rose-600",
    "from-violet-500 to-fuchsia-600",
  ];
  const colorIndex = Math.abs(hash) % colors.length;
  return {
    handle: `Anon#${hex}`,
    color: colors[colorIndex],
  };
}

// Helper: Get file URL for serving from Go backend
export function getFileUrl(filename: string): string {
  return `${API_BASE}/api/com/files/${encodeURIComponent(filename)}`;
}

// Helper: Check if file is image
export function isImageFile(filename: string): boolean {
  return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(filename);
}

// Helper: Check if file is video
export function isVideoFile(filename: string): boolean {
  return /\.(mp4|webm|ogg|mov)$/i.test(filename);
}

// Helper: Extract original filename (removing timestamp prefix if present)
export function getCleanFileName(filename: string): string {
  const parts = filename.split("_");
  if (parts.length > 1 && /^\d+$/.test(parts[0])) {
    return parts.slice(1).join("_");
  }
  return filename;
}

// API: Fetch all posts
export async function fetchPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API_BASE}/api/com/posts`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data || [];
  } catch (err) {
    console.warn("API fetch error, returning demo fallback posts if server offline", err);
    return getFallbackPosts();
  }
}

// Helper: Format byte counts cleanly (e.g. 104857600 -> 100 MB)
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// API: Fetch backend storage statistics
export async function fetchStorageStats(): Promise<StorageStats> {
  try {
    const res = await fetch(`${API_BASE}/api/com/stats`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("API fetch stats error, using default", err);
    return {
      usedBytes: 1024 * 350,
      capBytes: 104857600, // 100MB
      postCount: 3,
      fileCount: 0,
    };
  }
}

// API: Fetch post detail
export async function fetchPostDetail(id: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API_BASE}/api/com/posts/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("API fetch detail error", err);
    return null;
  }
}

// API: Create new post
export async function createPost(title: string, body: string, files: File[]): Promise<Post> {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("body", body);

  files.forEach((file) => {
    formData.append("files", file);
  });

  const res = await fetch(`${API_BASE}/api/com/posts`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to submit post");
  }

  return await res.json();
}

// API: Like / Upvote post
export async function likePost(id: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/com/posts/${id}/like`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to like post");
  return await res.json();
}

// API: Dislike / Downvote post
export async function dislikePost(id: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/com/posts/${id}/dislike`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to dislike post");
  return await res.json();
}

// API: Add comment to post
export async function addComment(id: string, body: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/com/posts/${id}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error("Failed to post comment");
  return await res.json();
}

// Demo fallback data if Go backend is not running yet during development
function getFallbackPosts(): Post[] {
  const now = Date.now() * 1_000_000;
  return [
    {
      id: "1737719200000000000",
      title: "[Notice] Welcome to FalseCrypt Anonymous CypherBoard v2.0",
      body: "Welcome to FalseCrypt AnonBoard. Post freely without registration. Posts are auto-capped and older posts automatically purge when storage limit is reached. Encrypted, anonymous, ephemeral.",
      files: [],
      createdAt: now - 1000000 * 60 * 15,
    },
    {
      id: "1737719100000000000",
      title: "[Crypto] Zero-Knowledge Proofs & Ephemeral Message Storage",
      body: "Discussion thread on ZK-SNARKs implementation in decentralized chunk storage backends. Anyone analyzed the chunk meta bloom filters yet?",
      files: [],
      createdAt: now - 1000000 * 60 * 120,
    },
    {
      id: "1737719000000000000",
      title: "[Tech] Go Fiber vs Stdlib Net/HTTP benchmark comparison",
      body: "Stdlib net/http with Go 1.22 routing features is surprisingly fast. Built-in chunk balancer performance looks solid.",
      files: [],
      createdAt: now - 1000000 * 60 * 360,
    },
  ];
}
