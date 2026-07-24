"use client";

import React from "react";
import Link from "next/link";
import { Shield, Plus, Search, Terminal, Newspaper, Cpu, FileCode2, Lock, Radio, Flame, Globe } from "lucide-react";
import { BoardCategory, SortMode } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";

interface HeaderProps {
  activeCategory: BoardCategory;
  onSelectCategory: (cat: BoardCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onOpenCreateModal?: () => void;
  postCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortMode,
  onSortChange,
  postCount,
}) => {
  const { lang, toggleLang, t } = useLanguage();

  const CATEGORIES: { id: BoardCategory; translationKey: string; icon: React.ReactNode }[] = [
    { id: "all", translationKey: "allFeed", icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: "hot", translationKey: "hotFeed", icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { id: "general", translationKey: "general", icon: <Radio className="w-3.5 h-3.5" /> },
    { id: "crypto", translationKey: "crypto", icon: <Lock className="w-3.5 h-3.5" /> },
    { id: "tech", translationKey: "tech", icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: "news", translationKey: "news", icon: <Newspaper className="w-3.5 h-3.5" /> },
    { id: "files", translationKey: "files", icon: <FileCode2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      {/* Top Banner */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-slate-900 border border-slate-800 overflow-hidden shadow-sm group-hover:border-cyan-500/50 transition-colors">
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
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight text-white font-mono group-hover:text-cyan-300 transition-colors">
                FCINSIDE
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                v2.0-LIVE
              </span>
            </div>
          </div>
        </Link>

        {/* Search, Language Toggle & New Post Button */}
        <div className="flex items-center space-x-3 flex-1 max-w-lg justify-end">
          {/* Search Box */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 text-slate-200 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* KO / EN Language Switch Toggle Button */}
          <button
            onClick={toggleLang}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono cursor-pointer shadow-sm"
            title="Switch Language (한국어 / English)"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">{lang.toUpperCase()}</span>
          </button>

          {/* New Post Button */}
          <Link
            href="/posts/new"
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("newPost")}</span>
          </Link>
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
                  <span>{t(cat.translationKey)}</span>
                </button>
              );
            })}
          </nav>

          {/* Sorting Options */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-0.5 rounded-md border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => onSortChange("latest")}
              className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                sortMode === "latest" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("latest")} ({postCount})
            </button>
            <button
              onClick={() => onSortChange("popular")}
              className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                sortMode === "popular" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("popular")}
            </button>
            <button
              onClick={() => onSortChange("media")}
              className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                sortMode === "media" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("media")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
