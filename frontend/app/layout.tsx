import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FCINSIDE - 익명 커뮤니티",
  description:
    "회원가입 없는 익명 커뮤니티, 자유로운 게시글 작성 및 파일 공유.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
