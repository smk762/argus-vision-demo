export interface ScoreBreakdown {
  sharpness?: number;
  resolution?: number;
  artifact?: number;
  aesthetic?: number;
  subject?: number;
  orientation_bonus?: number;
}

export interface ImageResult {
  name: string;
  source: string;
  width: number;
  height: number;
  short_side: number;
  aspect_ratio: number;
  sharpness: number;
  artifact_score: number;
  aesthetic_score: number;
  phash: string;
  passed: boolean;
  reject_reason: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  cluster_id: number | null;
  score: number;
  face_count?: number;
  person_detected?: boolean;
  subject_score?: number;
  tag_boost?: number;
  selected: boolean;
  score_breakdown?: ScoreBreakdown;
}

export interface ScanSummary {
  total: number;
  rejected_filters: number;
  duplicates_removed: number;
  candidates: number;
  selected: number;
  objective: string;
  target_style: string;
  diversity_weight: number;
  embedding_clustering: boolean;
  reject_reasons: Record<string, number>;
  selected_names: string[];
  results: ImageResult[];
}

export interface PresetDescription {
  label: string;
  description: string;
}

export const OBJECTIVES = ["identity", "style", "wardrobe", "concept"] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const OBJECTIVE_COLORS: Record<Objective, string> = {
  identity: "accent-purple",
  style: "accent-teal",
  wardrobe: "accent-green",
  concept: "accent-orange",
};

export interface ScanConfig {
  objective: Objective;
  target_style: "photo" | "anime";
  apply_preset: boolean;
  filters: {
    min_short_side: number;
    max_aspect_ratio: number;
    blur_threshold: number;
  };
  duplicates: {
    phash_hamming_distance: number;
  };
  embeddings: {
    use_clip: boolean;
    use_dino: boolean;
    batch_size: number;
  };
  detectors: {
    use_yolo: boolean;
    use_mtcnn: boolean;
  };
  selection: {
    target_count: number | null;
    top_percent: number;
    diversity_weight: number;
    use_embedding_clusters: boolean;
  };
}

export function defaultConfig(objective: Objective = "identity"): ScanConfig {
  return {
    objective,
    target_style: "photo",
    apply_preset: true,
    filters: { min_short_side: 512, max_aspect_ratio: 3.0, blur_threshold: 100.0 },
    duplicates: { phash_hamming_distance: 10 },
    embeddings: { use_clip: true, use_dino: false, batch_size: 16 },
    detectors: { use_yolo: false, use_mtcnn: false },
    selection: { target_count: null, top_percent: 80, diversity_weight: 0.4, use_embedding_clusters: true },
  };
}
