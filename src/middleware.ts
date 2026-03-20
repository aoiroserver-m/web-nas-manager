import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "web-nas-token";

// 認証不要なパス
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
];

// 常に許可するパスのプレフィックス
const ALWAYS_ALLOWED_PREFIXES = [
  "/_next/",
  "/favicon.ico",
  "/manifest.json",
  "/icons/",
  "/sw.js",
];

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // JWT_SECRETが未設定の場合は認証をスキップ（開発用）
    return new Uint8Array(0);
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証不要なパスはそのまま通す
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 静的アセットは常に許可
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // JWT_SECRETが未設定の場合は認証をスキップ
  if (!process.env.JWT_SECRET) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return handleUnauthorized(request);
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    return handleUnauthorized(request);
  }
}

function handleUnauthorized(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // APIリクエストには401を返す
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      { status: 401 }
    );
  }

  // ページリクエストはログインページにリダイレクト
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // 全ルートに適用（_nextの静的ファイルは除外）
    "/((?!_next/static|_next/image).*)",
  ],
};
