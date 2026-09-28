'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Settings,
  Plus,
  Headphones,
  Feather,
  Database,
  CloudUpload,
  ExternalLink
} from 'lucide-react';

export interface NavbarProps {
  onOpenImport?: () => void;
}

export function Navbar({ onOpenImport }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-stone-200/80 dark:border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Feather className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              审稿大师
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                作家专版
              </span>
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>新建 / 导入作品</span>
            </button>
          )}

          <Link
            href="/settings"
            className={`p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition ${
              pathname === '/settings' ? 'bg-stone-100 dark:bg-stone-800 text-amber-600' : ''
            }`}
            title="系统设置 (语音模型 / Cloudflare R2 / 数据库)"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
