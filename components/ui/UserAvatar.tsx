'use client';

import React, { useState } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface UserAvatarProps {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  ringClassName?: string;
  showStatus?: boolean;
  status?: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY' | 'ON_CALL' | 'IN_CONSULTATION' | 'online' | 'offline' | (string & {});
  pulseOnCritical?: boolean;
}

const SIZE_MAP: Record<AvatarSize, {
  container: string;
  inner: string;
  text: string;
  dot: string;
  padding: string;
}> = {
  xs: {
    container: 'w-6 h-6',
    inner: 'w-5 h-5',
    text: 'text-[10px]',
    dot: 'w-1.5 h-1.5',
    padding: 'p-[1.5px]',
  },
  sm: {
    container: 'w-8 h-8',
    inner: 'w-7 h-7',
    text: 'text-xs',
    dot: 'w-2 h-2',
    padding: 'p-[2px]',
  },
  md: {
    container: 'w-9 h-9',
    inner: 'w-8 h-8',
    text: 'text-xs',
    dot: 'w-2.5 h-2.5',
    padding: 'p-[2px]',
  },
  lg: {
    container: 'w-11 h-11',
    inner: 'w-9.5 h-9.5',
    text: 'text-sm',
    dot: 'w-3 h-3',
    padding: 'p-[2.5px]',
  },
  xl: {
    container: 'w-14 h-14',
    inner: 'w-12 h-12',
    text: 'text-lg',
    dot: 'w-3.5 h-3.5',
    padding: 'p-[3px]',
  },
  '2xl': {
    container: 'w-16 h-16',
    inner: 'w-14 h-14',
    text: 'text-xl',
    dot: 'w-4 h-4',
    padding: 'p-[3.5px]',
  },
};

const PALETTES = [
  // 0: Vibrant Sunset Orange / Coral (matches the user's sample!)
  {
    bg: 'from-orange-500 via-amber-500 to-rose-500',
    ring: 'ring-orange-200/80 dark:ring-orange-950/60',
    outerBg: 'bg-orange-100/70 dark:bg-orange-950/50',
    border: 'border-orange-200/60 dark:border-orange-800/40',
  },
  // 1: Emerald & Mint
  {
    bg: 'from-emerald-500 via-teal-500 to-cyan-600',
    ring: 'ring-emerald-200/80 dark:ring-emerald-950/60',
    outerBg: 'bg-emerald-100/70 dark:bg-emerald-950/50',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
  },
  // 2: Royal Indigo & Violet
  {
    bg: 'from-indigo-600 via-violet-600 to-purple-600',
    ring: 'ring-indigo-200/80 dark:ring-indigo-950/60',
    outerBg: 'bg-indigo-100/70 dark:bg-indigo-950/50',
    border: 'border-indigo-200/60 dark:border-indigo-800/40',
  },
  // 3: Electric Ocean / Sky
  {
    bg: 'from-blue-600 via-sky-500 to-cyan-500',
    ring: 'ring-sky-200/80 dark:ring-sky-950/60',
    outerBg: 'bg-sky-100/70 dark:bg-sky-950/50',
    border: 'border-sky-200/60 dark:border-sky-800/40',
  },
  // 4: Rose & Crimson
  {
    bg: 'from-rose-500 via-pink-600 to-red-500',
    ring: 'ring-rose-200/80 dark:ring-rose-950/60',
    outerBg: 'bg-rose-100/70 dark:bg-rose-950/50',
    border: 'border-rose-200/60 dark:border-rose-800/40',
  },
  // 5: Warm Coral & Persimmon
  {
    bg: 'from-red-500 via-orange-500 to-amber-500',
    ring: 'ring-amber-200/80 dark:ring-amber-950/60',
    outerBg: 'bg-amber-100/70 dark:bg-amber-950/50',
    border: 'border-amber-200/60 dark:border-amber-800/40',
  },
  // 6: Deep Purple & Fuchsia
  {
    bg: 'from-purple-600 via-fuchsia-600 to-pink-500',
    ring: 'ring-purple-200/80 dark:ring-purple-950/60',
    outerBg: 'bg-purple-100/70 dark:bg-purple-950/50',
    border: 'border-purple-200/60 dark:border-purple-800/40',
  },
  // 7: Forest & Mint Teal
  {
    bg: 'from-teal-600 via-emerald-600 to-green-500',
    ring: 'ring-teal-200/80 dark:ring-teal-950/60',
    outerBg: 'bg-teal-100/70 dark:bg-teal-950/50',
    border: 'border-teal-200/60 dark:border-teal-800/40',
  },
  // 8: Golden Honey & Bronze
  {
    bg: 'from-amber-500 via-yellow-500 to-orange-500',
    ring: 'ring-amber-200/80 dark:ring-amber-950/60',
    outerBg: 'bg-amber-100/70 dark:bg-amber-950/50',
    border: 'border-amber-200/60 dark:border-amber-800/40',
  },
  // 9: Sapphire & Cobalt
  {
    bg: 'from-cyan-600 via-blue-600 to-indigo-700',
    ring: 'ring-blue-200/80 dark:ring-blue-950/60',
    outerBg: 'bg-blue-100/70 dark:bg-blue-950/50',
    border: 'border-blue-200/60 dark:border-blue-800/40',
  },
];

