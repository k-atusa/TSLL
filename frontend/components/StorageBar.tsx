"use client";

import React from "react";
import { Post, StorageStats } from "@/lib/types";
import { formatBytes } from "@/lib/api";

interface StorageBarProps {
  posts: Post[];
  stats?: StorageStats | null;
}

export const StorageBar: React.FC<StorageBarProps> = ({ posts, stats }) => {
  const capBytes = stats?.capBytes || 104857600; // default 100MB
  const usedBytes = stats ? stats.usedBytes : posts.length * 1500;

  const rawPercentage = capBytes > 0 ? (usedBytes / capBytes) * 100 : 0;
  const displayPercentage = rawPercentage < 0.1 && usedBytes > 0 ? "0.1" : rawPercentage.toFixed(1);
  const progressPercentage = Math.max(1, Math.min(100, rawPercentage));

  const formattedCapStr = formatBytes(capBytes);
  const formattedUsedStr = formatBytes(usedBytes);

  return (
    <div className="flex items-center space-x-2.5 text-xs font-mono text-slate-400">
      <span>
        Storage: <strong className="text-cyan-400 font-semibold">{formattedUsedStr}</strong> / {formattedCapStr} ({displayPercentage}%)
      </span>
      <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60 inline-block">
        <div
          className="h-full bg-cyan-400 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};
