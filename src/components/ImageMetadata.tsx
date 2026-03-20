"use client";

import { useEffect, useState } from "react";
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
            {(metadata.camera || metadata.lens) && (
              <div className="border-b border-white/10 px-4 py-3">
                <div className="rounded-lg bg-white/5 px-3 py-2.5">
                  {metadata.camera && (
                    <p className="text-sm font-medium text-white/90">
                      {[metadata.camera.make, metadata.camera.model].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {metadata.lens && (
                    <p className="mt-0.5 text-xs text-white/50">
                      {metadata.lens}
                    </p>
                  )}
                  {metadata.dimensions && (
                    <p className="mt-0.5 text-xs text-white/50">
                      {metadata.dimensions.width} x {metadata.dimensions.height}
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
