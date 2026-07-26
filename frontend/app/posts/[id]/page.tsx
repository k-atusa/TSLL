import PostDetailClient from "./PostDetailClient";

export async function generateStaticParams() {
  // Static export fallback placeholder for dynamic post detail view
  return [{ id: "preview" }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  return <PostDetailClient params={params} />;
}
