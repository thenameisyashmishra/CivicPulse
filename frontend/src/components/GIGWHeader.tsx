/**
 * GIGW 3.0 / National Portal Accessibility Top Bar Component.
 *
 * Provides:
 * - Font Size Controls (A- / A / A+) for visual accessibility
 * - Official National Emblem & Ministry Branding Indicators
 * - Skip to Main Content Landmark for screen-reader navigation
 * - Bilingual Language Switcher Indicator (English / हिन्दी)
 */

import { useState } from "react";

export default function GIGWHeader() {
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0); // -1: small, 0: standard, 1: large

  const adjustFontSize = (level: number) => {
    setFontSizeLevel(level);
    const root = document.documentElement;
    if (level === -1) {
      root.style.fontSize = "14px";
    } else if (level === 1) {
      root.style.fontSize = "18px";
    } else {
      root.style.fontSize = "16px";
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between z-50">
      {/* Screen Reader Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to Main Content
      </a>

      {/* Official Government Identifier */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-100 flex items-center gap-1.5">
          🏛️ भारत सरकार | Government of India
        </span>
        <span className="hidden sm:inline text-slate-500">•</span>
        <span className="hidden sm:inline text-slate-400">
          Ministry of Rural Development & Panchayati Raj
        </span>
      </div>

      {/* Accessibility & Localization Tools */}
      <div className="flex items-center gap-3 mt-1 sm:mt-0">
        {/* Font Resize Widget */}
        <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60" aria-label="Font Size Adjustments">
          <button
            type="button"
            onClick={() => adjustFontSize(-1)}
            className={`px-1.5 py-0.5 rounded hover:bg-slate-700 hover:text-white transition-colors ${fontSizeLevel === -1 ? "font-bold text-primary" : ""}`}
            title="Decrease Font Size"
            aria-label="Decrease Font Size"
          >
            A-
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => adjustFontSize(0)}
            className={`px-1.5 py-0.5 rounded hover:bg-slate-700 hover:text-white transition-colors ${fontSizeLevel === 0 ? "font-bold text-primary" : ""}`}
            title="Standard Font Size"
            aria-label="Standard Font Size"
          >
            A
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => adjustFontSize(1)}
            className={`px-1.5 py-0.5 rounded hover:bg-slate-700 hover:text-white transition-colors ${fontSizeLevel === 1 ? "font-bold text-primary" : ""}`}
            title="Increase Font Size"
            aria-label="Increase Font Size"
          >
            A+
          </button>
        </div>

        {/* Language Badge */}
        <div className="flex items-center gap-1 text-slate-300 font-medium">
          <span className="text-primary font-semibold">EN</span>
          <span className="text-slate-600">/</span>
          <span className="hover:text-slate-100 cursor-pointer transition-colors">हिन्दी</span>
        </div>
      </div>
    </header>
  );
}
