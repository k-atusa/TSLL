"use client";

import React from "react";
import { Shield, Plus, Search, Terminal, Flame, Cpu, FileCode2, Lock, Radio } from "lucide-react";
import { BoardCategory, SortMode } from "@/lib/types";

interface HeaderProps {
  activeCategory: BoardCategory;
  onSelectCategory: (cat: BoardCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onOpenCreateModal: () => void;
  postCount: number;
}

const CATEGORIES: { id: BoardCategory; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All Feed", icon: <Terminal className="w-3.5 h-3.5" /> },
  { id: "general", label: "General", icon: <Radio className="w-3.5 h-3.5" /> },
  { id: "crypto", label: "Crypto / ZK", icon: <Lock className="w-3.5 h-3.5" /> },
  { id: "tech", label: "Tech / Dev", icon: <Cpu className="w-3.5 h-3.5" /> },
  { id: "lounge", label: "Deep Lounge", icon: <Flame className="w-3.5 h-3.5" /> },
  { id: "files", label: "File Vault", icon: <FileCode2 className="w-3.5 h-3.5" /> },
];

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortMode,
  onSortChange,
  onOpenCreateModal,
  postCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      {/* Top Banner */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <img
              src="/logo.png"
              alt="FC Community Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                FC Community <span className="text-cyan-400 font-extrabold">//</span> ANONBOARD
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                v2.0-LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Encrypted Ephemeral Bulletin • No Auth Required
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center space-x-3 flex-1 max-w-md justify-end">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search posts or tripcodes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 text-slate-200 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className="border-t border-slate-900 bg-slate-950/60 px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Categories */}
          <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                  }`}
                >
                  <span className={active ? "text-cyan-400" : "text-slate-500"}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sorting Options */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-0.5 rounded-md border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => onSortChange("latest")}
              className={`px-2.5 py-1 rounded-sm transition-colors ${
                sortMode === "latest" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Latest ({postCount})
            </button>
            <button
              onClick={() => onSortChange("popular")}
              className={`px-2.5 py-1 rounded-sm transition-colors ${
                sortMode === "popular" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Hot
            </button>
            <button
              onClick={() => onSortChange("media")}
              className={`px-2.5 py-1 rounded-sm transition-colors ${
                sortMode === "media" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Media Only
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
