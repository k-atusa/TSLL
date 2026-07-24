"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { StorageBar } from "@/components/StorageBar";
import { PostCard } from "@/components/PostCard";
import { fetchPosts, fetchStorageStats } from "@/lib/api";
import { BoardCategory, Post, SortMode, StorageStats } from "@/lib/types";
import { Shield, RefreshCw, Layers, Sparkles, MessageSquare } from "lucide-react";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BoardCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("latest");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] = useState<Post | null>(null);

  const loadPosts = async () => {
    setLoading(true);
    const [data, statsData] = await Promise.all([fetchPosts(), fetchStorageStats()]);
    setPosts(data);
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Filter & Sort logic
  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        // Category Filter
        if (activeCategory !== "all") {
          if (activeCategory === "hot") {
            if ((post.likes || 0) < 10) return false;
          } else if (activeCategory === "files") {
            if (!post.files || post.files.length === 0) return false;
          } else {
            const catPattern = new RegExp(`\\[${activeCategory}\\]`, "i");
            if (!catPattern.test(post.title)) {
              if (activeCategory === "general" && !post.title.startsWith("[")) {
                // match
              } else {
                return false;
              }
            }
          }
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = post.title.toLowerCase().includes(q);
          const matchBody = post.body?.toLowerCase().includes(q);
          const matchId = post.id.includes(q);
          if (!matchTitle && !matchBody && !matchId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortMode === "media") {
          const aMedia = a.files?.length || 0;
          const bMedia = b.files?.length || 0;
          return bMedia - aMedia;
        }
        if (sortMode === "popular") {
          // Sort by timestamp + file weight
          return (b.files?.length || 0) - (a.files?.length || 0) || b.createdAt - a.createdAt;
        }
        // Default latest
        return b.createdAt - a.createdAt;
      });
  }, [posts, activeCategory, searchQuery, sortMode]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    fetchStorageStats().then((s) => setStats(s)).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header component */}
      <Header
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        postCount={filteredPosts.length}
      />

      {/* Main Board Layout Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Hero Banner / Board Status */}
        <div className="relative rounded-md bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800/80 p-5 md:p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span>EPHEMERAL CYPHER BOARD</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono">
                {activeCategory === "all"
                  ? "Global Feed // All Posts"
                  : `Board Category // #${activeCategory.toUpperCase()}`}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Post anonymously, upload files, or stream media without user accounts. Oldest posts automatically purge when total server storage hits capacity.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadPosts}
                disabled={loading}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-mono rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Refresh feed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 text-xs font-mono font-bold rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md cursor-pointer"
              >
                + Post Anon
              </button>
            </div>
          </div>
        </div>

        {/* Post Grid Feed */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 bg-slate-900/40 border border-slate-800/60 rounded-md p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-slate-800 rounded-sm w-1/3"></div>
                  <div className="h-5 bg-slate-800/80 rounded-sm w-3/4"></div>
                  <div className="h-3 bg-slate-800/60 rounded-sm w-full"></div>
                </div>
                <div className="h-4 bg-slate-800/50 rounded-sm w-1/4"></div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-md bg-slate-900/40 border border-slate-800/60 space-y-3">
            <Layers className="w-10 h-10 mx-auto text-slate-600 animate-bounce" />
            <h3 className="text-base font-bold text-slate-300 font-mono">No Posts Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No anonymous posts match your current filter or search criteria. Be the first to create one!
            </p>
            <Link
              href="/posts/new"
              className="mt-2 px-4 py-2 text-xs font-mono font-bold rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <span>+ Create First Post</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400 font-mono">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>FALSECRYPT ANONYMOUS SYSTEM • ZERO LOGS</span>
          </div>

          <StorageBar posts={posts} stats={stats} />
        </div>
      </footer>
    </div>
  );
}
