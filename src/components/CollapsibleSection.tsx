"use client";

import { useState, ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  icon = "🔧",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {title}
          </h2>
        </div>
        <svg
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[var(--card-border)]">
          {children}
        </div>
      )}
    </div>
  );
}
