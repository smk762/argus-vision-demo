"use client";

import type { ScanSummary } from "./types";

interface Props {
  summary: ScanSummary;
}

export function ScanSummaryPanel({ summary }: Props) {
  const rejectEntries = Object.entries(summary.reject_reasons).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        Scan Summary
      </h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Total" value={summary.total} color="text-foreground" />
        <Stat label="Selected" value={summary.selected} color="text-accent-green" />
        <Stat label="Rejected" value={summary.rejected_filters} color="text-accent-red" />
        <Stat label="Duplicates" value={summary.duplicates_removed} color="text-accent-amber" />
        <Stat label="Candidates" value={summary.candidates} color="text-accent-blue" />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs">
        <Badge label="Objective" value={summary.objective} color="accent-purple" />
        <Badge label="Style" value={summary.target_style} color="accent-teal" />
        <Badge
          label="Diversity weight"
          value={summary.diversity_weight.toFixed(2)}
          color="accent-orange"
        />
        <Badge
          label="Clustering"
          value={summary.embedding_clustering ? "CLIP" : "pHash"}
          color={summary.embedding_clustering ? "accent-green" : "accent-amber"}
        />
      </div>

      {/* Reject breakdown */}
      {rejectEntries.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Reject reasons
          </div>
          <div className="space-y-1.5">
            {rejectEntries.map(([reason, count]) => {
              const pct = Math.round((count / summary.total) * 100);
              return (
                <div key={reason} className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-foreground/80 truncate">{reason}</div>
                  <div
                    className="h-1.5 rounded-full bg-accent-red/60 shrink-0"
                    style={{ width: `${Math.max(pct, 2)}%`, maxWidth: "120px" }}
                  />
                  <div className="text-xs font-mono text-accent-red w-8 text-right shrink-0">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center">
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  );
}

function Badge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1">
      <span className="text-muted">{label}:</span>
      <span className={`font-medium text-${color}`}>{value}</span>
    </div>
  );
}
