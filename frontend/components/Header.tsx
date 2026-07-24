"use client";

import React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { BoardCategory, SortMode } from "@/lib/types";

interface HeaderProps {
  activeCategory?: BoardCategory;
  onSelectCategory?: (cat: BoardCategory) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  sortMode?: SortMode;
  onSortChange?: (mode: SortMode) => void;
  postCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = "",
  onSearchChange,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-slate-900 border border-slate-800 overflow-hidden shadow-sm group-hover:border-cyan-500/50 transition-colors">
            <img
              src="/logo.png"
              alt="FCINSIDE Logo"
              className="w-full h-full object-cover"
              suppressHydrationWarning
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white font-mono group-hover:text-cyan-300 transition-colors">
            FCINSIDE
          </h1>
        </Link>

        {/* Search & Write Post Button */}
        <div className="flex items-center space-x-3">
          {/* Search Box */}
          {onSearchChange && (
            <div className="relative w-44 sm:w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="검색어를 입력하세요..."
                className="w-full pl-9 pr-7 py-1.5 text-xs sm:text-sm bg-slate-900 text-slate-200 placeholder-slate-500 rounded border border-slate-800 focus:outline-none focus:border-cyan-500/60 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Write Post Button */}
          <Link
            href="/posts/new"
            className="flex items-center space-x-1 px-4 py-1.5 text-xs sm:text-sm font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>글쓰기</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
