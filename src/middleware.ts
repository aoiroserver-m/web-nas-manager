import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "nas-session";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || process.env.ACCESS_PASSCODE || "fallback-secret";
  return new TextEncoder().encode(s);
}

/** パスコードが設定されているか（未設定なら保護しない） */
function isPasscodeEnabled(): boolean {
  return !!process.env.ACCESS_PASSCODE;
}

/** 認証不要のパス */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // パスコード未設定 or 認証不要パスはそのまま通す
  if (!isPasscodeEnabled() || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Cookie のセッション検証
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
      return NextResponse.next();
    } catch {
      // 無効 or 期限切れ → fall through
    }
  }

  // 未認証
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "認証が必要です" },
      { status: 401 }
    );
  }

  // ページリクエスト → ホームにリダイレクト
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
