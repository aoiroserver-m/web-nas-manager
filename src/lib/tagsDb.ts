import fs from "fs/promises";
import path from "path";
import { DATA_ROOT } from "./constants";

/**
 * File tags/favorites metadata.
 */
export interface FileTagData {
  favorite?: boolean;
  tags?: string[];
  updatedAt?: string;
}

/**
 * Tags database structure.
 * キーはDATA_ROOTからの相対パス。
 */
export interface TagsDatabase {
  [filePath: string]: FileTagData;
}

// DBファイルのパス（DATA_ROOT配下に保存）
const DB_PATH = path.join(DATA_ROOT, ".web-nas-tags.json");

let cachedDb: TagsDatabase | null = null;

/**
 * Load the tags database from disk.
 */
export async function loadTagsDb(): Promise<TagsDatabase> {
  if (cachedDb) return cachedDb;

  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    cachedDb = JSON.parse(data);
    return cachedDb!;
  } catch {
    cachedDb = {};
    return cachedDb;
  }
}

/**
 * Save the tags database to disk.
 */
export async function saveTagsDb(db: TagsDatabase): Promise<void> {
  cachedDb = db;
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

/**
 * Get tags data for a specific file.
 */
export async function getFileTags(filePath: string): Promise<FileTagData> {
  const db = await loadTagsDb();
  return db[filePath] || {};
}

/**
 * Update tags data for a specific file.
 */
export async function updateFileTags(filePath: string, data: Partial<FileTagData>): Promise<FileTagData> {
  const db = await loadTagsDb();
  const existing = db[filePath] || {};
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };

  // お気に入りでもタグもない場合はエントリを削除
  if (!updated.favorite && (!updated.tags || updated.tags.length === 0)) {
    delete db[filePath];
  } else {
    db[filePath] = updated;
  }

  await saveTagsDb(db);
  return updated;
}

/**
 * Get all favorites.
 */
export async function getFavorites(): Promise<{ path: string; data: FileTagData }[]> {
  const db = await loadTagsDb();
  return Object.entries(db)
    .filter(([, data]) => data.favorite)
    .map(([filePath, data]) => ({ path: filePath, data }));
}

/**
 * Get all files with a specific tag.
 */
export async function getFilesByTag(tag: string): Promise<{ path: string; data: FileTagData }[]> {
  const db = await loadTagsDb();
  return Object.entries(db)
    .filter(([, data]) => data.tags?.includes(tag))
    .map(([filePath, data]) => ({ path: filePath, data }));
}

/**
 * Get all unique tags in the database.
 */
export async function getAllTags(): Promise<string[]> {
  const db = await loadTagsDb();
  const tagSet = new Set<string>();
  for (const data of Object.values(db)) {
    data.tags?.forEach((t) => tagSet.add(t));
  }
  return Array.from(tagSet).sort();
}
