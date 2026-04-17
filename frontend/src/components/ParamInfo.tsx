"use client";

import { useState, type ReactNode } from "react";

interface ParamInfoProps {
  label: string;
  description: string;
  example: string;
  children: ReactNode;
}

export function ParamInfo({
  label,
  description,
  example,
  children,
}: ParamInfoProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-muted hover:text-accent-purple transition-colors cursor-pointer"
          aria-label={`${expanded ? "Hide" : "Show"} info for ${label}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {expanded ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            )}
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2">{children}</div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
          <p
            className="text-xs text-muted leading-relaxed"
            dangerouslySetInnerHTML={{ __html: description }}
          />
          <code className="block text-xs text-accent-teal/80 bg-background rounded px-2 py-1 font-mono">
            {example}
          </code>
        </div>
      )}
    </div>
  );
}