export function UserAvatar({
  name = 'User',
  src,
  size = 'md',
  className = '',
  ringClassName = '',
  showStatus = false,
  status = 'AVAILABLE',
  pulseOnCritical = false,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Extract clean initial: strip prefixes like Dr., Nurse, Mr., etc.
  const cleanName = (name || 'User')
    .replace(/^(Dr\.|Doctor|Nurse|Mr\.|Mrs\.|Ms\.)\s+/i, '')
    .trim();
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : 'U';

  // Deterministic palette based on the name, with special fondness for Orange if starting with 'Y'
  let paletteIndex = 0;
  if (initial === 'Y') {
    paletteIndex = 0; // Beautiful vibrant Sunset Orange
  } else {
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    paletteIndex = Math.abs(hash) % PALETTES.length;
  }
  const palette = PALETTES[paletteIndex];

  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  // Check if image src is valid (not a broken demo path and not null)
  const isValidUrl =
    Boolean(src) &&
    typeof src === 'string' &&
    src.trim() !== '' &&
    !src.startsWith('demo/') &&
    (src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('data:image/') ||
      src.startsWith('/'));

  const renderImage = isValidUrl && !imageError;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${sizeConfig.container} ${sizeConfig.padding} ${palette.outerBg} ring-1 ring-slate-200/70 dark:ring-slate-700/60 shadow-2xs ${className}`}
      title={name}
    >
      {renderImage ? (
        <img
          src={src!}
          alt={name}
          onError={() => setImageError(true)}
          className={`w-full h-full rounded-full object-cover shadow-inner ${ringClassName}`}
        />
      ) : (
        /* Elevated Modern Initial Avatar */
        <div
          className={`relative w-full h-full rounded-full flex items-center justify-center font-black text-white bg-gradient-to-tr ${palette.bg} shadow-xs overflow-hidden ${ringClassName}`}
        >
          {/* Subtle top specular sheen overlay for 3D depth */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none" />

          {/* Clean bold centered letter */}
          <span
            className={`relative z-10 ${sizeConfig.text} font-black tracking-tight leading-none drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.35)]`}
          >
            {initial}
          </span>
        </div>
      )}

      {/* Optional Status Indicator */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${sizeConfig.dot} rounded-full border-2 border-white dark:border-slate-900 shadow-2xs ${
            status === 'AVAILABLE' || status === 'online'
              ? 'bg-emerald-500'
              : status === 'BUSY' || status === 'IN_CONSULTATION'
              ? 'bg-amber-500'
              : 'bg-slate-400'
          }`}
        />
      )}

      {/* Critical pulse beacon if requested */}
      {pulseOnCritical && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 animate-ping pointer-events-none" />
      )}
    </div>
  );
}
