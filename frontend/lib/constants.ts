import { BoardCategory } from "./types";

export interface GalleryInfo {
  id: BoardCategory;
  name: string;
  shortName: string;
  icon: string;
  desc: string;
}

export const GALLERIES: GalleryInfo[] = [
  { id: "all", name: "전체 갤러리", shortName: "전체", icon: "🌐", desc: "전체 게시글" },
  { id: "hot", name: "실시간 베스트 갤러리", shortName: "실베", icon: "🔥", desc: "개추 10개 이상 인기글" },
  { id: "general", name: "국내야구 갤러리", shortName: "야갤", icon: "⚾", desc: "자유 수다 게시판" },
  { id: "crypto", name: "VPN Gate 갤러리", shortName: "VPN", icon: "🔒", desc: "보안 및 개인정보" },
  { id: "tech", name: "특이점이 온다 마이너 갤러리", shortName: "특갤", icon: "💻", desc: "AI 및 첨단 기술" },
  { id: "news", name: "미국 정치 마이너 갤러리", shortName: "미정갤", icon: "🏛️", desc: "시사 및 정치 이슈" },
  { id: "files", name: "컴퓨터 본체 마이너 갤러리", shortName: "컴갤", icon: "🖥️", desc: "파일 자료실 및 장비" },
];

export function getGalleryName(id: BoardCategory): string {
  const g = GALLERIES.find((item) => item.id === id);
  return g ? g.name : "전체 갤러리";
}
