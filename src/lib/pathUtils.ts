import path from "path";
import { DATA_ROOT, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, RAW_EXTENSIONS } from "./constants";

// 正規化済みのルートパス（末尾スラッシュの有無に依存しない）
const RESOLVED_ROOT = path.resolve(DATA_ROOT);

/**
 * Validate and resolve a user-supplied path to an absolute path under DATA_ROOT.
 * Prevents path traversal attacks.
 *
 * @throws Error if the resolved path escapes DATA_ROOT.
 */
export function validatePath(requestedPath: string): string {
  // 先頭スラッシュを除去して相対パスとして扱う
  const cleaned = requestedPath.replace(/^\/+/, "");
  const resolved = path.resolve(RESOLVED_ROOT, cleaned);

  if (resolved !== RESOLVED_ROOT && !resolved.startsWith(RESOLVED_ROOT + "/")) {
    throw new Error("Access denied: path traversal detected");
  }

  return resolved;
}

/**
 * Validate that a child path is safely under a parent path.
 * Used for secondary validation after path.join with user-supplied names.
 *
 * @throws Error if childPath escapes parentPath.
 */
export function validateChildPath(parentPath: string, childName: string): string {
  const joined = path.join(parentPath, childName);
  const resolvedParent = path.resolve(parentPath);
  const resolvedChild = path.resolve(joined);

  if (!resolvedChild.startsWith(resolvedParent + "/")) {
    throw new Error("Access denied: path traversal detected");
  }

  return resolvedChild;
}

/**
 * Sanitize a user-supplied filename by extracting only the basename
 * and rejecting dangerous patterns.
 *
 * @throws Error if the filename is invalid.
 */
export function sanitizeFilename(name: string): string {
  const basename = path.basename(name);

  if (!basename || basename === "." || basename === ".." || basename.includes("/") || basename.includes("\\")) {
    throw new Error("Invalid filename");
  }

  return basename;
}

/**
 * Check if an error is a Node.js filesystem error with a code property.
 */
export function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}

/**
 * Convert an absolute filesystem path to a relative path from DATA_ROOT.
 */
export function toRelativePath(absolutePath: string): string {
  return path.relative(DATA_ROOT, absolutePath);
}

/**
 * Get file extension in lowercase (includes the dot).
 */
export function getExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * Check if a file is an image based on its extension (including RAW).
 */
export function isImageFile(filename: string): boolean {
  const ext = getExtension(filename);
  return IMAGE_EXTENSIONS.has(ext) || RAW_EXTENSIONS.has(ext);
}

/**
 * Check if a file is a RAW image based on its extension.
 */
export function isRawFile(filename: string): boolean {
  return RAW_EXTENSIONS.has(getExtension(filename));
}

/**
 * Check if a file is a video based on its extension.
 */
export function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.has(getExtension(filename));
}

/**
 * Build breadcrumb entries from a relative path.
 */
export function buildBreadcrumbs(
  relativePath: string
): { name: string; path: string }[] {
  if (!relativePath || relativePath === ".") {
    return [];
  }

  const parts = relativePath.split("/").filter(Boolean);
  const crumbs: { name: string; path: string }[] = [];

  for (let i = 0; i < parts.length; i++) {
    crumbs.push({
      name: parts[i],
      path: parts.slice(0, i + 1).join("/"),
    });
  }

  return crumbs;
}
