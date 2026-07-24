"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Italic,
  Heading,
  Quote,
  Code,
  List,
  Link as LinkIcon,
  Eye,
  Edit3,
  Paperclip,
  X,
  UploadCloud,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { PostBodyContent } from "@/components/PostBodyContent";
import { buildAttachmentToken, createPost, generateRandomAnonId } from "@/lib/api";
import { BoardCategory } from "@/lib/types";
import { GALLERIES } from "@/lib/constants";

export default function CreatePostPage() {
  const router = useRouter();

  const CATEGORIES = GALLERIES.filter((g) => g.id !== "all" && g.id !== "hot");

  const previewAnon = React.useMemo(() => generateRandomAnonId(), []);

  type DraftAttachment = {
    id: string;
    file: File;
  };

  const [nickname, setNickname] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BoardCategory>("general");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Markdown Formatting Helper
  const insertFormatting = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = body.substring(start, end) || "text";
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).map((file) => ({
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        file,
      }));
      setAttachments((prev) => [...prev, ...selected]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const selected = Array.from(e.dataTransfer.files).map((file) => ({
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        file,
      }));
      setAttachments((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);

    const prefix = `[${selectedCategory}]`;
    const fullTitle = title.startsWith("[") ? title : `${prefix} ${title.trim()}`;
    const finalHandle = nickname.trim();

    try {
      const created = await createPost(fullTitle, body, attachments, finalHandle || undefined);
      router.push(`/posts/${created.id}`);
    } catch (err) {
      console.error("Failed to create post", err);
      alert("Failed to publish post. Please check backend connection.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        activeCategory="all"
        onSelectCategory={() => router.push("/")}
        searchQuery=""
        onSearchChange={() => { }}
        sortMode="latest"
        onSortChange={() => { }}
        postCount={0}
      />

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 py-8 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between font-sans">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors bg-slate-900/60 border border-slate-800 px-3.5 py-2 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로</span>
          </Link>

          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>FCINSIDE 마크다운 에디터</span>
          </div>
        </div>

        {/* Create Post Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-md p-6 md:p-8 shadow-xl space-y-6 font-sans">
          <h1 className="text-2xl font-bold text-white">새 글 작성</h1>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              닉네임 (선택)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={previewAnon.handle}
              className="w-full px-4 py-3 text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 font-sans"
            />
            <p className="text-[11px] text-slate-500 font-mono">
              비워두면 자동으로 익명 닉네임이 적용됩니다.
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              갤러리 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${selectedCategory === cat.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm font-bold"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Title Field */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              제목 <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요..."
              className="w-full px-4 py-3 text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 font-sans"
            />
          </div>

          {/* WYSIWYG Markdown Body Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                본문 내용 (마크다운 지원)
              </label>

              {/* Edit / Preview Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs font-sans">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${activeTab === "edit" ? "bg-slate-800 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>에디터</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${activeTab === "preview" ? "bg-slate-800 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>미리보기</span>
                </button>
              </div>
            </div>

            {/* WYSIWYG Editor Mode */}
            {activeTab === "edit" ? (
              <div className="space-y-2">
                {/* Markdown Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-t-md text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 rounded hover:bg-slate-900 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 rounded hover:bg-slate-900 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>

                  <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>

                  <button
                    type="button"
                    onClick={() => insertFormatting("### ")}
                    className="p-1.5 rounded hover:bg-slate-900 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Heading (### Header)"
                  >
                    <Heading className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormatting("> ")}
                    className="p-1.5 rounded hover:bg-slate-900 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Quote (> blockquote)"
                  >
                    <Quote className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormatting("```\n", "\n```")}
                    className="p-1.5 rounded hover:bg-slate-900 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Code Block (```code```)"
                  >
                    <Code className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormatting("- ")}
                    className="p-1.5 rounded hover:bg-slate-900 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Bullet List (- item)"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormatting("[", "](https://)")}
                    className="p-1.5 rounded hover:bg-slate-900 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Link ([title](url))"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="본문 내용을 입력하세요. 첨부파일 버튼으로 원하는 위치에 이미지를 끼워 넣을 수 있습니다."
                  className="w-full px-4 py-3 text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-b-md border border-t-0 border-slate-800 focus:outline-none focus:border-cyan-500/60 font-sans resize-y"
                ></textarea>
              </div>
            ) : (
              /* Live Preview Mode */
              <div className="min-h-[280px] p-6 bg-slate-950 rounded-md border border-slate-800 font-sans">
                <PostBodyContent
                  body={body}
                  draftAttachments={attachments.map((att) => ({
                    id: att.id,
                    filename: att.file.name,
                    file: att.file,
                  }))}
                  className="space-y-1"
                />
              </div>
            )}
          </div>

          {/* File Upload Section */}
          <div className="space-y-3 font-sans">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              첨부파일 & 미디어 업로드 (선택사항)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-md p-6 text-center transition-colors cursor-pointer ${dragActive
                  ? "border-cyan-400 bg-cyan-950/20"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
                }`}
            >
              <input
                type="file"
                multiple
                id="file-input"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer space-y-2 block">
                <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto" />
                <p className="text-sm font-medium text-slate-300">
                  파일을 여기에 끌어다 놓거나 <span className="text-cyan-400 font-bold underline">클릭하여 선택하세요</span>
                </p>
                <p className="text-xs text-slate-500 font-sans">
                  이미지, 동영상, 소스코드, 압축파일 지원
                </p>
              </label>
            </div>

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-sans text-slate-400">첨부된 파일 ({attachments.length}개):</p>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, idx) => (
                    <div
                      key={attachment.id}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate max-w-[180px]">{attachment.file.name}</span>
                      <span className="text-slate-500">
                        ({(attachment.file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => insertAttachmentToken(attachment.id)}
                        className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                        title="커서 위치에 삽입"
                      >
                        삽입
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-md flex items-center space-x-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "게시글 등록 중..." : "게시글 등록"}</span>
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400 font-mono">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>FALSECRYPT ANONYMOUS SYSTEM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
