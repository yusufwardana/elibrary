"use client";

import React from "react";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Barcode({ value, width = 200, height = 60, className }: BarcodeProps) {
  // Simple hash function to generate deterministic pseudo-random widths for bars
  const generateBars = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const bars: boolean[] = [];
    // Always start with standard quiet zone / quiet bars
    bars.push(true, false, true);
    
    // Generate about 40-60 bars deterministically
    const seed = Math.abs(hash);
    for (let i = 0; i < 45; i++) {
      const bit = ((seed >> (i % 31)) & 1) === 1;
      bars.push(bit);
      // Double the thickness randomly for realistic bar feel
      if ((seed >> ((i + 3) % 31)) & 1) {
        bars.push(bit);
      }
    }
    
    // Always end with standard ending bars
    bars.push(true, false, true, true);
    return bars;
  };

  const bars = generateBars(value || "ELIB-00000");
  const barWidth = width / bars.length;

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        <g fill="currentColor">
          {bars.map((isBlack, index) => {
            if (!isBlack) return null;
            return (
              <rect
                key={index}
                x={index * barWidth}
                y={0}
                width={barWidth + 0.1} // overlap slightly to prevent subpixel rendering gaps
                height={height}
              />
            );
          })}
        </g>
      </svg>
      <span className="font-mono text-[10px] font-semibold tracking-widest text-foreground uppercase">
        {value}
      </span>
    </div>
  );
}

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({ value, size = 100, className }: QrCodeProps) {
  // Generate a deterministic grid based on hash
  const generateGrid = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const gridDim = 21; // 21x21 grid for Version 1 QR code style
    const grid: boolean[][] = [];
    const seed = Math.abs(hash);
    
    for (let r = 0; r < gridDim; r++) {
      grid[r] = [];
      for (let c = 0; c < gridDim; c++) {
        // Finder patterns (top-left, top-right, bottom-left boxes)
        const isTopLeftFinder = r < 7 && c < 7;
        const isTopRightFinder = r < 7 && c >= gridDim - 7;
        const isBottomLeftFinder = r >= gridDim - 7 && c < 7;
        
        if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
          // Render the concentric square finder patterns
          const localR = isTopLeftFinder ? r : isTopRightFinder ? r : r - (gridDim - 7);
          const localC = isTopLeftFinder ? c : isTopRightFinder ? c - (gridDim - 7) : c;
          
          const isOuterBorder = localR === 0 || localR === 6 || localC === 0 || localC === 6;
          const isInnerSquare = localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4;
          
          grid[r][c] = isOuterBorder || isInnerSquare;
        } else {
          // Determinstic filler dots
          const pixelIndex = r * gridDim + c;
          grid[r][c] = ((seed >> (pixelIndex % 31)) & 1) === 1;
        }
      }
    }
    return grid;
  };

  const grid = generateGrid(value || "http://elibrary.sch.id");
  const cellWidth = size / grid.length;

  return (
    <div className={`flex flex-col items-center justify-center p-1.5 border border-border rounded-lg bg-white ${className}`}>
      <svg width={size} height={size}>
        <g fill="#000000">
          {grid.map((row, rIdx) =>
            row.map((isBlack, cIdx) => {
              if (!isBlack) return null;
              return (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx * cellWidth}
                  y={rIdx * cellWidth}
                  width={cellWidth + 0.1}
                  height={cellWidth + 0.1}
                />
              );
            })
          )}
        </g>
      </svg>
    </div>
  );
}
