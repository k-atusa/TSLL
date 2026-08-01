"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  UploadCloud,
  File,
  Paperclip,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createPost, fetchGalleries, generateRandomAnonId, sanitizeText } from "@/lib/api";
import { BoardCategory, GalleryInfo, Post } from "@/lib/types";
import { buildAttachmentToken } from "@/lib/api";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  defaultCategory?: BoardCategory;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  defaultCategory,
}) => {
  const [galleries, setGalleries] = useState<GalleryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<BoardCategory>(defaultCategory ?? "");
  const [nickname, setNickname] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  type DraftAttachment = {
    id: string;
    file: File;
  };

  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load galleries on open
  useEffect(() => {
    if (isOpen) {
      fetchGalleries().then((list) => {
        setGalleries(list);
        // Auto-select first gallery if no default or default is a system category
        if (!selectedCategory || selectedCategory === "all" || selectedCategory === "hot") {
          if (list.length > 0) setSelectedCategory(list[0].id);
        }
      });
    }
  }, [isOpen]);

  // Generate transient anon ID for modal preview
  const previewAnon = React.useMemo(() => generateRandomAnonId(), []);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newAttachments = Array.from(selectedFiles).map((file) => ({
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      file,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const insertAttachmentToken = (attachmentId: string) => {
    if (!textareaRef.current) return;

    const el = textareaRef.current;
    const token = `${buildAttachmentToken(attachmentId)}\n`;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const nextBody = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(nextBody);

    requestAnimationFrame(() => {
      el.focus();
      const nextCursor = start + token.length;
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeText(title).trim();
    const cleanBody = sanitizeText(body);
    const cleanHandle = sanitizeText(nickname).trim();

    const finalTitle = cleanTitle || "(제목 없음)";

    if (!selectedCategory) {
      setErrorMsg("갤러리를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newPost = await createPost(selectedCategory, finalTitle, cleanBody, attachments, cleanHandle || undefined);
      onPostCreated(newPost);
      // Reset form
      setNickname("");
      setTitle("");
      setBody("");
      setAttachments([]);
      onClose();
    } catch (err) {
      console.error("Post creation error", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload post to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
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
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nickname */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
              NICKNAME (OPTIONAL)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={previewAnon.handle}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60"
            />
            <p className="mt-1 text-[11px] text-slate-500 font-mono">
              비워두면 자동으로 익명 닉네임이 적용됩니다.
            </p>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-2">
              GALLERY
            </label>
            <div className="flex flex-wrap gap-2">
              {galleries.length === 0 ? (
                <span className="text-xs text-slate-500 font-mono">갤러리 로딩 중...</span>
              ) : (
                galleries.map((g) => {
                  const active = selectedCategory === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedCategory(g.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                        active
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      <span>{g.icon}</span>
                      <span>{g.name}</span>
                    </button>
                  );
                })
              )}
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
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60"
            />
          </div>

          {/* Post Content */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
              BODY CONTENT (MARKDOWN SUPPORTED)
            </label>
            <textarea
              ref={textareaRef}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share thoughts, code snippets, or encrypted text notes..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 resize-y"
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
              className={`border-2 border-dashed rounded-md p-5 text-center cursor-pointer transition-all ${
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
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-[11px] font-mono text-slate-400">
                  Attached Files ({attachments.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={attachment.id}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-300"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate max-w-[150px]">{attachment.file.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({(attachment.file.size / 1024).toFixed(0)}KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => insertAttachmentToken(attachment.id)}
                        className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                      >
                        Insert
                      </button>
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
              className="px-5 py-2.5 text-xs font-bold font-mono rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
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
