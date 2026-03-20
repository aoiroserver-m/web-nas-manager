"use client";

import { useEffect, useState, useRef } from "react";

interface GpsPhoto {
  name: string;
  path: string;
  latitude: number;
  longitude: number;
  takenAt?: string;
  thumbnailUrl: string;
}

interface PhotoMapViewProps {
  currentPath: string;
  onPhotoClick?: (photo: GpsPhoto) => void;
}

/**
 * Photo Map View - フォルダ内のGPS付き写真を地図上にピン表示。
 * Leafletを遅延ロードしてバンドルサイズを抑える。
 * 将来的にPhoto-mapモジュールとして分離可能な設計。
 */
export default function PhotoMapView({ currentPath, onPhotoClick }: PhotoMapViewProps) {
  const [photos, setPhotos] = useState<GpsPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  // GPS付き写真をスキャン
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/files/gps-scan?path=${encodeURIComponent(currentPath)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to scan");
        return res.json();
      })
      .then((data) => setPhotos(data.photos || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentPath]);

  // Leafletで地図を描画
  useEffect(() => {
    if (loading || photos.length === 0 || !mapContainerRef.current) return;

    // 既存のマップを破棄
    if (mapInstanceRef.current) {
      (mapInstanceRef.current as { remove: () => void }).remove();
      mapInstanceRef.current = null;
    }

    let cancelled = false;

    const initMap = async () => {
      const L = await import("leaflet");
      // leaflet.markerclusterはwindow.Lを副作用で拡張するUMDモジュール。
      // Next.js ESMバンドル環境ではdynamic importしたLインスタンスに直接アタッチされないため
      // window.Lを使ってmarkerClusterGroupにアクセスする。
      await import("leaflet.markercluster");

      // Leaflet + MarkerCluster CSSを動的挿入
      const cssUrls = [
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
      ];
      for (const url of cssUrls) {
        if (!document.querySelector(`link[href="${url}"]`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = url;
          document.head.appendChild(link);
        }
      }

      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // markerClusterGroupはleaflet.markerclusterがwindow.Lに注入する。
      // dynamic importしたLインスタンスではなくwindow.Lから取得する。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LWithCluster = (typeof window !== "undefined" ? (window as any).L : null) ?? L;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasClusterGroup = typeof (LWithCluster as any).markerClusterGroup === "function";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clusterGroup = hasClusterGroup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (LWithCluster as any).markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
          })
        // markerClusterGroupが使えない場合はfeatureGroupにフォールバック
        : L.featureGroup();

      const bounds = L.latLngBounds([]);

      for (const photo of photos) {
        const latLng = L.latLng(photo.latitude, photo.longitude);
        bounds.extend(latLng);

        // カスタムアイコン（サムネイル付き）
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);overflow:hidden;background:#1a1a2e">
            <img src="${photo.thumbnailUrl}" style="width:100%;height:100%;object-fit:cover" loading="lazy" />
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker(latLng, { icon });

        // ポップアップ
        const popupContent = `
          <div style="text-align:center;min-width:180px">
            <img src="${photo.thumbnailUrl}" style="width:180px;height:120px;object-fit:cover;border-radius:6px;cursor:pointer" data-photo-path="${photo.path}" />
            <div style="margin-top:6px;font-size:12px;font-weight:600">${photo.name}</div>
            ${photo.takenAt ? `<div style="font-size:11px;color:#888">${new Date(photo.takenAt).toLocaleDateString("ja-JP")}</div>` : ""}
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 220 });

        // ポップアップ内の画像クリックでプレビューを開く
        marker.on("popupopen", () => {
          const popup = marker.getPopup();
          if (!popup) return;
          const el = popup.getElement();
          if (!el) return;
          const img = el.querySelector("img[data-photo-path]") as HTMLImageElement;
          if (img && onPhotoClick) {
            img.addEventListener("click", () => onPhotoClick(photo));
          }
        });

        clusterGroup.addLayer(marker);
      }

      map.addLayer(clusterGroup);

      // 全マーカーが見える範囲にフィット
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else {
        // デフォルト: 東京
        map.setView([35.6812, 139.7671], 10);
      }

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
  }, [loading, photos, onPhotoClick]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-text-secondary">Scanning for GPS photos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-6 py-4 text-center">
          <p className="font-medium text-danger">Error</p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-text-secondary/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <p className="mt-2 text-sm text-text-secondary">No GPS-tagged photos found</p>
          <p className="mt-1 text-xs text-text-secondary/60">Photos with location data will appear on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* マップ情報バー */}
      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2">
        <span className="text-xs text-text-secondary">
          {photos.length} photo{photos.length !== 1 ? "s" : ""} with GPS data
        </span>
      </div>
      {/* マップコンテナ */}
      <div ref={mapContainerRef} className="flex-1" />
    </div>
  );
}
