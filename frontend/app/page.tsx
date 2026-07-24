"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { StorageBar } from "@/components/StorageBar";
import { PostCard } from "@/components/PostCard";
import { fetchPosts, fetchStorageStats } from "@/lib/api";
import { BoardCategory, Post, SortMode, StorageStats } from "@/lib/types";
import { GALLERIES, getGalleryName } from "@/lib/constants";
import { Shield, RefreshCw, Layers, Plus } from "lucide-react";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BoardCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("latest");

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await fetchPosts();
      setPosts(data);
      const storageData = await fetchStorageStats();
      setStats(storageData);
    } catch (err) {
      console.warn("Failed to load posts", err);
    } finally {
      setLoading(false);
    }
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
          return (b.likes || 0) - (a.likes || 0) || b.createdAt - a.createdAt;
        }
        // Default latest
        return b.createdAt - a.createdAt;
      });
  }, [posts, activeCategory, searchQuery, sortMode]);

  const activeGalleryName = getGalleryName(activeCategory);

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
        postCount={filteredPosts.length}
      />

      {/* Main Layout Container: Left Sidebar + Right Feed */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar: DCInside Style Gallery List */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-4 font-sans">
          <div className="bg-slate-900/80 border border-slate-800 rounded-md p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>갤러리 목록</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">FCINSIDE</span>
            </div>

            {/* Gallery Item Buttons */}
            <div className="space-y-1">
              {GALLERIES.map((g) => {
                const isSelected = activeCategory === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveCategory(g.id)}
                    className={`w-full text-left px-3 py-2.5 rounded text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                      }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span>{g.icon}</span>
                      <span className="truncate">{g.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-950 text-slate-500"
                      }`}>
                      {g.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Main Feed Area */}
        <section className="flex-1 space-y-4 min-w-0">
          {/* Gallery Header Bar & Sort Options */}
          <div className="rounded-md bg-slate-900/80 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                {activeGalleryName}
              </h2>
            </div>

            <div className="flex items-center space-x-3">
              {/* Sort mode buttons */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setSortMode("latest")}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${sortMode === "latest" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  최신순 ({filteredPosts.length})
                </button>
                <button
                  onClick={() => setSortMode("popular")}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${sortMode === "popular" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  인기순
                </button>
                <button
                  onClick={() => setSortMode("media")}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${sortMode === "media" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  미디어순
                </button>
              </div>

              {/* Refresh button */}
              <button
                onClick={loadPosts}
                disabled={loading}
                className="p-2 text-xs rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Post Feed List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-44 bg-slate-900/40 border border-slate-800/60 rounded p-5 animate-pulse flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-5 bg-slate-800/80 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-800/60 rounded w-full"></div>
                  </div>
                  <div className="h-4 bg-slate-800/50 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-md bg-slate-900/40 border border-slate-800/60 space-y-3">
              <Layers className="w-10 h-10 mx-auto text-slate-600 animate-bounce" />
              <h3 className="text-base font-bold text-slate-300 font-sans">게시물이 없습니다</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                조건에 맞는 게시물이 없습니다. 첫 번째 글을 등록해보세요!
              </p>
              <Link
                href="/posts/new"
                className="mt-2 px-4 py-2 text-xs font-bold rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>첫 글 작성하기</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400 font-mono">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>FCINSIDE 익명 시스템 • 로그 없음</span>
          </div>

          <StorageBar posts={posts} stats={stats} />
        </div>
      </footer>
    </div>
  );
}
