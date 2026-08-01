import { GalleryInfo, Post, StorageStats } from "./types";

export interface AttachmentUpload {
  id: string;
  file: File;
}

const API_BASE = "";

// Helper: Format nanosecond timestamp to YYYY.MM.DD. HH:mm:ss (24h + seconds)
export function formatFullDate(nanoTimestamp: number): string {
  if (!nanoTimestamp) return "";
  const date = new Date(Math.floor(nanoTimestamp / 1_000_000));
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const DD = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${YYYY}.${MM}.${DD}. ${HH}:${mm}:${ss}`;
}

// Helper: Format nanosecond timestamp to relative Korean time string or full date
export function formatTimeAgo(nanoTimestamp: number): string {
  if (!nanoTimestamp) return "방금 전";
  const ms = Math.floor(nanoTimestamp / 1_000_000);
  const now = Date.now();
  const diffSec = Math.floor((now - ms) / 1000);

  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}일 전`;

  return formatFullDate(nanoTimestamp);
}

// Helper: Generate anonymous tripcode handle (e.g. 익명#75fa) from post/comment ID
export function generateAnonId(id: string): { handle: string; color: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = Math.abs(hash).toString(16).padStart(4, "0").slice(0, 4);
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
    handle: `익명#${hex}`,
    color: colors[colorIndex],
  };
}

export function normalizeAnonHandle(handle?: string | null): string {
  if (!handle) return "";
  return handle.replace(/^Anon#/i, "익명#");
}

export function getHandleBadgeText(handle?: string | null): string {
  const cleanedHandle = normalizeAnonHandle(handle);
  if (!cleanedHandle) return "?";
  const suffix = cleanedHandle.includes("#") ? cleanedHandle.split("#").pop() || cleanedHandle : cleanedHandle;
  return suffix.slice(0, 2).toUpperCase();
}

export function generateRandomAnonId(): { handle: string; color: string } {
  const seed = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return generateAnonId(seed);
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

export function buildAttachmentToken(id: string): string {
  return `[[attach:${id}]]`;
}

export function stripAttachmentTokens(text: string): string {
  return text.replace(/\[\[attach:[a-zA-Z0-9-]+\]\]/g, "");
}

// API: Fetch list of galleries from backend
export async function fetchGalleries(): Promise<GalleryInfo[]> {
  try {
    const res = await fetch(`${API_BASE}/api/com/galleries`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data || [];
  } catch (err) {
    console.warn("API fetchGalleries error, returning empty list", err);
    return [];
  }
}

// API: Fetch posts for a gallery, with pagination (page starts at 1)
export async function fetchPosts(
  gallery = "all",
  page = 1,
): Promise<{ posts: Post[]; total: number; page: number }> {
  try {
    const params = new URLSearchParams({ gallery, page: String(page) });
    const res = await fetch(`${API_BASE}/api/com/posts?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const posts: Post[] = (await res.json()) || [];
    const total = parseInt(res.headers.get("X-Total-Count") ?? "0", 10);
    return { posts, total, page };
  } catch (err) {
    console.warn("API fetch error, returning empty list", err);
    return { posts: [], total: 0, page };
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
      usedBytes: 0,
      capBytes: 104857600, // 100MB
      postCount: 0,
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
export async function createPost(
  galleryId: string,
  title: string,
  body: string,
  attachments: AttachmentUpload[],
  handle?: string,
): Promise<Post> {
  const formData = new FormData();
  formData.append("gallery", galleryId);
  formData.append("title", title);
  formData.append("body", body);
  if (handle) {
    formData.append("handle", handle);
  }

  attachments.forEach((attachment) => {
    formData.append("attachmentIds", attachment.id);
    formData.append("files", attachment.file);
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
export async function addComment(id: string, body: string, handle?: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/com/posts/${id}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body, handle }),
  });
  if (!res.ok) throw new Error("Failed to post comment");
  return await res.json();
}
