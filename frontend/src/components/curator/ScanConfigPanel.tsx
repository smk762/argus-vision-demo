"use client";

import { OBJECTIVES, OBJECTIVE_COLORS, type ScanConfig, type Objective } from "./types";

const OBJECTIVE_LABELS: Record<Objective, string> = {
  identity: "Identity",
  style: "Style",
  wardrobe: "Wardrobe",
  concept: "Concept",
};

const OBJECTIVE_DESCRIPTIONS: Record<Objective, string> = {
  identity: "Person / character LoRA — strict blur, face detection, face-count penalty",
  style: "Style / aesthetic LoRA — high aesthetic weight, max diversity",
  wardrobe: "Clothing / outfit LoRA — full-body preference, YOLO enabled",
  concept: "Object / concept LoRA — coverage-maximising clustering",
};

const ACCENT_CLASSES: Record<string, { ring: string; text: string; bg: string; border: string }> = {
  "accent-purple": { ring: "ring-accent-purple", text: "text-accent-purple", bg: "bg-accent-purple/20", border: "border-accent-purple/40" },
  "accent-teal":   { ring: "ring-accent-teal",   text: "text-accent-teal",   bg: "bg-accent-teal/20",   border: "border-accent-teal/40" },
  "accent-green":  { ring: "ring-accent-green",   text: "text-accent-green",  bg: "bg-accent-green/20",  border: "border-accent-green/40" },
  "accent-orange": { ring: "ring-accent-orange",  text: "text-accent-orange", bg: "bg-accent-orange/20", border: "border-accent-orange/40" },
};

interface Props {
  config: ScanConfig;
  onChange: (cfg: ScanConfig) => void;
  loading: boolean;
}

