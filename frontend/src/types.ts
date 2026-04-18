export interface CaptionResult {
  final_caption: string;
  caption_variants: Record<string, string>;
  selected_category: string;
  removed_phrases: string[];
  compaction_notes: string[];
  raw_tags: string;
  raw_prose: string;
  backend_name: string;
  metadata: Record<string, unknown>;
}

export interface CaptionRequest {
  image_url: string;
  target_style?: string;
  target_category?: string;
  target_backend?: string;
  prose_enrichment?: boolean;
}

export const TARGET_BACKENDS = [
  { value: "sdxl", label: "SDXL", tokens: 60 },
  { value: "sd15", label: "SD 1.5", tokens: 60 },
  { value: "flux", label: "Flux", tokens: 200 },
  { value: "sd3", label: "SD3", tokens: 200 },
  { value: "kolors", label: "Kolors", tokens: 200 },
  { value: "pixart", label: "PixArt", tokens: 200 },
  { value: "playground", label: "Playground", tokens: 60 },
] as const;

export const TARGET_STYLES = ["photo", "anime"] as const;

export const TARGET_CATEGORIES = [
  { value: "identity", label: "Identity" },
  { value: "wardrobe", label: "Wardrobe" },
  { value: "camera_framing", label: "Camera / Framing" },
  { value: "pose_gaze", label: "Pose / Gaze" },
  { value: "setting", label: "Setting" },
  { value: "lighting", label: "Lighting" },
  { value: "action", label: "Action" },
] as const;

export type TargetCategory = (typeof TARGET_CATEGORIES)[number]["value"];
