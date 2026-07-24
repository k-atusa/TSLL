"use client";

import React, { useState } from "react";
import {
  Flame,
  ThumbsUp,
  Shield,
  Share2,
  FileText,
  Image as ImageIcon,
  Check,
  ExternalLink,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import { Post } from "@/lib/types";
import {
  formatTimeAgo,
  generateAnonId,
  getFileUrl,
  isImageFile,
  isVideoFile,
  getCleanFileName,
} from "@/lib/api";

interface PostCardProps {
  post: Post;
  onOpenDetail?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onOpenDetail }) => {
  const [reactions, setReactions] = useState({
    upvote: Math.floor(parseInt(post.id.slice(-3) || "12") % 47) + 2,
    fire: Math.floor(parseInt(post.id.slice(-2) || "5") % 19),
    shield: Math.floor(parseInt(post.id.slice(-4) || "8") % 11),
  });

  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [hasFired, setHasFired] = useState(false);
  const [hasShielded, setHasShielded] = useState(false);
  const [copied, setCopied] = useState(false);

  const anonInfo = generateAnonId(post.id);
  const formattedTime = formatTimeAgo(post.createdAt);

  const imageFiles = post.files?.filter((f) => isImageFile(f)) || [];
  const otherFiles = post.files?.filter((f) => !isImageFile(f)) || [];

  // Extract tag from title if present like "[Crypto] ZK Proofs"
  const tagMatch = post.title.match(/^\[(.*?)\]/);
  const categoryTag = tagMatch ? tagMatch[1] : null;
  const cleanTitle = tagMatch ? post.title.replace(/^\[.*?\]\s*/, "") : post.title;

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasUpvoted) {
      setReactions((r) => ({ ...r, upvote: r.upvote - 1 }));
      setHasUpvoted(false);
    } else {
      setReactions((r) => ({ ...r, upvote: r.upvote + 1 }));
      setHasUpvoted(true);
    }
  };

  const handleFire = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasFired) {
      setReactions((r) => ({ ...r, fire: r.fire - 1 }));
      setHasFired(false);
    } else {
      setReactions((r) => ({ ...r, fire: r.fire + 1 }));
      setHasFired(true);
    }
  };

  const handleShield = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasShielded) {
      setReactions((r) => ({ ...r, shield: r.shield - 1 }));
      setHasShielded(false);
    } else {
      setReactions((r) => ({ ...r, shield: r.shield + 1 }));
      setHasShielded(true);
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
    <Link href={`/posts/${post.id}`} className="block group">
      <article
        className="relative bg-slate-900/70 border border-slate-800/90 group-hover:border-cyan-500/50 rounded-md p-4 md:p-5 transition-all duration-200 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.12)] cursor-pointer"
      >
      {/* Header info */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2.5">
          {/* Tripcode Badge */}
          <div
            className={`w-7 h-7 rounded-sm bg-gradient-to-br ${anonInfo.color} flex items-center justify-center text-white text-[11px] font-mono font-bold shadow-sm`}
          >
            {anonInfo.handle.slice(5, 7).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                {anonInfo.handle}
              </span>
              {categoryTag && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  #{categoryTag}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{formattedTime}</span>
          </div>
        </div>

        {/* Post ID & Options */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800">
            ID: {post.id.slice(-6)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-slate-100 group-hover:text-white mb-2 leading-snug tracking-tight">
        {cleanTitle}
      </h3>

      {/* Body preview */}
      {post.body && (
        <p className="text-xs text-slate-300 line-clamp-3 mb-3 leading-relaxed whitespace-pre-wrap">
          {post.body}
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
              className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-mono rounded-sm bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            >
              <Paperclip className="w-3 h-3 text-cyan-400" />
              <span className="truncate max-w-[140px]">{getCleanFileName(file)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Card Footer / Reactions bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleUpvote}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-sm border transition-all ${
              hasUpvoted
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? "text-cyan-400 fill-cyan-400/20" : ""}`} />
            <span>{reactions.upvote}</span>
          </button>

          <button
            onClick={handleFire}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-sm border transition-all ${
              hasFired
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${hasFired ? "text-amber-400 fill-amber-400/20" : ""}`} />
            <span>{reactions.fire}</span>
          </button>

          <button
            onClick={handleShield}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-sm border transition-all ${
              hasShielded
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Shield className={`w-3.5 h-3.5 ${hasShielded ? "text-purple-400 fill-purple-400/20" : ""}`} />
            <span>{reactions.shield}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {post.files && post.files.length > 0 && (
            <span className="flex items-center space-x-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-sm border border-cyan-800/40">
              <Paperclip className="w-3 h-3" />
              <span>{post.files.length}</span>
            </span>
          )}

          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-sm bg-slate-950/60 border border-slate-800 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors text-slate-400"
            title="Copy share link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </article>
  </Link>
);
};
