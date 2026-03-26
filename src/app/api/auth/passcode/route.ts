import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret, verify } from "otplib";

const SESSION_COOKIE = "nas-session";
const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || process.env.TOTP_SECRET || "fallback-secret";
  return new TextEncoder().encode(s);
}

function getSessionDurationMs(): number {
  const hours = parseInt(process.env.SESSION_DURATION_HOURS || "24", 10);
  return hours * 60 * 60 * 1000;
}

function isTotpEnabled(): boolean {
  return !!process.env.TOTP_SECRET;
}

/** セッションが有効かどうか確認する */
export async function GET(request: NextRequest) {
  if (!isTotpEnabled()) {
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

/** TOTPコードを検証してセッション Cookie をセット */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!isTotpEnabled()) {
      return NextResponse.json({ success: true });
    }

    const secret = process.env.TOTP_SECRET!;
    const token = String(code).replace(/\s/g, "");
    const result = await verify({ token, secret, crypto, base32 });

    if (!result.valid) {
      return NextResponse.json(
        { error: "INVALID_CODE", message: "コードが違います" },
        { status: 401 }
      );
    }

    const expiresAt = new Date(Date.now() + getSessionDurationMs());
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(getSecret());

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE, jwt, {
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
