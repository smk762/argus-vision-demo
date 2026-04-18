"use client";

import { useEffect } from "react";
import type { ImageResult } from "./types";
import { formatScoreBreakdown, selectionExplanation } from "./imageExplain";

interface Props {
  img: ImageResult | null;
  rank: number | null;
  totalCompared: number;
  selectedInRun: number;
  onClose: () => void;
}

export function ImageDetailModal({ img, rank, totalCompared, selectedInRun, onClose }: Props) {
  useEffect(() => {
    if (!img) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [img, onClose]);

  if (!img) return null;

  const localPath = img.source.startsWith("local:") ? img.source.slice("local:".length) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="curator-detail-title"
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-border bg-surface/95 backdrop-blur px-5 py-4">
          <div className="min-w-0">
            <h2 id="curator-detail-title" className="text-sm font-semibold text-foreground truncate">
              {img.name}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {rank !== null && totalCompared > 0
                ? `Training-pool rank by score: #${rank} of ${totalCompared} candidates`
                : "Not ranked (failed filters or marked duplicate)"}
              {" · "}
              {selectedInRun} selected in this run
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="aspect-video rounded-xl border border-border bg-background flex flex-col items-center justify-center gap-2 text-center px-6">
            <span className="text-4xl font-mono text-accent-teal/90 tabular-nums">
              {img.score.toFixed(3)}
            </span>
            <span className="text-xs uppercase tracking-wider text-muted">Composite training score</span>
            <p className="text-xs text-muted leading-relaxed max-w-md">
              Browser preview is not loaded (paths stay on the curator host). Use the file path below
              to open the image locally when running in local mode.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Selection
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed">{selectionExplanation(img)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatBlock title="Resolution" rows={[
              ["Dimensions", `${img.width}×${img.height}`],
              ["Short side", String(img.short_side)],
              ["Aspect (long/short)", img.aspect_ratio.toFixed(2)],
            ]} />
            <StatBlock title="Quality signals" rows={[
              ["Sharpness (Laplacian var.)", img.sharpness.toFixed(1)],
              ["Artifact score", img.artifact_score.toFixed(4)],
              ["Aesthetic (CLIP)", img.aesthetic_score.toFixed(4)],
              ["pHash", img.phash],
            ]} />
            {(img.face_count != null || img.person_detected != null) && (
              <StatBlock title="Detectors" rows={[
                ...(img.face_count != null ? [["Face count", String(img.face_count)]] as [string, string][] : []),
                ...(img.person_detected != null
                  ? [["Person detected", img.person_detected ? "yes" : "no"]] as [string, string][]
                  : []),
                ...(img.subject_score != null && img.subject_score > 0
                  ? [["Subject score", img.subject_score.toFixed(4)]] as [string, string][]
                  : []),
              ]} />
            )}
            {img.cluster_id != null && (
              <StatBlock title="Clustering" rows={[
                ["Embedding cluster", `C${img.cluster_id}`],
              ]} />
            )}
          </div>

          {img.score_breakdown && Object.keys(img.score_breakdown).length > 0 && (
            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Score breakdown
              </h3>
              <pre className="text-xs font-mono text-foreground/85 whitespace-pre-wrap leading-relaxed">
                {formatScoreBreakdown(img)}
              </pre>
            </div>
          )}

          {localPath && (
            <div className="rounded-xl border border-accent-teal/30 bg-accent-teal/5 p-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-accent-teal mb-1">
                Host path
              </h3>
              <code className="text-xs font-mono text-foreground/90 break-all">{localPath}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-xs">
            <dt className="text-muted shrink-0">{k}</dt>
            <dd className="font-mono text-foreground/90 text-right break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
