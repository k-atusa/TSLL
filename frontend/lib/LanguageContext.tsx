"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ko" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ko: {
    siteTitle: "FCINSIDE",
    subTitle: "익명 커뮤니티",
    searchPlaceholder: "게시글 또는 트립코드 검색...",
    newPost: "글쓰기",
    allFeed: "전체 갤러리",
    hotFeed: "실시간 베스트 갤러리",
    general: "국내야구 갤러리",
    crypto: "VPN Gate 갤러리",
    tech: "특이점이 온다 마이너 갤러리",
    news: "미국 정치 마이너 갤러리",
    files: "컴퓨터 본체 마이너 갤러리",
    latest: "최신순",
    popular: "인기순",
    media: "미디어순",
    backToFeed: "목록으로",
    like: "개추",
    dislike: "비추",
    comments: "댓글",
    writeComment: "댓글을 작성하세요...",
    submitComment: "댓글 등록",
    posting: "등록 중...",
    attachments: "첨부파일",
    directDownload: "다운로드",
    expandImage: "이미지 확대",
    noPosts: "게시물이 없습니다",
    noPostsDesc: "조건에 맞는 게시물이 없습니다. 첫 번째 글을 작성해보세요!",
    createFirstPost: "+ 첫 글 작성하기",
    createTitle: "새 글 작성",
    selectCategory: "갤러리 선택",
    postTitle: "제목",
    postTitlePlaceholder: "제목을 입력하세요...",
    postContent: "본문 내용 (마크다운 지원)",
    editor: "에디터",
    preview: "미리보기",
    uploadArea: "파일을 여기에 끌어다 놓거나 클릭하세요",
    uploadDesc: "이미지, 동영상, 소스코드, 압축파일 지원",
    publish: "게시글 등록",
    publishing: "등록 중...",
  },
  en: {
    siteTitle: "FCINSIDE",
    subTitle: "ANONYMOUS NODE",
    searchPlaceholder: "Search posts or tripcodes...",
    newPost: "New Post",
    allFeed: "All Feed",
    hotFeed: "Hot 🔥",
    general: "General",
    crypto: "Crypto / ZK",
    tech: "Tech / Dev",
    news: "News / Politics",
    files: "File Vault",
    latest: "Latest",
    popular: "Popular",
    media: "Media",
    backToFeed: "Back to Feed",
    like: "Like",
    dislike: "Dislike",
    comments: "Comments",
    writeComment: "Write your comment...",
    submitComment: "Submit Comment",
    posting: "Posting...",
    attachments: "Attachments",
    directDownload: "Download",
    expandImage: "Expand Image",
    noPosts: "No Posts Found",
    noPostsDesc: "No anonymous posts match your current filter. Be the first to create one!",
    createFirstPost: "+ Create First Post",
    createTitle: "Create New Post",
    selectCategory: "Select Gallery",
    postTitle: "Post Title",
    postTitlePlaceholder: "Write a clear, descriptive title...",
    postContent: "Post Content (Markdown Supported)",
    editor: "Editor",
    preview: "Live Preview",
    uploadArea: "Drag & drop files here, or click to browse",
    uploadDesc: "Supports Images, Videos, Code files, Archives",
    publish: "Publish Post",
    publishing: "Publishing...",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>("ko");

  useEffect(() => {
    const saved = localStorage.getItem("fcinside_lang") as Language;
    if (saved === "ko" || saved === "en") {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("fcinside_lang", l);
  };

  const toggleLang = () => {
    setLang(lang === "ko" ? "en" : "ko");
  };

  const t = (key: string): string => {
    return translations[lang][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
