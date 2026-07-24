"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Share2,
  Check,
  Paperclip,
  Download,
  Eye,
  X,
  Send,
  Shield,
  ThumbsUp,
  Flame,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CreatePostModal } from "@/components/CreatePostModal";
import { fetchPostDetail, formatTimeAgo, generateAnonId, getFileUrl, isImageFile, isVideoFile, getCleanFileName } from "@/lib/api";
import { BoardCategory, Post, SortMode } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PostDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Reaction counters
  const [reactions, setReactions] = useState({ upvote: 14, fire: 6, shield: 3 });
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [hasFired, setHasFired] = useState(false);
  const [hasShielded, setHasShielded] = useState(false);

  // Comment state
  const [comments, setComments] = useState<
    { id: string; handle: string; body: string; time: string; color: string }[]
  >([
    {
      id: "c1",
      handle: "Anon#9f2a41",
      body: "Thanks for sharing this post. Verified content and attachments locally.",
      time: "15m ago",
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: "c2",
      handle: "Anon#4b8e12",
      body: "Chunk checksums match perfectly. Readable via FalseCrypt network node.",
      time: "6m ago",
      color: "from-purple-500 to-indigo-600",
    },
  ]);
  const [newCommentBody, setNewCommentBody] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchPostDetail(postId);
      if (data) {
        setPost(data);
      } else {
        // Fallback demo post if API is offline
        setPost({
          id: postId,
          title: "[Crypto] Zero-Knowledge Proofs & Ephemeral Chunk Storage Analysis",
          body: `Here is a detailed breakdown of zero-knowledge proof applications in decentralized anonymous networks.

Key Features:
1. Client-side encryption ensures no plaintext leak before upload.
2. Chunk bloom filters maintain integrity while preserving full zero-trace ephemerality.
3. Automatic capacity-based garbage collection (FIFO) guarantees predictable storage bounds.

Feel free to download the attachments below or test uploading your own encrypted payloads.`,
          files: [],
          createdAt: Date.now() * 1_000_000 - 1000000 * 60 * 20,
        });
      }
      setLoading(false);
    }
    loadData();
  }, [postId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim()) return;

    const myAnon = generateAnonId(Date.now().toString());
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
    setNewCommentBody("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Header
          activeCategory="all"
          onSelectCategory={() => router.push("/")}
          searchQuery=""
          onSearchChange={() => {}}
          sortMode="latest"
          onSortChange={() => {}}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          postCount={0}
        />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
          <div className="h-8 bg-slate-900 rounded-md w-32 animate-pulse"></div>
          <div className="h-64 bg-slate-900 rounded-md p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded-sm w-3/4"></div>
            <div className="h-4 bg-slate-800/80 rounded-sm w-full"></div>
            <div className="h-4 bg-slate-800/80 rounded-sm w-5/6"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!post) return null;

  const anonInfo = generateAnonId(post.id);
  const formattedTime = formatTimeAgo(post.createdAt);
  const dateObj = new Date(Math.floor(post.createdAt / 1_000_000));
  const fullDateStr = dateObj.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tagMatch = post.title.match(/^\[(.*?)\]/);
  const categoryTag = tagMatch ? tagMatch[1] : null;
  const cleanTitle = tagMatch ? post.title.replace(/^\[.*?\]\s*/, "") : post.title;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Lightbox backdrop for expanded image */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-60 bg-slate-950/95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-md bg-slate-900 border border-slate-800 cursor-pointer"
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
            className="mt-4 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-md text-sm flex items-center space-x-2 shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Image</span>
          </a>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeCategory="all"
        onSelectCategory={() => router.push("/")}
        searchQuery=""
        onSearchChange={() => {}}
        sortMode="latest"
        onSortChange={() => {}}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        postCount={0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-sm font-mono font-medium text-slate-400 hover:text-cyan-400 transition-colors bg-slate-900/60 border border-slate-800 px-3.5 py-2 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </Link>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            {categoryTag && (
              <span className="px-2.5 py-1 rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">
                #{categoryTag}
              </span>
            )}
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-sm">
              ID: {post.id.slice(-8)}
            </span>
          </div>
        </div>

        {/* Post Card View Container */}
        <article className="bg-slate-900/80 border border-slate-800 rounded-md p-6 md:p-8 shadow-xl space-y-6">
          {/* Post Header Meta */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center space-x-3.5">
              {/* Tripcode Badge */}
              <div
                className={`w-12 h-12 rounded-md bg-gradient-to-br ${anonInfo.color} flex items-center justify-center text-white text-base font-mono font-bold shadow-md`}
              >
                {anonInfo.handle.slice(5, 7).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-base font-bold text-white">
                    {anonInfo.handle}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-mono rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    VERIFIED ANONYMOUS
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formattedTime}</span>
                  <span>•</span>
                  <span>{fullDateStr}</span>
                </div>
              </div>
            </div>

            {/* Share / Copy Button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-md bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Share Post</span>
                </>
              )}
            </button>
          </div>

          {/* Post Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
            {cleanTitle}
          </h1>

          {/* Post Content Body */}
          {post.body && (
            <div className="prose prose-invert max-w-none text-base md:text-lg text-slate-200 leading-relaxed bg-slate-950/60 p-6 rounded-md border border-slate-800/80 whitespace-pre-wrap font-sans">
              {post.body}
            </div>
          )}

          {/* Attachments & Gallery Section */}
          {post.files && post.files.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Paperclip className="w-4.5 h-4.5 text-cyan-400" />
                <span>ATTACHMENTS & MEDIA ({post.files.length})</span>
              </h3>

              {/* Media Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {post.files.map((file, idx) => {
                  const url = getFileUrl(file);
                  const isImg = isImageFile(file);
                  const isVid = isVideoFile(file);

                  if (isImg) {
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(url)}
                        className="group relative aspect-video bg-slate-950 border border-slate-800 rounded-md overflow-hidden cursor-pointer hover:border-cyan-500/60 transition-colors shadow-md"
                      >
                        <img
                          src={url}
                          alt="Post attachment"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono font-medium gap-2 backdrop-blur-xs">
                          <Eye className="w-5 h-5" />
                          <span>Expand Image</span>
                        </div>
                      </div>
                    );
                  } else if (isVid) {
                    return (
                      <div key={idx} className="aspect-video bg-slate-950 border border-slate-800 rounded-md overflow-hidden shadow-md">
                        <video controls src={url} className="w-full h-full object-contain" />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Download Buttons List */}
              <div className="pt-2">
                <h4 className="text-xs font-mono font-medium text-slate-400 mb-2">Direct Downloads:</h4>
                <div className="flex flex-wrap gap-2.5">
                  {post.files.map((file, idx) => (
                    <a
                      key={idx}
                      href={getFileUrl(file)}
                      download={getCleanFileName(file)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2.5 px-4 py-2.5 text-xs font-mono rounded-md bg-slate-950 border border-slate-800 text-cyan-300 hover:bg-slate-900 hover:border-cyan-500/50 transition-all shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold">{getCleanFileName(file)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Post Reactions Bar */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setReactions((r) => ({ ...r, upvote: hasUpvoted ? r.upvote - 1 : r.upvote + 1 }));
                  setHasUpvoted(!hasUpvoted);
                }}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer ${
                  hasUpvoted
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <ThumbsUp className="w-4 h-4 text-cyan-400" />
                <span>Upvote ({reactions.upvote})</span>
              </button>

              <button
                onClick={() => {
                  setReactions((r) => ({ ...r, fire: hasFired ? r.fire - 1 : r.fire + 1 }));
                  setHasFired(!hasFired);
                }}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer ${
                  hasFired
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Hot ({reactions.fire})</span>
              </button>

              <button
                onClick={() => {
                  setReactions((r) => ({ ...r, shield: hasShielded ? r.shield - 1 : r.shield + 1 }));
                  setHasShielded(!hasShielded);
                }}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer ${
                  hasShielded
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Shield ({reactions.shield})</span>
              </button>
            </div>

            <span className="text-xs font-mono text-slate-500">
              Ephemeral Bulletin • Zero Trace
            </span>
          </div>
        </article>

        {/* Anonymous Comments Section */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-md p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h3 className="text-base md:text-lg font-bold font-mono text-white flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <span>ANONYMOUS REPLIES ({comments.length})</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">No Registration Required</span>
          </div>

          {/* Comment List */}
          <div className="space-y-4">
            {comments.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-md bg-slate-950/70 border border-slate-800/90 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">{c.handle}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-sm bg-slate-900 text-slate-400 border border-slate-800">
                      ANON
                    </span>
                  </div>
                  <span className="font-mono text-slate-500 text-xs">{c.time}</span>
                </div>

                <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans pl-4 border-l-2 border-slate-800">
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          {/* Write Reply Form */}
          <form onSubmit={handleAddComment} className="space-y-3 pt-4 border-t border-slate-800/80">
            <label className="block text-xs font-mono font-medium text-slate-400">
              LEAVE AN ANONYMOUS REPLY
            </label>
            <textarea
              rows={3}
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
              placeholder="Write a message or reply to this thread..."
              className="w-full px-4 py-3 text-sm md:text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 resize-y font-sans"
            ></textarea>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs md:text-sm rounded-md flex items-center space-x-2 transition-all shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Anonymous Reply</span>
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400 font-mono">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>FALSECRYPT ANONYMOUS SYSTEM • ZERO LOGS</span>
          </div>
          <span>Post ID: {post.id}</span>
        </div>
      </footer>

      {/* Modal for creating new post */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={(newPost) => {
          router.push(`/posts/${newPost.id}`);
        }}
      />
    </div>
  );
}
