import { NextResponse } from "next/server";

// 認証なし：すべてのリクエストをそのまま通す
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image).*)",
  ],
};
