import { GalleryInfo } from "./types";

// Static built-in categories that always appear at the top of the gallery list.
// Actual user galleries are loaded dynamically from /api/com/galleries.
export const STATIC_GALLERIES: GalleryInfo[] = [
  { id: "all", name: "전체 글", shortName: "전체", icon: "🌐" },
  { id: "hot", name: "실시간 베스트 갤러리", shortName: "실베", icon: "🔥" },
];

export function getGalleryName(id: string, galleries: GalleryInfo[]): string {
  const all = [...STATIC_GALLERIES, ...galleries];
  const g = all.find((item) => item.id === id);
  return g ? g.name : id;
}
