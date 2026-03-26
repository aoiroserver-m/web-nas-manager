import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "nas-session";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || process.env.ACCESS_PASSCODE || "fallback-secret";
  return new TextEncoder().encode(s);
}

function getSessionDurationMs(): number {
  const hours = parseInt(process.env.SESSION_DURATION_HOURS || "24", 10);
  return hours * 60 * 60 * 1000;
}

/** セッションが有効かどうか確認する */
export async function GET(request: NextRequest) {
  // パスコード未設定 → 保護なし（常に有効扱い）
  if (!process.env.ACCESS_PASSCODE) {
    return NextResponse.json({ valid: true });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ valid: false });

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false });
  }
}

/** パスコードを検証してセッション Cookie をセットする */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const expected = process.env.ACCESS_PASSCODE;

    if (!expected) {
      // パスコード未設定 → そのまま通す
      return NextResponse.json({ success: true });
    }

    if (code !== expected) {
      return NextResponse.json(
        { error: "INVALID_CODE", message: "パスコードが違います" },
        { status: 401 }
      );
    }

    const expiresAt = new Date(Date.now() + getSessionDurationMs());
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(getSecret());

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
}
