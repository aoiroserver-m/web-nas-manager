import { NextResponse } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";

/**
 * GET /api/auth/session
 * Returns the current session status.
 */
export async function GET() {
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    username: payload.username,
  });
}
