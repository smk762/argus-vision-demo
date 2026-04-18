"use client";

import { useMemo, useState } from "react";
import type { ImageResult } from "./types";
import { ImageDetailModal } from "./ImageDetailModal";
import { breakdownTooltip, selectionExplanation } from "./imageExplain";

type FilterMode = "all" | "selected" | "rejected" | "duplicate";

interface Props {
  results: ImageResult[];
}

export function ImageResultsGrid({ results }: Props) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [hoveredBreakdown, setHoveredBreakdown] = useState<string | null>(null);
  const [detail, setDetail] = useState<ImageResult | null>(null);

  const candidatePool = useMemo(
    () => results.filter((r) => r.passed && !r.is_duplicate),
    [results],
  );

  const rankByName = useMemo(() => {
    const sorted = [...candidatePool].sort((a, b) => b.score - a.score);
    const m = new Map<string, number>();
    sorted.forEach((r, i) => m.set(r.name, i + 1));
    return m;
  }, [candidatePool]);

  const selectedInRun = useMemo(() => results.filter((r) => r.selected).length, [results]);

  const visible = results.filter((r) => {
    if (filter === "selected") return r.selected;
    if (filter === "rejected") return !r.passed && !r.is_duplicate;
    if (filter === "duplicate") return r.is_duplicate;
    return true;
  });

  const counts = {
    all: results.length,
    selected: results.filter((r) => r.selected).length,
    rejected: results.filter((r) => !r.passed && !r.is_duplicate).length,
    duplicate: results.filter((r) => r.is_duplicate).length,
  };

  return (
    <div className="space-y-4">
      <ImageDetailModal
        img={detail}
        rank={detail ? rankByName.get(detail.name) ?? null : null}
        totalCompared={candidatePool.length}
        selectedInRun={selectedInRun}
        onClose={() => setDetail(null)}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "selected", "rejected", "duplicate"] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilter(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === mode
                ? mode === "selected"
                  ? "bg-accent-green/20 border border-accent-green/40 text-accent-green"
                  : mode === "rejected"
                  ? "bg-accent-red/20 border border-accent-red/40 text-accent-red"
                  : mode === "duplicate"
                  ? "bg-accent-amber/20 border border-accent-amber/40 text-accent-amber"
                  : "bg-accent-purple/20 border border-accent-purple/40 text-accent-purple"
                : "bg-surface border border-border text-muted hover:text-foreground"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}{" "}
            <span className="opacity-70">({counts[mode]})</span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted leading-relaxed">
        Selected subset uses full colour; other passing images are de-emphasised. Hover the score pill
        for component hints. Click a card for full stats and ranking.
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {visible.map((img) => (
          <ImageCard
            key={img.name}
            img={img}
            rank={rankByName.get(img.name) ?? null}
            isHovered={hoveredBreakdown === img.name}
            onHover={(n) => setHoveredBreakdown(n)}
            onOpen={() => setDetail(img)}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-10 text-muted text-sm">
          No images match this filter.
        </div>
      )}
    </div>
  );
}

function ImageCard({
  img,
  rank,
  isHovered,
  onHover,
  onOpen,
}: {
  img: ImageResult;
  rank: number | null;
  isHovered: boolean;
  onHover: (name: string | null) => void;
  onOpen: () => void;
}) {
  const statusColor = img.selected
    ? "border-accent-green/70 ring-2 ring-accent-green/40"
    : img.is_duplicate
    ? "border-accent-amber/50"
    : !img.passed
    ? "border-accent-red/35"
    : "border-border";

  const fade =
    img.selected
      ? "opacity-100"
      : !img.passed || img.is_duplicate
      ? "opacity-[0.42] saturate-[0.65]"
      : "opacity-[0.58] saturate-[0.85]";

  const statusBadge = img.selected
    ? { label: "Selected", cls: "bg-accent-green/25 text-accent-green border border-accent-green/35" }
    : img.is_duplicate
    ? { label: "Duplicate", cls: "bg-accent-amber/20 text-accent-amber" }
    : !img.passed
    ? { label: "Rejected", cls: "bg-accent-red/20 text-accent-red" }
    : { label: "Candidate", cls: "bg-accent-blue/15 text-accent-blue border border-accent-blue/25" };

  const selectionTitle = selectionExplanation(img);

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${img.name}\n\n${selectionTitle}`}
      className={`text-left relative rounded-lg border ${statusColor} bg-surface overflow-hidden group transition-all duration-200 hover:border-accent-teal/40 hover:shadow-lg cursor-pointer ${fade}`}
      onMouseEnter={() => img.score_breakdown && onHover(img.name)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Placeholder thumbnail area */}
      <div className="aspect-square bg-background flex items-center justify-center relative">
        <div className="text-center p-2">
          <div className="text-[10px] font-mono text-muted break-all leading-tight line-clamp-3">
            {img.name}
          </div>
          <div
            className="text-[10px] text-muted mt-1"
            title={`Width × height in pixels after decode.\nShort side drives resolution filter.\nAspect = long / short.`}
          >
            {img.width}×{img.height}
          </div>
        </div>

        <div className="absolute top-1 left-1 flex flex-col gap-0.5 items-start">
          <span
            className="px-1 py-0.5 rounded bg-surface/90 border border-border text-[9px] font-mono text-muted"
            title="Rank among passing, non-duplicate images by composite score (1 = best)."
          >
            #{rank ?? "—"}
          </span>
        </div>

        <div className="absolute top-1 right-1" title="Composite training score (weighted quality + diversity).">
          <ScoreBadge score={img.score} />
        </div>

        {img.cluster_id !== null && (
          <div
            className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple text-[10px] font-mono"
            title="CLIP embedding cluster — selection spreads quota across clusters for coverage."
          >
            C{img.cluster_id}
          </div>
        )}
      </div>

      <div className="p-2 space-y-1">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge.cls}`}
          title={selectionTitle}
        >
          {statusBadge.label}
        </span>
        {img.reject_reason && (
          <div className="text-[10px] text-accent-red/80 leading-tight truncate" title={img.reject_reason}>
            {img.reject_reason}
          </div>
        )}
        {img.is_duplicate && img.duplicate_of && (
          <div className="text-[10px] text-accent-amber/80 leading-tight truncate" title={`Near-duplicate of ${img.duplicate_of}`}>
            dup: {img.duplicate_of}
          </div>
        )}
      </div>

      {isHovered && img.score_breakdown && (
        <div className="absolute inset-x-0 bottom-full mb-1 z-20 mx-1 pointer-events-none">
          <div className="rounded-lg border border-border bg-surface shadow-xl p-2.5 text-[11px] space-y-1">
            <div className="font-semibold text-muted uppercase tracking-wider text-[10px] mb-1.5">
              Score breakdown
            </div>
            {Object.entries(img.score_breakdown)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3" title={breakdownTooltip(k)}>
                  <span className="text-muted">{k.replace(/_/g, " ")}</span>
                  <span className="font-mono text-foreground">
                    {(v as number).toFixed(3)}
                  </span>
                </div>
              ))}
            <div className="border-t border-border pt-1 flex justify-between gap-3">
              <span className="font-medium text-foreground">total</span>
              <span className="font-mono font-bold text-accent-purple">
                {img.score.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 0.7
      ? "bg-accent-green/20 text-accent-green"
      : score >= 0.4
      ? "bg-accent-amber/20 text-accent-amber"
      : "bg-accent-red/20 text-accent-red";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${color}`}>
      {score.toFixed(2)}
    </span>
  );
}
