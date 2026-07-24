"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  Share2,
  Check,
  Shield,
  ThumbsUp,
  Flame,
  Paperclip,
  FileText,
  Clock,
  Send,
  Eye,
} from "lucide-react";
import { Post } from "@/lib/types";
import {
  formatTimeAgo,
  generateAnonId,
  generateRandomAnonId,
  getHandleBadgeText,
  getFileUrl,
  isImageFile,
  isVideoFile,
  getCleanFileName,
  normalizeAnonHandle,
} from "@/lib/api";

interface PostDetailModalProps {
  post: Post | null;
  onClose: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Simulated local comments section for community interaction feel
  const [comments, setComments] = useState<
    { id: string; handle: string; body: string; time: string; color: string }[]
  >([
    {
      id: "c1",
      handle: "익명#9f2a41",
      body: "Thanks for posting this. Checking file checksums now.",
      time: "10m ago",
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "c2",
      handle: "익명#4b8e12",
      body: "Confirmed readable via FalseCrypt node.",
      time: "4m ago",
      color: "from-purple-500 to-indigo-500",
    },
  ]);
  const [newCommentHandle, setNewCommentHandle] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");

  if (!post) return null;

  const displayHandle = post.handle ? normalizeAnonHandle(post.handle) || post.handle : generateAnonId(post.id).handle;
  const anonInfo = post.handle ? generateAnonId(post.handle) : generateAnonId(post.id);
  const formattedTime = formatTimeAgo(post.createdAt);
  const previewAnon = generateRandomAnonId();

  const handleCopyLink = () => {
    const url = `${window.location.origin}#post-${post.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim()) return;

    const submittedHandle = newCommentHandle.trim();
    const myAnon = submittedHandle ? { handle: submittedHandle, color: generateAnonId(submittedHandle).color } : generateRandomAnonId();
    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        handle: myAnon.handle,
        body: newCommentBody.trim(),
        time: "Just now",
        color: myAnon.color,
      },
    ]);
    setNewCommentHandle("");
    setNewCommentBody("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Lightbox backdrop for expanded image */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-60 bg-slate-950/95 flex flex-col items-center justify-center p-4"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-md bg-slate-900 border border-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="Full size media"
            className="max-w-full max-h-[85vh] object-contain rounded-md border border-slate-800 shadow-2xl"
          />
          <a
            href={selectedImage}
            download
            target="_blank"
            rel="noreferrer"
            className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-md text-xs flex items-center space-x-2 shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Download Image</span>
          </a>
        </div>
      )}

      {/* Main Modal Card */}
      <div
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-md bg-gradient-to-br ${anonInfo.color} flex items-center justify-center text-white font-mono font-bold text-sm shadow-md`}
            >
              {getHandleBadgeText(displayHandle)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-semibold text-white">
                  {displayHandle}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  VERIFIED ANONYMOUS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formattedTime}</span>
                <span>•</span>
                <span>Post ID: {post.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Share post link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-slate-200">
          {/* Post Title */}
          <h2 className="text-xl font-bold text-white leading-snug tracking-tight">
            {post.title}
          </h2>

          {/* Post Text Body */}
          {post.body && (
            <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-md border border-slate-800/60 whitespace-pre-wrap">
              {post.body}
            </div>
          )}

          {/* Media Attachments Section */}
          {post.files && post.files.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Paperclip className="w-4 h-4 text-cyan-400" />
                <span>ATTACHMENTS ({post.files.length})</span>
              </h4>

              {/* Images & Videos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {post.files.map((file, idx) => {
                  const url = getFileUrl(file);
                  const isImg = isImageFile(file);
                  const isVid = isVideoFile(file);
                  const cleanName = getCleanFileName(file);

                  if (isImg) {
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(url)}
                        className="group relative aspect-video bg-slate-950 border border-slate-800 rounded-md overflow-hidden cursor-pointer hover:border-cyan-500/60 transition-colors"
                      >
                        <img
                          src={url}
                          alt="Post media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono font-medium gap-1.5 backdrop-blur-xs">
                          <Eye className="w-4 h-4" />
                          <span>Expand Image</span>
                        </div>
                      </div>
                    );
                  } else if (isVid) {
                    return (
                      <div key={idx} className="aspect-video bg-slate-950 border border-slate-800 rounded-md overflow-hidden">
                        <video controls src={url} className="w-full h-full object-contain" />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Download Buttons for All Files */}
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <h5 className="text-xs font-mono font-medium text-slate-400 mb-2">File Downloads:</h5>
                <div className="flex flex-wrap gap-2">
                  {post.files.map((file, idx) => (
                    <a
                      key={idx}
                      href={getFileUrl(file)}
                      download={getCleanFileName(file)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 px-3 py-2 text-xs font-mono rounded-md bg-slate-950 border border-slate-800 text-cyan-300 hover:bg-slate-800 hover:border-cyan-500/50 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate max-w-[200px]">{getCleanFileName(file)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Anon Replies / Comments */}
          <div className="pt-6 border-t border-slate-800/80 space-y-4">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              ANONYMOUS REPLIES ({comments.length})
            </h4>

            {/* Comment Feed */}
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-md bg-slate-950/60 border border-slate-800/70 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-cyan-400">{normalizeAnonHandle(c.handle) || c.handle}</span>
                    <span className="font-mono text-slate-500">{c.time}</span>
                  </div>
                  <p className="text-slate-300 leading-normal">{c.body}</p>
                </div>
              ))}
            </div>

            {/* Post Reply Form */}
            <form onSubmit={handleAddComment} className="space-y-2 pt-2">
              <input
                type="text"
                value={newCommentHandle}
                onChange={(e) => setNewCommentHandle(e.target.value)}
                placeholder={previewAnon.handle}
                className="w-full px-3 py-2 text-xs bg-slate-950 text-slate-200 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-sans"
              />
              <textarea
                rows={3}
                value={newCommentBody}
                onChange={(e) => setNewCommentBody(e.target.value)}
                placeholder="Write an anonymous reply..."
                className="w-full px-3 py-2 text-xs bg-slate-950 text-slate-200 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-sans"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-md flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>FalseCrypt Ephemeral Vault</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
