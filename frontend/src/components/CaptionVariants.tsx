"use client";

import { useState } from "react";
import type { CaptionResult } from "@/types";

const VARIANT_STYLES: Record<string, { label: string; border: string; labelColor: string }> = {
  training: {
    label: "TRAINING",
    border: "border-l-accent-red",
    labelColor: "text-accent-red",
  },
  identity: {
    label: "IDENTITY",
    border: "border-l-accent-purple",
    labelColor: "text-accent-purple",
  },
  wardrobe: {
    label: "WARDROBE",
    border: "border-l-accent-green",
    labelColor: "text-accent-green",
  },
  pose_composition: {
    label: "POSE",
    border: "border-l-accent-amber",
    labelColor: "text-accent-amber",
  },
  setting: {
    label: "SETTING",
    border: "border-l-accent-blue",
    labelColor: "text-accent-blue",
  },
  lighting: {
    label: "LIGHTING",
    border: "border-l-amber-300",
    labelColor: "text-amber-300",
  },
  action: {
    label: "ACTION",
    border: "border-l-accent-pink",
    labelColor: "text-accent-pink",
  },
  zeroshot: {
    label: "ZERO-SHOT",
    border: "border-l-accent-teal",
    labelColor: "text-accent-teal",
  },
};

function getVariantStyle(key: string) {
  return (
    VARIANT_STYLES[key] ?? {
      label: key.toUpperCase().replace(/_/g, " "),
      border: "border-l-muted",
      labelColor: "text-muted",
    }
  );
}

interface CaptionVariantsProps {
  result: CaptionResult;
}

export function CaptionVariants({ result }: CaptionVariantsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const derived = result.final_caption;
  const variants = result.caption_variants;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
        Caption Variants
      </h3>

      {/* Derived training caption — highlighted */}
      <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-4 border-l-4 border-l-accent-red">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold tracking-wider text-accent-red">
            DERIVED TRAINING CAPTION
          </span>
          <button
            onClick={() => handleCopy(derived, "__derived")}
            className="text-xs text-accent-teal hover:text-accent-teal/80 transition-colors cursor-pointer"
          >
            {copiedKey === "__derived" ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
        <p className="text-sm text-foreground/90 font-mono leading-relaxed">
          {derived}
        </p>
      </div>

      {/* Category variants */}
      {Object.entries(variants).map(([key, caption]) => {
        const style = getVariantStyle(key);
        return (
          <div
            key={key}
            className={`rounded-lg border border-border bg-surface p-4 border-l-4 ${style.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs font-bold tracking-wider ${style.labelColor}`}
              >
                {style.label}
              </span>
              <button
                onClick={() => handleCopy(caption, key)}
                className="text-xs text-accent-teal hover:text-accent-teal/80 transition-colors cursor-pointer"
              >
                {copiedKey === key ? "Copied!" : "Copy to clipboard"}
              </button>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {caption}
            </p>
          </div>
        );
      })}
    </div>
  );
}
