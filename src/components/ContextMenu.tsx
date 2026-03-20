"use client";

import { useEffect, useRef } from "react";

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  position: { x: number; y: number };
}

export default function ContextMenu({ isOpen, onClose, items, position }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 画面端にはみ出さないよう調整
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(position.y, window.innerHeight - items.length * 44 - 16),
    left: Math.min(position.x, window.innerWidth - 200),
    zIndex: 60,
  };

  return (
    <div ref={menuRef} style={style} className="w-48 rounded-xl border border-border bg-surface shadow-xl">
      <div className="py-1">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-surface-hover ${
              item.danger ? "text-danger" : "text-text"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
