"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { StorageBar } from "@/components/StorageBar";
import { PostCard } from "@/components/PostCard";
import { fetchGalleries, fetchPosts, fetchStorageStats } from "@/lib/api";
import { BoardCategory, GalleryInfo, Post, SortMode, StorageStats } from "@/lib/types";
import { STATIC_GALLERIES, getGalleryName } from "@/lib/constants";
import { Shield, RefreshCw, Layers, Plus, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 100;

export default function Home() {
  const [galleries, setGalleries] = useState<GalleryInfo[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BoardCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("latest");

  // Load gallery list once on mount
  useEffect(() => {
    fetchGalleries().then(setGalleries);
  }, []);

  const loadPosts = useCallback(
    async (gallery: BoardCategory, page: number) => {
      setLoading(true);
      try {
        const { posts: data, total } = await fetchPosts(gallery, page);
        // Client-side sort for "popular" since backend sorts by latest
        const sorted =
          sortMode === "popular"
            ? [...data].sort((a, b) => (b.likes || 0) - (a.likes || 0) || b.createdAt - a.createdAt)
            : data; // backend already sorts latest first
        setPosts(sorted);
        setTotalPosts(total);
        const storageData = await fetchStorageStats();
        setStats(storageData);
      } catch (err) {
        console.warn("Failed to load posts", err);
      } finally {
        setLoading(false);
      }
    },
    [sortMode],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) setSearchQuery(q);
    }
  }, []);

  // Reload when category or page changes
  useEffect(() => {
    loadPosts(activeCategory, currentPage);
  }, [activeCategory, currentPage, loadPosts]);

  const handleSelectCategory = (cat: BoardCategory) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleRefresh = () => loadPosts(activeCategory, currentPage);

  // Client-side search filter (across the current page)
  const filteredPosts = searchQuery.trim()
    ? posts.filter((post) => {
        const q = searchQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(q) ||
          post.body?.toLowerCase().includes(q) ||
          post.id.includes(q)
        );
      })
    : posts;

  const allGalleries: GalleryInfo[] = [...STATIC_GALLERIES, ...galleries];
  const activeGalleryName = getGalleryName(activeCategory, galleries);

  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <Header
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
        postCount={totalPosts}
      />

      {/* Main Layout */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col min-[870px]:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full min-[870px]:w-72 lg:w-80 flex-shrink-0 space-y-4 font-sans">
          <div className="bg-slate-900/80 border border-slate-800 rounded-md p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>갤러리 목록</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">FCINSIDE</span>
            </div>

            <div className="space-y-1">
              {allGalleries.map((g) => {
                const isSelected = activeCategory === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => handleSelectCategory(g.id)}
                    className={`w-full text-left px-3 py-2.5 rounded text-sm font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm"
                        : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-base">{g.icon}</span>
                      <span className="truncate text-sm">{g.name}</span>
                    </div>
                    <span
                      className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-950 text-slate-400"
                      }`}
                    >
                      {g.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Feed Area */}
        <section className="flex-1 space-y-4 min-w-0">
          {/* Gallery Header Bar */}
          <div className="rounded-md bg-slate-900/80 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">{activeGalleryName}</h2>
            </div>

            <div className="flex items-center space-x-3">
              {/* Sort mode */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setSortMode("latest")}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    sortMode === "latest" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  최신순 ({totalPosts})
                </button>
                <button
                  onClick={() => setSortMode("popular")}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    sortMode === "popular" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  인기순
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-xs rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Post Feed */}
          {loading ? (
            <div className="grid grid-cols-1 min-[870px]:grid-cols-2 gap-4">
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
            <div className="columns-1 min-[870px]:columns-2 gap-4 space-y-4">
              {filteredPosts.map((post) => (
                <div key={post.id} className="break-inside-avoid">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded text-xs font-mono transition-all ${
                      currentPage === pageNum
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/40"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
