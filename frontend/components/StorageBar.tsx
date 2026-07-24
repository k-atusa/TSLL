"use client";

import React from "react";
import { HardDrive, Info, AlertCircle } from "lucide-react";
import { Post, StorageStats } from "@/lib/types";
import { formatBytes } from "@/lib/api";

interface StorageBarProps {
  posts: Post[];
  stats?: StorageStats | null;
}

export const StorageBar: React.FC<StorageBarProps> = ({ posts, stats }) => {
  // Use real stats from server if available, otherwise calculate fallback
  const capBytes = stats?.capBytes || 104857600; // default 100MB from config.json
  const usedBytes = stats ? stats.usedBytes : posts.length * 1500;
  
  const rawPercentage = capBytes > 0 ? (usedBytes / capBytes) * 100 : 0;
  const displayPercentage = rawPercentage < 0.1 && usedBytes > 0 ? "0.1" : rawPercentage.toFixed(1);
  const progressPercentage = Math.max(1, Math.min(100, rawPercentage));

  const totalPosts = stats ? stats.postCount : posts.length;
  const fileCount = stats ? stats.fileCount : posts.reduce((acc, p) => acc + (p.files?.length || 0), 0);

  const formattedCapStr = formatBytes(capBytes);
  const formattedUsedStr = formatBytes(usedBytes);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 backdrop-blur-sm text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-semibold text-slate-200">
            STORAGE CAP: {formattedCapStr}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            Auto FIFO Purge Enabled
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 text-[11px] font-mono">
          <span>{totalPosts} Posts</span>
          <span>•</span>
          <span>{fileCount} Attachments</span>
          <span>•</span>
          <span className="text-slate-300 font-mono">
            Used: <strong className="text-cyan-400">{formattedUsedStr}</strong>
          </span>
          <span>•</span>
          <span className="text-cyan-400 font-bold font-mono">
            {displayPercentage}% Allocated
          </span>
        </div>
      </div>

      {/* Capacity Gauge */}
      <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            progressPercentage > 85
              ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
              : "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          }`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-1 text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>
            When storage limit ({formattedCapStr}) is reached, oldest posts & attached files are automatically deleted.
          </span>
        </div>

        <div className="hidden sm:flex items-center space-x-1 text-amber-400/90 font-mono text-[10px]">
          <AlertCircle className="w-3 h-3" />
          <span>Measured on Disk</span>
        </div>
      </div>
    </div>
  );
};