export function ScanConfigPanel({ config, onChange, loading }: Props) {
  const set = <K extends keyof ScanConfig>(key: K, val: ScanConfig[K]) =>
    onChange({ ...config, [key]: val });

  const setFilters = (patch: Partial<ScanConfig["filters"]>) =>
    set("filters", { ...config.filters, ...patch });

  const setSelection = (patch: Partial<ScanConfig["selection"]>) =>
    set("selection", { ...config.selection, ...patch });

  const setEmbeddings = (patch: Partial<ScanConfig["embeddings"]>) =>
    set("embeddings", { ...config.embeddings, ...patch });

  const setDetectors = (patch: Partial<ScanConfig["detectors"]>) =>
    set("detectors", { ...config.detectors, ...patch });

  return (
    <div className="space-y-6">
      {/* Objective selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Training Objective
        </label>
        <div className="grid grid-cols-2 gap-2">
          {OBJECTIVES.map((obj) => {
            const color = OBJECTIVE_COLORS[obj];
            const ac = ACCENT_CLASSES[color];
            const active = config.objective === obj;
            return (
              <button
                key={obj}
                type="button"
                onClick={() => set("objective", obj)}
                disabled={loading}
                className={`rounded-lg border p-3 text-left transition-all cursor-pointer disabled:opacity-50 ${
                  active
                    ? `${ac.bg} ${ac.border} ring-1 ${ac.ring}`
                    : "bg-surface border-border hover:bg-surface-hover"
                }`}
              >
                <div className={`text-sm font-semibold mb-0.5 ${active ? ac.text : "text-foreground"}`}>
                  {OBJECTIVE_LABELS[obj]}
                </div>
                <div className="text-[11px] text-muted leading-tight">
                  {OBJECTIVE_DESCRIPTIONS[obj]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target style */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          Target Style
        </label>
        <div className="flex gap-2">
          {(["photo", "anime"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("target_style", s)}
              disabled={loading}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                config.target_style === s
                  ? "bg-accent-purple text-white"
                  : "bg-surface border border-border text-foreground hover:bg-surface-hover"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Apply preset toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">Apply Preset</div>
          <div className="text-xs text-muted">Override filters/weights from objective preset</div>
        </div>
        <Toggle
          value={config.apply_preset}
          onChange={(v) => set("apply_preset", v)}
          disabled={loading}
        />
      </div>

      <hr className="border-border" />

      {/* Hard filters */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Hard Filters
        </label>
        <div className="space-y-3">
          <SliderField
            label="Min short side (px)"
            value={config.filters.min_short_side}
            min={128} max={1024} step={64}
            onChange={(v) => setFilters({ min_short_side: v })}
            disabled={loading}
          />
          <SliderField
            label="Max aspect ratio"
            value={config.filters.max_aspect_ratio}
            min={1.0} max={6.0} step={0.5}
            format={(v) => v.toFixed(1)}
            onChange={(v) => setFilters({ max_aspect_ratio: v })}
            disabled={loading}
          />
          <SliderField
            label="Blur threshold (Laplacian var)"
            value={config.filters.blur_threshold}
            min={10} max={500} step={10}
            onChange={(v) => setFilters({ blur_threshold: v })}
            disabled={loading}
          />
        </div>
      </div>

      <hr className="border-border" />

      {/* Selection */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Selection
        </label>
        <div className="space-y-3">
          <SliderField
            label="Top % candidates"
            value={config.selection.top_percent}
            min={10} max={100} step={5}
            format={(v) => `${v}%`}
            onChange={(v) => setSelection({ top_percent: v })}
            disabled={loading}
          />
          <SliderField
            label="Diversity weight"
            value={config.selection.diversity_weight}
            min={0.0} max={1.0} step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => setSelection({ diversity_weight: v })}
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">Target count</div>
              <div className="text-xs text-muted">Leave blank to use top %</div>
            </div>
            <input
              type="number"
              min={1}
              value={config.selection.target_count ?? ""}
              placeholder="auto"
              disabled={loading}
              onChange={(e) =>
                setSelection({
                  target_count: e.target.value === "" ? null : parseInt(e.target.value),
                })
              }
              className="w-20 px-2 py-1.5 rounded-lg bg-surface border border-border text-foreground text-sm text-right focus:outline-none focus:ring-1 focus:ring-accent-purple/50 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">Embedding clusters</div>
              <div className="text-xs text-muted">CLIP-based diversity (requires GPU)</div>
            </div>
            <Toggle
              value={config.selection.use_embedding_clusters}
              onChange={(v) => setSelection({ use_embedding_clusters: v })}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Embeddings */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Embeddings (GPU)
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">CLIP (ViT-L/14)</div>
              <div className="text-xs text-muted">Semantic similarity + aesthetic proxy</div>
            </div>
            <Toggle
              value={config.embeddings.use_clip}
              onChange={(v) => setEmbeddings({ use_clip: v })}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">DINOv2</div>
              <div className="text-xs text-muted">Visual structure embedding</div>
            </div>
            <Toggle
              value={config.embeddings.use_dino}
              onChange={(v) => setEmbeddings({ use_dino: v })}
              disabled={loading}
            />
          </div>
          <SliderField
            label="Batch size"
            value={config.embeddings.batch_size}
            min={4} max={64} step={4}
            onChange={(v) => setEmbeddings({ batch_size: v })}
            disabled={loading}
          />
        </div>
      </div>

      <hr className="border-border" />

      {/* Detectors */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Detectors (GPU)
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">YOLO person detection</div>
              <div className="text-xs text-muted">Full-body presence + subject score</div>
            </div>
            <Toggle
              value={config.detectors.use_yolo}
              onChange={(v) => setDetectors({ use_yolo: v })}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">MTCNN face detection</div>
              <div className="text-xs text-muted">Face count for identity objectives</div>
            </div>
            <Toggle
              value={config.detectors.use_mtcnn}
              onChange={(v) => setDetectors({ use_mtcnn: v })}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
        value ? "bg-accent-purple" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-sm font-mono text-accent-purple">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent-purple disabled:opacity-50 cursor-pointer"
      />
    </div>
  );
}
