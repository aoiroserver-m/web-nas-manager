import { SignJWT, jwtVerify } from "jose";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

const COOKIE_NAME = "web-nas-token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Get the JWT secret as Uint8Array.
 */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a signed JWT token for the given username.
 */
export async function createToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(getSecret());
}

/**
 * Verify a JWT token and return the payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(
  token: string
): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { username: string };
  } catch {
    return null;
  }
}

/**
 * Verify credentials against environment variables.
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const expectedUsername = process.env.AUTH_USERNAME;
  const passwordHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedUsername || !passwordHash) {
    console.error("AUTH_USERNAME or AUTH_PASSWORD_HASH not configured");
    return false;
  }

  if (username !== expectedUsername) {
    return false;
  }

  return compare(password, passwordHash);
}

/**
 * Set the auth token cookie.
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false, // LAN内はHTTPアクセスのため無効
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

/**
 * Remove the auth token cookie.
 */
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the auth token from cookies.
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export { COOKIE_NAME };
