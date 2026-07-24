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
  ThumbsDown,
  MessageSquare,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CreatePostModal } from "@/components/CreatePostModal";
import { PostBodyContent } from "@/components/PostBodyContent";
import {
  fetchPostDetail,
  formatTimeAgo,
  formatFullDate,
  generateAnonId,
  generateRandomAnonId,
  getHandleBadgeText,
  getFileUrl,
  isImageFile,
  isVideoFile,
  getCleanFileName,
  normalizeAnonHandle,
  likePost,
  dislikePost,
  addComment,
} from "@/lib/api";
import { BoardCategory, Comment, Post } from "@/lib/types";
import { getGalleryName, getGalleryDisplayName } from "@/lib/constants";

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

  // Real reaction likes state
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);

  // Real comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentHandle, setNewCommentHandle] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const previewAnon = React.useMemo(() => generateRandomAnonId(), []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchPostDetail(postId);
      if (data) {
        setPost(data);
        setLikesCount(data.likes || 0);
        setDislikesCount(data.dislikes || 0);
        setComments(data.comments || []);
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

  const handleLike = async () => {
    if (hasLiked || !post) return;
    setHasLiked(true);
    setLikesCount((prev) => prev + 1);
    try {
      const updated = await likePost(post.id);
      if (updated && typeof updated.likes === "number") {
        setLikesCount(updated.likes);
      }
    } catch (err) {
      console.warn("Error liking post", err);
    }
  };

  const handleDislike = async () => {
    if (hasDisliked || !post) return;
    setHasDisliked(true);
    setDislikesCount((prev) => prev + 1);
    try {
      const updated = await dislikePost(post.id);
      if (updated && typeof updated.dislikes === "number") {
        setDislikesCount(updated.dislikes);
      }
    } catch (err) {
      console.warn("Error disliking post", err);
    }
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || !post || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const submittedHandle = newCommentHandle.trim();
    try {
      const updatedPost = await addComment(post.id, newCommentBody.trim(), submittedHandle || undefined);
      if (updatedPost && updatedPost.comments) {
        setComments(updatedPost.comments);
      } else {
        // Fallback local append
        const anon = submittedHandle ? { handle: submittedHandle, color: generateAnonId(submittedHandle).color } : generateRandomAnonId();
        setComments((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            handle: anon.handle,
            body: newCommentBody.trim(),
            createdAt: Date.now() * 1_000_000,
          },
        ]);
      }
      setNewCommentHandle("");
      setNewCommentBody("");
    } catch (err) {
      console.error("Failed to post comment", err);
      alert("Failed to send comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Header
          activeCategory="all"
          onSelectCategory={() => router.push("/")}
          searchQuery=""
          onSearchChange={() => { }}
          sortMode="latest"
          onSortChange={() => { }}
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

  const postHandle = post.handle ? normalizeAnonHandle(post.handle) || post.handle : generateAnonId(post.id).handle;
  const anonInfo = post.handle ? generateAnonId(post.handle) : generateAnonId(post.id);
  const formattedTime = post ? formatTimeAgo(post.createdAt) : "";
  const fullDateStr = post ? formatFullDate(post.createdAt) : "";

  // Extract tag from title if present
  const tagMatch = post?.title.match(/^\[(.*?)\]/);
  const categoryTag = tagMatch ? tagMatch[1] : null;
  const cleanTitle = tagMatch ? post.title.replace(/^\[.*?\]\s*/, "") : post?.title || "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Expanded Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={selectedImage}
            alt="Full size view"
            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl border border-slate-800"
          />

          <a
            href={selectedImage}
            download
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 px-5 py-2.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>다운로드</span>
          </a>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeCategory="all"
        onSelectCategory={() => router.push("/")}
        searchQuery=""
        onSearchChange={() => { }}
        sortMode="latest"
        onSortChange={() => { }}
        postCount={0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 py-8 space-y-8">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between font-sans">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors bg-slate-900/60 border border-slate-800 px-3.5 py-2 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로</span>
          </Link>

          {categoryTag && (
            <span className="px-2.5 py-1 rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-sans text-xs font-semibold">
              {getGalleryDisplayName(categoryTag)}
            </span>
          )}
        </div>

        {/* Post Card View Container */}
        <article className="bg-slate-900/80 border border-slate-800 rounded-md p-6 md:p-8 shadow-xl space-y-6">
          {/* Post Header Meta */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center space-x-3.5">
              {/* Tripcode Badge */}
              <div
                className={`w-11 h-11 rounded-md bg-gradient-to-br ${anonInfo.color} flex items-center justify-center text-white text-sm font-mono font-bold shadow-md`}
              >
                {getHandleBadgeText(postHandle)}
              </div>

              <div>
                <span className="font-mono text-base font-bold text-white block">
                  {postHandle}
                </span>
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{fullDateStr}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500">{formattedTime}</span>
                </div>
              </div>
            </div>

            {/* Share / Copy Button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-md bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all text-xs font-sans cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">링크 복사 완료!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>게시글 공유</span>
                </>
              )}
            </button>
          </div>

          {/* Post Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight font-sans">
            {cleanTitle}
          </h1>

          {/* Post Content Body */}
          {post.body && (
            <div className="prose prose-invert max-w-none text-base md:text-lg text-slate-100 leading-relaxed font-sans py-2">
              <PostBodyContent
                body={post.body}
                attachments={post.attachments}
                files={post.files}
                onImageClick={setSelectedImage}
              />
            </div>
          )}

          {/* Attachments Section */}
          {post.files && post.files.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2 font-sans">
                <Paperclip className="w-4.5 h-4.5 text-cyan-400" />
                <span>첨부파일 ({post.files.length})</span>
              </h3>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {post.files.map((file, idx) => (
                  <a
                    key={idx}
                    href={getFileUrl(file)}
                    download={getCleanFileName(file)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2.5 px-4 py-2.5 text-xs font-mono rounded-md bg-slate-950 border border-slate-800 text-cyan-300 hover:bg-slate-900 hover:border-cyan-500/50 transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold truncate max-w-[280px]">{getCleanFileName(file)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Post Reactions / Likes Bar */}
          <div className="pt-6 border-t border-slate-800/80 flex items-center space-x-3 font-mono">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md border text-xs md:text-sm font-semibold transition-all cursor-pointer ${hasLiked
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700"
                }`}
            >
              <ThumbsUp className={`w-4 h-4 ${hasLiked ? "text-cyan-400 fill-cyan-400/20" : "text-cyan-400"}`} />
              <span>개추 ({likesCount})</span>
            </button>

            <button
              onClick={handleDislike}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md border text-xs md:text-sm font-semibold transition-all cursor-pointer ${hasDisliked
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700"
                }`}
            >
              <ThumbsDown className={`w-4 h-4 ${hasDisliked ? "text-rose-400 fill-rose-400/20" : "text-rose-400"}`} />
              <span>비추 ({dislikesCount})</span>
            </button>
          </div>
        </article>

        {/* Anonymous Comments Section */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-md p-6 md:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="text-base md:text-lg font-bold font-mono text-white flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <span>댓글 ({comments.length})</span>
            </h3>
          </div>

          {/* Comment List */}
          {comments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm font-mono">
              작성된 댓글이 없습니다. 첫 댓글을 남겨보세요!
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {comments.map((c) => (
                <div key={c.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {normalizeAnonHandle(c.handle) || c.handle}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 text-xs">
                      {formatTimeAgo(c.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans pl-4 border-l-2 border-slate-800">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Write Reply Form */}
          <form onSubmit={handleAddCommentSubmit} className="space-y-3 pt-4 border-t border-slate-800/80">
            <label className="block text-xs font-mono font-medium text-slate-400">
              댓글 작성하기
            </label>
            <input
              type="text"
              value={newCommentHandle}
              onChange={(e) => setNewCommentHandle(e.target.value)}
              placeholder={previewAnon.handle}
              className="w-full px-4 py-3 text-sm md:text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 font-sans"
            />
            <textarea
              rows={3}
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="w-full px-4 py-3 text-sm md:text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 resize-y font-sans"
            ></textarea>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentBody.trim()}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs md:text-sm rounded-md flex items-center space-x-2 transition-all shadow-md disabled:opacity-50 cursor-pointer font-sans"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmittingComment ? "등록 중..." : "댓글 등록"}</span>
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
            <span>FALSECRYPT ANONYMOUS SYSTEM</span>
          </div>
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
