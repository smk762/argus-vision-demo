import type { ImageResult } from "./types";

const BREAKDOWN_HINTS: Record<string, string> = {
  sharpness: "In-focus detail vs blur (higher is sharper).",
  resolution: "Pixels on the short edge vs your training target.",
  artifact: "Compression / banding / corruption penalty (higher is cleaner).",
  aesthetic: "CLIP-based aesthetic proxy (model-dependent).",
  subject: "Face / person detector agreement with the training objective.",
  orientation_bonus: "Boost for upright, well-framed shots when enabled.",
};

export function breakdownTooltip(key: string): string {
  return BREAKDOWN_HINTS[key] ?? `Score component: ${key.replace(/_/g, " ")}.`;
}

/** Plain-language explanation for tooltips and the detail modal. */
export function selectionExplanation(img: ImageResult): string {
  if (!img.passed) {
    return img.reject_reason
      ? `Filtered out during CPU checks: ${img.reject_reason}.`
      : "Did not pass hard filters (resolution, aspect, or blur).";
  }
  if (img.is_duplicate) {
    return img.duplicate_of
      ? `Near-duplicate of "${img.duplicate_of}" (pHash distance within threshold). The pipeline keeps the stronger shot.`
      : "Marked as a near-duplicate; only one image per duplicate chain is kept.";
  }
  if (img.selected) {
    return "In the optimal subset: high composite score and/or diversity coverage across embedding clusters.";
  }
  return "Passed filters but not chosen for the subset — beaten on combined score and/or cluster quota.";
}

export function formatScoreBreakdown(img: ImageResult): string {
  if (!img.score_breakdown || Object.keys(img.score_breakdown).length === 0) {
    return "No per-component breakdown returned for this run.";
  }
  return Object.entries(img.score_breakdown)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed(3) : String(v)}`)
    .join("\n");
}
