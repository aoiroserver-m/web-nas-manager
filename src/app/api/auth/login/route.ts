import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createToken, setAuthCookie } from "@/lib/auth";

// ブルートフォース対策: IPごとの失敗カウンター
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 1000; // 30 seconds

/**
 * POST /api/auth/login
 * Authenticates user and sets JWT cookie.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  // レート制限チェック
  const attempts = failedAttempts.get(ip);
  if (attempts && attempts.count >= MAX_ATTEMPTS) {
    const elapsed = Date.now() - attempts.lastAttempt;
    if (elapsed < LOCKOUT_DURATION) {
      return NextResponse.json(
        { error: "TOO_MANY_ATTEMPTS", message: "Too many login attempts. Please wait." },
        { status: 429 }
      );
    }
    // ロックアウト期間経過後はリセット
    failedAttempts.delete(ip);
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Username and password are required" },
        { status: 400 }
      );
    }

    const isValid = await verifyCredentials(username, password);

    if (!isValid) {
      // 失敗カウンターを更新
      const current = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
      failedAttempts.set(ip, {
        count: current.count + 1,
        lastAttempt: Date.now(),
      });

      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // 成功時はカウンターをリセット
    failedAttempts.delete(ip);

    const token = await createToken(username);
    await setAuthCookie(token);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Login failed" },
      { status: 500 }
    );
  }
}
