'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sun, Moon, GripVertical, Sparkles } from 'lucide-react';
import { useCareFlow } from '@/lib/store';

interface DayNightDraggerProps {
  className?: string;
  showLabels?: boolean;
}

export function DayNightDragger({ className = '', showLabels = true }: DayNightDraggerProps) {
  const { theme, setTheme } = useCareFlow();
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const startPointerX = useRef(0);
  const startDragOffset = useRef(0);
  const hasMoved = useRef(false);

  const isNight = theme === 'night';

  // Calculate track limits
  const getTravelLimits = useCallback(() => {
    if (!trackRef.current || !knobRef.current) return { maxTravel: 76, padding: 3 };
    const trackWidth = trackRef.current.offsetWidth;
    const knobWidth = knobRef.current.offsetWidth;
    const padding = 3;
    const maxTravel = Math.max(0, trackWidth - knobWidth - padding * 2);
    return { maxTravel, padding };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const { maxTravel } = getTravelLimits();
    const currentOffset = isNight ? maxTravel : 0;
    
    startPointerX.current = e.clientX;
    startDragOffset.current = currentOffset;
    hasMoved.current = false;
    setIsDragging(true);
    setDragX(currentOffset);

    // Capture pointer to track smoothly outside bounds
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startPointerX.current;
    if (Math.abs(deltaX) > 3) {
      hasMoved.current = true;
    }
    const { maxTravel } = getTravelLimits();
    const newOffset = Math.min(Math.max(0, startDragOffset.current + deltaX), maxTravel);
    setDragX(newOffset);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const { maxTravel } = getTravelLimits();

    if (!hasMoved.current) {
      // User tapped or clicked without dragging -> toggle theme
      const nextTheme = isNight ? 'day' : 'night';
      setTheme(nextTheme);
      setDragX(null);
      return;
    }

    // Determine target based on release threshold (50%)
    const currentPos = dragX ?? (isNight ? maxTravel : 0);
    const threshold = maxTravel * 0.5;

    if (currentPos >= threshold) {
      setTheme('night');
    } else {
      setTheme('day');
    }

    setDragX(null);
  };

  // Direct click on track sides
  const handleTrackClick = (targetTheme: 'day' | 'night') => {
    if (isDragging) return;
    setTheme(targetTheme);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setTheme('day');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setTheme('night');
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setTheme(isNight ? 'day' : 'night');
    }
  };

  // Compute active position
  const { maxTravel, padding } = getTravelLimits();
  const currentTranslateX = dragX !== null ? dragX : (isNight ? maxTravel : 0);
  const dragRatio = maxTravel > 0 ? currentTranslateX / maxTravel : (isNight ? 1 : 0);

  return (
    <div className={`relative flex items-center select-none ${className}`}>
      {/* Draggable Track Container */}
      <div
        ref={trackRef}
        role="switch"
        aria-checked={isNight}
        aria-label="Switch between Day mode and Night mode"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`relative w-40 h-8.5 rounded-full p-[3px] flex items-center cursor-pointer transition-colors duration-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          isNight
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-700/60 shadow-indigo-950/50'
            : 'bg-gradient-to-r from-amber-100 via-sky-100 to-amber-100 border border-amber-300/80 shadow-amber-200/50'
        }`}
      >
        {/* Day Side Background Anchor */}
        <button
          type="button"
          onClick={() => handleTrackClick('day')}
          className="flex-1 flex items-center justify-center space-x-1 z-0 text-[10px] font-black tracking-wider transition-opacity duration-200"
          style={{ opacity: 1 - dragRatio * 0.75 }}
          title="Switch to Day Mode"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          {showLabels && <span className="text-amber-800 uppercase font-bold text-[10px]">DAY</span>}
        </button>

        {/* Night Side Background Anchor */}
        <button
          type="button"
          onClick={() => handleTrackClick('night')}
          className="flex-1 flex items-center justify-center space-x-1 z-0 text-[10px] font-black tracking-wider transition-opacity duration-200"
          style={{ opacity: 0.25 + dragRatio * 0.75 }}
          title="Switch to Night Mode"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {showLabels && <span className="text-indigo-200 uppercase font-bold text-[10px]">NIGHT</span>}
        </button>

        {/* The Draggable Knob */}
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translateX(${currentTranslateX}px)`,
            transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1.2), box-shadow 260ms ease',
            left: `${padding}px`,
          }}
          className={`absolute top-[3px] bottom-[3px] w-[74px] rounded-full flex items-center justify-between px-2 shadow-md touch-none ${
            isDragging ? 'cursor-grabbing scale-[1.04]' : 'cursor-grab hover:scale-[1.02]'
          } ${
            isNight
              ? 'bg-slate-900 border border-indigo-500/80 text-white shadow-indigo-900/60'
              : 'bg-white border border-amber-300 text-slate-800 shadow-slate-300/80'
          }`}
        >
          {/* Active Mode Icon */}
          <div className="flex items-center space-x-1.5 min-w-0">
            {dragRatio > 0.5 ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0 drop-shadow animate-pulse" />
                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-tight truncate">
                  Night
                </span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 drop-shadow" />
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-tight truncate">
                  Day
                </span>
              </>
            )}
          </div>

          {/* Tactile Dragger Grip Indicator */}
          <div
            className={`flex items-center text-slate-400 pl-1 shrink-0 ${
              isDragging ? 'text-emerald-500' : 'text-slate-400/80'
            }`}
            title="Drag left or right"
          >
            <GripVertical className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
