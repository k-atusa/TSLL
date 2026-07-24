"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  File,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createPost, generateAnonId } from "@/lib/api";
import { BoardCategory, Post } from "@/lib/types";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  defaultCategory?: BoardCategory;
}

const CATEGORIES: { id: BoardCategory; label: string; prefix: string }[] = [
  { id: "general", label: "General", prefix: "[General]" },
  { id: "crypto", label: "Crypto / ZK", prefix: "[Crypto]" },
  { id: "tech", label: "Tech / Dev", prefix: "[Tech]" },
  { id: "lounge", label: "Lounge", prefix: "[Lounge]" },
  { id: "files", label: "File Vault", prefix: "[Files]" },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  defaultCategory = "general",
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BoardCategory>(defaultCategory);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate transient anon ID for modal preview
  const previewAnon = React.useMemo(() => generateAnonId("anon-transient-preview"), []);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
    const categoryPrefix = categoryObj ? `${categoryObj.prefix} ` : "";
    const finalTitle = title.startsWith("[") ? title : `${categoryPrefix}${title}`;

    try {
      const newPost = await createPost(finalTitle, body, files);
      onPostCreated(newPost);
      // Reset form
      setTitle("");
      setBody("");
      setFiles([]);
      onClose();
    } catch (err: any) {
      console.error("Post creation error", err);
      setErrorMsg(err.message || "Failed to upload post to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">NEW ANONYMOUS POST</h3>
              <p className="text-[11px] text-slate-400">
                Posting as <span className="font-mono text-cyan-400 font-semibold">{previewAnon.handle}</span> (No Trace)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-2">
              BOARD CATEGORY
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      active
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post Title */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
              TITLE <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title or topic summary..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60"
            />
          </div>

          {/* Post Content */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
              BODY CONTENT (MARKDOWN SUPPORTED)
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share thoughts, code snippets, or encrypted text notes..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 resize-y"
            ></textarea>
          </div>

          {/* File Drag & Drop Upload Zone */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
              ATTACHMENTS (IMAGES, VIDEOS, DOCUMENTS)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFileSelect(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-cyan-400 bg-cyan-500/10"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <UploadCloud className="w-7 h-7 mx-auto mb-2 text-cyan-400 animate-bounce" />
              <p className="text-xs font-medium text-slate-300">
                Click or drag files here to attach
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Supports images, mp4, pdf, zip, txt up to storage capacity
              </p>
            </div>

            {/* Selected File List */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-[11px] font-mono text-slate-400">
                  Attached Files ({files.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({(file.size / 1024).toFixed(0)}KB)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold font-mono rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Broadcast Post</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
