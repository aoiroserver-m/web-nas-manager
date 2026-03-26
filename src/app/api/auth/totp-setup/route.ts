import { NextResponse } from "next/server";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import QRCode from "qrcode";

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

/**
 * GET /api/auth/totp-setup
 * TOTP_SECRET が未設定なら新しいシークレットを生成して返す。
 * 設定済みなら Authenticator 用 QR コードを返す。
 */
export async function GET() {
  const secret = process.env.TOTP_SECRET;

  if (!secret) {
    const newSecret = await new TOTP({ crypto, base32 }).generateSecret() as string;
    return NextResponse.json({
      setup: false,
      message: "TOTP_SECRET が未設定です。以下の値を .env に追加してください。",
      TOTP_SECRET: newSecret,
    });
  }

  const issuer = process.env.TOTP_ISSUER || "NAS Manager";
  const account = process.env.TOTP_ACCOUNT || "admin";
  const totp = new TOTP({ crypto, base32, secret, label: account, issuer });
  const otpauth = await totp.toURI() as string;
  const qr = await QRCode.toDataURL(otpauth);

  return NextResponse.json({ setup: true, qr, otpauth, issuer, account });
}
