"use client";

import React, { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Check,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import { Post } from "@/lib/types";
import {
  formatTimeAgo,
  generateAnonId,
  getHandleBadgeText,
  getFileUrl,
  isImageFile,
  getCleanFileName,
  stripAttachmentTokens,
  likePost,
  dislikePost,
  normalizeAnonHandle,
} from "@/lib/api";


interface PostCardProps {
  post: Post;
  onOpenDetail?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [hasDownvoted, setHasDownvoted] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayHandle = post.handle ? normalizeAnonHandle(post.handle) || post.handle : generateAnonId(post.id).handle;
  const anonInfo = post.handle ? generateAnonId(post.handle) : generateAnonId(post.id);
  const formattedTime = formatTimeAgo(post.createdAt);

  const imageFiles = post.files?.filter((f) => isImageFile(f)) || [];
  const otherFiles = post.files?.filter((f) => !isImageFile(f)) || [];

  const categoryTag = post.gallery || null;
  const displayTitle = post.title?.trim() || "(제목 없음)";

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasUpvoted) return;
    setHasUpvoted(true);
    setLikesCount((prev) => prev + 1);
    try {
      const updated = await likePost(post.id);
      if (updated && typeof updated.likes === "number") {
        setLikesCount(updated.likes);
      }
    } catch (err) {
      console.warn("Error sending upvote to server", err);
    }
  };

  const handleDownvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasDownvoted) return;
    setHasDownvoted(true);
    setDislikesCount((prev) => prev + 1);
    try {
      const updated = await dislikePost(post.id);
      if (updated && typeof updated.dislikes === "number") {
        setDislikesCount(updated.dislikes);
      }
    } catch (err) {
      console.warn("Error sending dislike to server", err);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Link href={`/posts/${post.id}`} className="block group h-full">
      <article
        className="h-full flex flex-col justify-between relative bg-slate-900/70 border border-slate-800/90 group-hover:border-cyan-500/50 rounded-md p-4 md:p-5 transition-all duration-200 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.12)] cursor-pointer"
      >
        <div className="flex-1 flex flex-col">
          {/* Header info */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2.5">
              {/* Tripcode Badge */}
              <div
                className={`w-8 h-8 rounded-sm bg-gradient-to-br ${anonInfo.color} flex items-center justify-center text-white text-xs font-mono font-bold shadow-sm`}
              >
                {getHandleBadgeText(displayHandle)}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {displayHandle}
                  </span>
                  {categoryTag && (
                    <span className="px-2 py-0.5 text-xs font-sans font-medium rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {categoryTag}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">{formattedTime}</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg md:text-xl font-bold text-slate-100 group-hover:text-white mb-2 leading-snug tracking-tight">
            {displayTitle}
          </h3>

          {/* Body preview */}
          {post.body && (
            <p className="text-sm text-slate-300 line-clamp-3 mb-3 leading-relaxed whitespace-pre-wrap">
              {stripAttachmentTokens(post.body)}
            </p>
          )}

          {/* Media & Attachments Preview Grid */}
          {imageFiles.length > 0 && (
            <div className="my-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {imageFiles.slice(0, 3).map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-video rounded-sm overflow-hidden border border-slate-800 bg-slate-950 group-hover:border-slate-700 transition-colors"
                >
                  <img
                    src={getFileUrl(img)}
                    alt="Attachment preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  {idx === 2 && imageFiles.length > 3 && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center text-white text-xs font-mono font-bold">
                      +{imageFiles.length - 2} more
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Non-image attachment indicators */}
          {otherFiles.length > 0 && (
            <div className="my-2 flex flex-wrap gap-1.5">
              {otherFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono rounded-sm bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[140px]">{getCleanFileName(file)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer / Reactions bar */}
        <div className="mt-auto pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between text-xs sm:text-sm text-slate-300 gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpvote}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm border transition-all ${
                hasUpvoted
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                  : "bg-slate-950/60 text-slate-300 border-slate-800 hover:text-slate-100 hover:border-slate-700"
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? "text-cyan-400 fill-cyan-400/20" : ""}`} />
              <span className="text-xs font-medium">{likesCount}</span>
            </button>

            <button
              onClick={handleDownvote}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm border transition-all ${
                hasDownvoted
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold"
                  : "bg-slate-950/60 text-slate-300 border-slate-800 hover:text-slate-100 hover:border-slate-700"
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${hasDownvoted ? "text-rose-400 fill-rose-400/20" : ""}`} />
              <span className="text-xs font-medium">{dislikesCount}</span>
            </button>

            <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm border border-slate-800 bg-slate-950/60 text-slate-300 font-mono text-xs">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>{post.comments?.length || 0}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {post.files && post.files.length > 0 && (
              <span className="flex items-center space-x-1 text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-sm border border-cyan-800/40">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{post.files.length}</span>
              </span>
            )}

            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-sm bg-slate-950/60 border border-slate-800 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors text-slate-400"
              title="Copy share link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
};
