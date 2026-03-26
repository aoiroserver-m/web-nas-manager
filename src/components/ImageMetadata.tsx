"use client";

import { useEffect, useState, useRef } from "react";
import type { ImageMetadata as ImageMetadataType } from "@/types/metadata";
import LocationMap from "./LocationMap";

interface ImageMetadataProps {
  imagePath: string;
  isOpen: boolean;
}

export default function ImageMetadataPanel({
  imagePath,
  isOpen,
}: ImageMetadataProps) {
  const [metadata, setMetadata] = useState<ImageMetadataType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !imagePath) return;

    setLoading(true);
    fetch(`/api/files/metadata?path=${encodeURIComponent(imagePath)}`)
      .then((res) => res.json())
      .then((data) => setMetadata(data.metadata))
      .catch(() => setMetadata(null))
      .finally(() => setLoading(false));
  }, [isOpen, imagePath]);

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-white/10 bg-[#1a1a2e]">
      {/* ヘッダー */}
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Info
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          </div>
        )}

        {!loading && !metadata && (
          <p className="px-4 py-6 text-center text-xs text-white/40">
            No metadata available
          </p>
        )}

        {!loading && metadata && (
          <div className="space-y-0">
            {/* カメラ情報カード */}
            {(metadata.camera || metadata.lens || metadata.dimensions) && (
              <div className="border-b border-white/10 px-4 py-3">
                <div className="rounded-lg bg-white/5 px-3 py-2.5">
                  {metadata.camera ? (
                    <div className="flex items-center gap-3">
                      <CameraIcon make={metadata.camera.make} model={metadata.camera.model} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/90 leading-tight">
                          {metadata.camera.model || metadata.camera.make || "不明"}
                        </p>
                        {metadata.camera.make && metadata.camera.model && (
                          <p className="text-xs text-white/40">{metadata.camera.make}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CameraIcon make={undefined} />
                      <p className="text-sm font-medium text-white/50">不明</p>
                    </div>
                  )}
                  {metadata.lens && (
                    <p className="mt-1.5 text-xs text-white/50">
                      {metadata.lens}
                    </p>
                  )}
                  {metadata.dimensions && (
                    <p className="mt-0.5 text-xs text-white/40">
                      {metadata.dimensions.width} × {metadata.dimensions.height} px
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 撮影設定テーブル */}
            {metadata.settings && (
              <div className="border-b border-white/10 px-4 py-3">
                <table className="w-full">
                  <tbody className="text-xs">
                    {metadata.settings.focalLength && (
                      <SettingRow label="Focal Length" value={`${metadata.settings.focalLength} mm`} />
                    )}
                    {metadata.settings.shutterSpeed && (
                      <SettingRow label="Shutter Speed" value={metadata.settings.shutterSpeed} />
                    )}
                    {metadata.settings.aperture && (
                      <SettingRow label="Aperture" value={`f / ${metadata.settings.aperture}`} />
                    )}
                    {metadata.settings.iso && (
                      <SettingRow label="ISO" value={String(metadata.settings.iso)} />
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ファイル情報 */}
            <div className="border-b border-white/10 px-4 py-3 space-y-2.5">
              {/* ファイル名 */}
              <InfoRow
                label="Filename"
                value={imagePath.split("/").pop() || ""}
              />

              {/* 撮影日時 */}
              {metadata.datetime && (
                <InfoRow
                  label="Date"
                  value={new Date(metadata.datetime).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                />
              )}
            </div>

            {/* GPS + 地図 */}
            {metadata.gps && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-white/40">Location</p>
                <p className="text-xs text-white/70">
                  {metadata.gps.latitude.toFixed(6)}, {metadata.gps.longitude.toFixed(6)}
                </p>
                <LocationMap gps={metadata.gps} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 pr-3 text-white/40">{label}</td>
      <td className="py-1 text-right text-white/80">{value}</td>
    </tr>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-sm text-white/80">{value}</p>
    </div>
  );
}

const BRAND_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  canon:     { bg: "bg-red-700",    text: "text-white", label: "C" },
  nikon:     { bg: "bg-yellow-500", text: "text-black", label: "N" },
  sony:      { bg: "bg-zinc-800",   text: "text-white", label: "S" },
  fujifilm:  { bg: "bg-green-700",  text: "text-white", label: "F" },
  olympus:   { bg: "bg-blue-700",   text: "text-white", label: "O" },
  panasonic: { bg: "bg-blue-900",   text: "text-white", label: "P" },
  leica:     { bg: "bg-red-600",    text: "text-white", label: "L" },
  pentax:    { bg: "bg-indigo-700", text: "text-white", label: "P" },
  ricoh:     { bg: "bg-gray-700",   text: "text-white", label: "R" },
  hasselblad:{ bg: "bg-orange-600", text: "text-white", label: "H" },
  apple:     { bg: "bg-gray-500",   text: "text-white", label: "A" },
  dji:       { bg: "bg-gray-900",   text: "text-white", label: "D" },
  gopro:     { bg: "bg-blue-500",   text: "text-white", label: "G" },
};

function CameraIcon({ make, model }: { make: string | undefined; model?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!make && !model) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch(`/api/camera-image?make=${encodeURIComponent(make ?? "")}&model=${encodeURIComponent(model ?? "")}`)
      .then(r => r.json())
      .then((d: { url: string | null }) => { if (d.url) setImgUrl(d.url); })
      .catch(() => {});
  }, [make, model]);

  // Wikipedia画像が取得できた場合
  if (imgUrl && !imgError) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5 flex items-center justify-center p-1">
        <img
          src={imgUrl}
          alt={model ?? make ?? "camera"}
          className="max-h-full max-w-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // フォールバック: ブランドカラーアイコン
  const key = make?.toLowerCase().split(" ")[0] ?? "";
  const brand = BRAND_COLORS[key];

  if (brand) {
    return (
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${brand.bg} ${brand.text} font-bold text-lg shadow`}>
        {brand.label}
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
      <svg className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    </div>
  );
}
