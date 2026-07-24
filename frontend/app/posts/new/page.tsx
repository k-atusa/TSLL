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
import { createPost } from "@/lib/api";
import { BoardCategory } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";

export default function CreatePostPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const CATEGORIES: { id: BoardCategory; translationKey: string; prefix: string }[] = [
    { id: "general", translationKey: "general", prefix: "[General]" },
    { id: "crypto", translationKey: "crypto", prefix: "[Crypto]" },
    { id: "tech", translationKey: "tech", prefix: "[Tech]" },
    { id: "news", translationKey: "news", prefix: "[News]" },
    { id: "files", translationKey: "files", prefix: "[Files]" },
  ];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BoardCategory>("general");
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);

    const catObj = CATEGORIES.find((c) => c.id === selectedCategory);
    const prefix = catObj ? catObj.prefix : "[General]";
    const fullTitle = title.startsWith("[") ? title : `${prefix} ${title.trim()}`;

    try {
      const created = await createPost(fullTitle, body, files);
      router.push(`/posts/${created.id}`);
    } catch (err) {
      console.error("Failed to create post", err);
      alert("Failed to publish post. Please check backend connection.");
      setSubmitting(false);
    }
  };

  // Simple Markdown to JSX preview renderer
  const renderMarkdownPreview = (text: string) => {
    if (!text.trim()) {
      return (
        <p className="text-slate-500 italic text-sm">
          No content written yet. Switch to the editor to write your post body.
        </p>
      );
    }

    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-xl font-bold text-cyan-300 mt-4 mb-2">
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-2xl font-bold text-white mt-5 mb-2 border-b border-slate-800 pb-1">
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-3xl font-extrabold text-white mt-6 mb-3">
            {line.replace("# ", "")}
          </h1>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote key={idx} className="border-l-4 border-cyan-500 pl-4 py-1.5 my-2 text-slate-300 italic bg-slate-950/40 rounded-r-sm">
            {line.replace("> ", "")}
          </blockquote>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-5 list-disc text-slate-200 my-1">
            {line.replace(/^[-*]\s+/, "")}
          </li>
        );
      }
      if (line.startsWith("```")) {
        return (
          <div key={idx} className="my-2 p-3 bg-slate-950 font-mono text-xs text-cyan-300 rounded border border-slate-800">
            {line.replace(/```/g, "")}
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-3"></div>;
      }
      return (
        <p key={idx} className="text-base text-slate-200 leading-relaxed my-1">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        activeCategory="all"
        onSelectCategory={() => router.push("/")}
        searchQuery=""
        onSearchChange={() => {}}
        sortMode="latest"
        onSortChange={() => {}}
        onOpenCreateModal={() => {}}
        postCount={0}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-sm font-mono font-medium text-slate-400 hover:text-cyan-400 transition-colors bg-slate-900/60 border border-slate-800 px-3.5 py-2 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("backToFeed")}</span>
          </Link>

          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>FCINSIDE MARKDOWN EDITOR</span>
          </div>
        </div>

        {/* Create Post Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-md p-6 md:p-8 shadow-xl space-y-6">
          <h1 className="text-2xl font-bold font-mono text-white">{t("createTitle")}</h1>

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              {t("selectCategory")}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  {t(cat.translationKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Title Field */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              {t("postTitle")} <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("postTitlePlaceholder")}
              className="w-full px-4 py-3 text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-md border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 font-sans"
            />
          </div>

          {/* WYSIWYG Markdown Body Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
                {t("postContent")}
              </label>

              {/* Edit / Preview Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === "edit" ? "bg-slate-800 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t("editor")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === "preview" ? "bg-slate-800 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t("preview")}</span>
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
                  placeholder="Type post body content... Markdown syntax is automatically supported."
                  className="w-full px-4 py-3 text-base bg-slate-950 text-slate-100 placeholder-slate-500 rounded-b-md border border-t-0 border-slate-800 focus:outline-none focus:border-cyan-500/60 font-sans resize-y"
                ></textarea>
              </div>
            ) : (
              /* Live Preview Mode */
              <div className="min-h-[280px] p-6 bg-slate-950 rounded-md border border-slate-800 font-sans">
                {renderMarkdownPreview(body)}
              </div>
            )}
          </div>

          {/* File Upload Section */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              Attachments & Media Upload (Optional)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-md p-6 text-center transition-colors cursor-pointer ${
                dragActive
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
                <p className="text-sm font-mono text-slate-300">
                  Drag & drop files here, or <span className="text-cyan-400 font-bold underline">browse</span>
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Supports Images, Videos, Code files, Archives
                </p>
              </label>
            </div>

            {/* Attached Files List */}
            {files.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-mono text-slate-400">Attached Files ({files.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate max-w-[180px]">{file.name}</span>
                      <span className="text-slate-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
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
              <span>{submitting ? t("publishing") : t("publish")}</span>
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
