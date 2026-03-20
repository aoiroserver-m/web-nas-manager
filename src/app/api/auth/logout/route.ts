import { NextResponse } from "next/server";
import { removeAuthCookie } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
export async function POST() {
  await removeAuthCookie();
  return NextResponse.json({ success: true });
}
