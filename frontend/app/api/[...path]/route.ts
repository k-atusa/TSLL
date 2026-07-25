import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

async function handleProxy(
  request: NextRequest,
  resolvedParams: { path: string[] }
) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const path = resolvedParams.path ? resolvedParams.path.join("/") : "";
  const search = request.nextUrl.search;
  const targetUrl = `${backendUrl}/api/${path}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  let body: ArrayBuffer | null = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const responseHeaders = new Headers(res.headers);

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    console.error(`Proxy error connecting to ${targetUrl}:`, err);
    return new NextResponse(
      JSON.stringify({ error: "Failed to connect to backend service", details: String(err) }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
