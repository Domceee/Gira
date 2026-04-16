import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const search = request.nextUrl.search || "";

  const apiPaths = new Set(["sprints", "tasks", "projects", "news", "user", "invitations", "health"]);
  const pathPrefix = path[0] || "";
  const baseUrl = apiPaths.has(pathPrefix) ? `${API_URL}/api` : API_URL;
  const targetUrl = `${baseUrl}/${targetPath}${search}`;
  const cookieHeader = request.headers.get("cookie") || "";

  const headers = new Headers(request.headers);
  headers.delete("host");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export { handleProxy as GET };
export { handleProxy as POST };
export { handleProxy as PUT };
export { handleProxy as PATCH };
export { handleProxy as DELETE };
