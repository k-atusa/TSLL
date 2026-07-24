"use client";

import React from "react";
import { HardDrive, Info, Trash2, AlertCircle } from "lucide-react";
import { Post } from "@/lib/types";

interface StorageBarProps {
  posts: Post[];
  postCapBytes?: number;
}

export const StorageBar: React.FC<StorageBarProps> = ({
  posts,
  postCapBytes = 104857600, // 100 MB default from config.json
}) => {
  // Approximate total size (JSON payload + files count estimate)
  const totalPosts = posts.length;
  const fileCount = posts.reduce((acc, p) => acc + (p.files?.length || 0), 0);
  
  // Estimate capacity percentage for display
  const estimatedUsedBytes = Math.min(
    postCapBytes * 0.95,
    (totalPosts * 1500) + (fileCount * 1200000)
  );
  const percentage = Math.min(100, Math.max(8, Math.round((estimatedUsedBytes / postCapBytes) * 100)));

  const formattedCapMB = (postCapBytes / (1024 * 1024)).toFixed(0);
  const formattedUsedMB = (estimatedUsedBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 backdrop-blur-sm text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-semibold text-slate-200">STORAGE CAP: {formattedCapMB}MB</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            Auto FIFO Purge Enabled
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 text-[11px] font-mono">
          <span>{totalPosts} Posts</span>
          <span>•</span>
          <span>{fileCount} Attachments</span>
          <span>•</span>
          <span className="text-cyan-400 font-medium">{percentage}% Allocated</span>
        </div>
      </div>

      {/* Capacity Gauge */}
      <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            percentage > 85
              ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
              : "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-1 text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>When storage limit ({formattedCapMB}MB) is reached, oldest posts are automatically deleted to maintain zero-trace ephemerality.</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1 text-amber-400/90 font-mono text-[10px]">
          <AlertCircle className="w-3 h-3" />
          <span>No central logs retained</span>
        </div>
      </div>
    </div>
  );
};
