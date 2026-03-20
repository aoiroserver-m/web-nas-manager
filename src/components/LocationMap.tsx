"use client";

import { useEffect, useRef } from "react";
import type { GpsInfo } from "@/types/metadata";

interface LocationMapProps {
  gps: GpsInfo;
}

/**
 * Leafletを遅延ロードして地図を表示するコンポーネント。
 * バンドルサイズ削減のためdynamic importを使用。
 */
export default function LocationMap({ gps }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const L = await import("leaflet");

      // Leaflet CSSを動的に挿入
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([gps.latitude, gps.longitude], 15);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // カスタムマーカー（Leafletデフォルトアイコンの問題を回避）
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:24px;height:24px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([gps.latitude, gps.longitude], { icon }).addTo(map);

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [gps.latitude, gps.longitude]);

  const mapsUrl = `https://maps.apple.com/?q=${gps.latitude},${gps.longitude}`;

  return (
    <div className="space-y-2">
      <div
        ref={mapContainerRef}
        className="h-40 w-full overflow-hidden rounded-lg bg-surface-hover"
      />
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        Open in Maps
      </a>
    </div>
  );
}
