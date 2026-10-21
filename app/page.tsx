'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { CareFlowProvider } from '@/lib/store';

const CareFlowApp = dynamic(
  () => import('@/components/CareFlowApp').then((mod) => mod.CareFlowApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-[#091D16] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-black animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-semibold tracking-wider text-emerald-300/80 uppercase font-mono">
            Loading CareFlow AI...
          </span>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  return (
    <CareFlowProvider>
      <CareFlowApp />
    </CareFlowProvider>
  );
}
