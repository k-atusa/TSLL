"use client";

import React from "react";
import { Download, Eye } from "lucide-react";
import { PostAttachment } from "@/lib/types";
import { getCleanFileName, getFileUrl, isImageFile, isVideoFile } from "@/lib/api";

export interface DraftAttachmentPreview {
  id?: string;
  filename?: string;
  file?: File;
  url?: string;
}

interface PostBodyContentProps {
  body: string;
  attachments?: PostAttachment[];
  files?: string[];
  draftAttachments?: DraftAttachmentPreview[];
  className?: string;
  onImageClick?: (url: string) => void;
}

const ATTACHMENT_TOKEN_RE = /(\\?)(?:\[\[attach:([a-zA-Z0-9_-]+)\]\])/g;

interface ResolvedAttachment {
  filename: string;
  url: string;
}

function renderInlineParts(
  text: string,
  attachmentsById: Map<string, ResolvedAttachment>,
  onImageClick?: (url: string) => void,
) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  ATTACHMENT_TOKEN_RE.lastIndex = 0;
  while ((match = ATTACHMENT_TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${index++}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    const isEscaped = match[1] === "\\";
    const attachmentId = match[2];

    if (isEscaped) {
      parts.push(<span key={`text-${index++}`}>{`[[attach:${attachmentId}]]`}</span>);
    } else {
      const attachment = attachmentsById.get(attachmentId);
      if (attachment) {
        const url = attachment.url;
        const isImage = isImageFile(attachment.filename);
        const isVideo = isVideoFile(attachment.filename);

        if (isImage) {
          parts.push(
            <div key={`attachment-${index++}`} className="my-3 w-full overflow-hidden rounded-md border border-slate-800 bg-slate-950/60">
              <button
                type="button"
                onClick={() => onImageClick?.(url)}
                className="group relative block w-full cursor-zoom-in text-left"
              >
                <img
                  src={url}
                  alt={getCleanFileName(attachment.filename)}
                  className="w-full max-h-[28rem] object-contain bg-slate-950"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition-opacity group-hover:bg-slate-950/30 group-hover:opacity-100">
                  <Eye className="mr-1.5 h-4 w-4" />
                  확대 보기
                </span>
              </button>
            </div>,
          );
        } else if (isVideo) {
          parts.push(
            <div key={`attachment-${index++}`} className="my-3 w-full overflow-hidden rounded-md border border-slate-800 bg-slate-950/60">
              <video controls src={url} className="w-full max-h-[28rem] bg-black object-contain" />
            </div>,
          );
        } else {
          parts.push(
            <a
              key={`attachment-${index++}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              download={getCleanFileName(attachment.filename)}
              className="my-3 inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-mono text-cyan-300 transition-colors hover:border-cyan-500/50 hover:bg-slate-900"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span className="truncate max-w-[240px]">{getCleanFileName(attachment.filename)}</span>
            </a>,
          );
        }
      } else {
        parts.push(<span key={`text-${index++}`}>{match[0]}</span>);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${index++}`}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

export const PostBodyContent: React.FC<PostBodyContentProps> = ({
  body = "",
  attachments = [],
  files = [],
  draftAttachments = [],
  className = "",
  onImageClick,
}) => {
  if (!body || !body.trim()) return null;

  const attachmentsById = new Map<string, ResolvedAttachment>();

  // 1. Map draft attachments (local files for live preview)
  (draftAttachments ?? []).forEach((draft, idx) => {
    let objectUrl = draft.url;
    if (!objectUrl && draft.file) {
      try {
        objectUrl = URL.createObjectURL(draft.file);
      } catch {
        // Fallback
      }
    }
    const filename = draft.filename || draft.file?.name || `file-${idx}`;
    const entry: ResolvedAttachment = { filename, url: objectUrl || getFileUrl(filename) };

    if (draft.id) attachmentsById.set(draft.id, entry);
    if (!attachmentsById.has(`file-${idx}`)) attachmentsById.set(`file-${idx}`, entry);
    if (!attachmentsById.has(`${idx}`)) attachmentsById.set(`${idx}`, entry);
  });

  // 2. Map post.attachments (ID + filename pairs)
  (attachments ?? []).forEach((att, idx) => {
    const entry: ResolvedAttachment = { filename: att.filename, url: getFileUrl(att.filename) };
    if (att.id) attachmentsById.set(att.id, entry);
    if (!attachmentsById.has(`file-${idx}`)) attachmentsById.set(`file-${idx}`, entry);
    if (!attachmentsById.has(`${idx}`)) attachmentsById.set(`${idx}`, entry);
  });

  // 3. Fallback map post.files (string filenames)
  (files ?? []).forEach((filename, idx) => {
    const entry: ResolvedAttachment = { filename, url: getFileUrl(filename) };
    if (!attachmentsById.has(`file-${idx}`)) attachmentsById.set(`file-${idx}`, entry);
    if (!attachmentsById.has(`${idx}`)) attachmentsById.set(`${idx}`, entry);
    if (!attachmentsById.has(filename)) attachmentsById.set(filename, entry);
  });

  const normalizedBody = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedBody.split("\n");

  return (
    <div className={className}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={lineIndex} className="h-3" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={lineIndex} className="mt-4 mb-2 text-xl font-bold text-cyan-300">
              {renderInlineParts(trimmed.replace(/^###\s+/, ""), attachmentsById, onImageClick)}
            </h3>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={lineIndex} className="mt-5 mb-2 border-b border-slate-800 pb-1 text-2xl font-bold text-white">
              {renderInlineParts(trimmed.replace(/^##\s+/, ""), attachmentsById, onImageClick)}
            </h2>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={lineIndex} className="mt-6 mb-3 text-3xl font-extrabold text-white">
              {renderInlineParts(trimmed.replace(/^#\s+/, ""), attachmentsById, onImageClick)}
            </h1>
          );
        }

        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={lineIndex}
              className="my-2 rounded-r-sm border-l-4 border-cyan-500 bg-slate-950/40 py-1.5 pl-4 italic text-slate-300"
            >
              {renderInlineParts(trimmed.replace(/^>\s+/, ""), attachmentsById, onImageClick)}
            </blockquote>
          );
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={lineIndex} className="my-1 ml-5 flex items-start gap-2 text-slate-200">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>{renderInlineParts(trimmed.replace(/^[-*]\s+/, ""), attachmentsById, onImageClick)}</span>
            </div>
          );
        }

        return (
          <div key={lineIndex} className="my-1 text-slate-200 leading-relaxed whitespace-pre-wrap">
            {renderInlineParts(line, attachmentsById, onImageClick)}
          </div>
        );
      })}
    </div>
  );
};