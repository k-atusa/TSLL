"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, ChevronDown, Layers, Flame, Terminal } from "lucide-react";
import { BoardCategory, SortMode } from "@/lib/types";
import { GALLERIES, getGalleryName } from "@/lib/constants";

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
  activeCategory = "all",
  onSelectCategory,
  searchQuery = "",
  onSearchChange,
  sortMode = "latest",
  onSortChange,
  postCount = 0,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeGalleryName = getGalleryName(activeCategory);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand & Gallery Selector */}
        <div className="flex items-center space-x-4">
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
            <h1 className="text-lg font-black tracking-tight text-white font-mono group-hover:text-cyan-300 transition-colors">
              FCINSIDE
            </h1>
          </Link>

          {/* Quick Gallery Dropdown Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 transition-all cursor-pointer shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold max-w-[130px] truncate">{activeGalleryName}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Gallery Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-md bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 divide-y divide-slate-800/60 font-sans">
                <div className="px-3 py-1.5 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  갤러리 바로가기
                </div>
                <div className="py-1">
                  {GALLERIES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        if (onSelectCategory) onSelectCategory(g.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                        activeCategory === g.id ? "text-cyan-300 bg-cyan-950/30 font-bold" : "text-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span>{g.icon}</span>
                        <span className="truncate">{g.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950">
                        {g.shortName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search & Write Post Button */}
        <div className="flex items-center space-x-2.5">
          {/* Search Box */}
          {onSearchChange && (
            <div className="relative w-36 sm:w-56 md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="검색어 입력..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-900 text-slate-200 placeholder-slate-500 rounded border border-slate-800 focus:outline-none focus:border-cyan-500/60 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* New Post Button */}
          <Link
            href="/posts/new"
            className="flex items-center space-x-1 px-3.5 py-1.5 text-xs font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>글쓰기</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
