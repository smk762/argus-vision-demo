"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanConfigPanel } from "@/components/curator/ScanConfigPanel";
import { ScanSummaryPanel } from "@/components/curator/ScanSummaryPanel";
import { ImageResultsGrid } from "@/components/curator/ImageResultsGrid";
import { defaultConfig, type ScanConfig, type ScanSummary } from "@/components/curator/types";

const CURATOR_URL =
  process.env.NEXT_PUBLIC_CURATOR_URL ?? "http://localhost:8001";

export default function CuratePage() {
  const [config, setConfig] = useState<ScanConfig>(defaultConfig());
  const [folderPath, setFolderPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [curatorVersion, setCuratorVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${CURATOR_URL}/version`);
        if (!resp.ok) throw new Error(String(resp.status));
        const data: { version?: string } = await resp.json();
        if (!cancelled) setCuratorVersion(data.version ?? "unknown");
      } catch {
        if (!cancelled) setCuratorVersion("");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const body = {
        folder: folderPath.trim(),
        objective: config.objective,
        target_style: config.target_style,
        apply_preset: config.apply_preset,
        filters: config.filters,
        duplicates: config.duplicates,
        embeddings: config.embeddings,
        detectors: config.detectors,
        selection: config.selection,
      };

      const resp = await fetch(`${CURATOR_URL}/scan/folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const detail = await resp.json().catch(() => null);
        throw new Error(detail?.detail ?? `Server error: ${resp.status}`);
      }

      const data: ScanSummary = await resp.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (mode: "copy" | "move") => {
    if (!summary || !outputPath.trim()) return;

    setExporting(true);
    setError(null);

    try {
      const body = {
        source_folder: folderPath.trim(),
        output_folder: outputPath.trim(),
        selected_names: summary.selected_names,
      };

      const resp = await fetch(`${CURATOR_URL}/export/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const detail = await resp.json().catch(() => null);
        throw new Error(detail?.detail ?? `Export error: ${resp.status}`);
      }

      const data: { exported: number; output_folder: string } = await resp.json();
      setError(null);
      alert(`Exported ${data.exported} images to ${data.output_folder}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = summary?.selected ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Nav links */}
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Caption
              </Link>
              <Link
                href="/curate"
                className="px-3 py-1.5 rounded-lg text-sm text-foreground bg-surface-hover border border-border"
              >
                Curate
              </Link>
            </nav>

            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-accent-teal/20 border border-accent-teal/40 flex items-center justify-center">
                <span className="text-accent-teal text-sm font-bold">C</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground">Argus Curator</h1>
                <p className="text-xs text-muted">Dataset curation for LoRA training</p>
              </div>
            </div>
          </div>

          {/* Version badge */}
          <div className="shrink-0 text-right">
            {curatorVersion === null ? (
              <span className="text-[10px] uppercase tracking-wider text-muted/60">…</span>
            ) : curatorVersion === "" ? (
              <span className="text-[10px] uppercase tracking-wider text-accent-red/80">
                API unreachable
              </span>
            ) : (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted">argus-curator</span>
                <span className="text-xs font-mono text-foreground/90">{curatorVersion}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left: config panel */}
          <aside className="space-y-4">
            <form onSubmit={handleScan} className="space-y-4">
              {/* Folder input */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Image Folder
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="/path/to/images"
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:border-accent-teal/50"
                />
                <button
                  type="submit"
                  disabled={loading || !folderPath.trim()}
                  className="w-full px-4 py-2.5 rounded-lg bg-accent-teal text-black font-semibold text-sm hover:bg-accent-teal/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Spinner />
                      Scanning…
                    </span>
                  ) : (
                    "Scan Folder"
                  )}
                </button>
              </div>

              {/* Config */}
              <div className="rounded-xl border border-border bg-surface p-4">
                <ScanConfigPanel
                  config={config}
                  onChange={setConfig}
                  loading={loading}
                />
              </div>
            </form>

            {/* Export panel */}
            {summary && selectedCount > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Export {selectedCount} selected
                </label>
                <input
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="/path/to/training_subset"
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green/50"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={exporting || !outputPath.trim()}
                    onClick={() => handleExport("copy")}
                    className="flex-1 px-3 py-2 rounded-lg bg-accent-green/20 border border-accent-green/40 text-accent-green text-sm font-medium hover:bg-accent-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {exporting ? <Spinner /> : "Copy"}
                  </button>
                  <button
                    type="button"
                    disabled={exporting || !outputPath.trim()}
                    onClick={() => handleExport("move")}
                    className="flex-1 px-3 py-2 rounded-lg bg-accent-amber/20 border border-accent-amber/40 text-accent-amber text-sm font-medium hover:bg-accent-amber/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {exporting ? <Spinner /> : "Move"}
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* Right: results */}
          <div className="space-y-6 min-w-0">
            {error && (
              <div className="p-4 rounded-lg border border-accent-red/30 bg-accent-red/5 text-accent-red text-sm">
                {error}
              </div>
            )}

            {summary && (
              <>
                <ScanSummaryPanel summary={summary} />
                <div className="rounded-xl border border-border bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
                    Results ({summary.results.length})
                  </h2>
                  <ImageResultsGrid results={summary.results} />
                </div>
              </>
            )}

            {!summary && !loading && !error && (
              <EmptyState />
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-accent-teal/30 border-t-accent-teal animate-spin" />
                <p className="text-sm text-muted">Scanning images…</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted">
          <span>
            Powered by{" "}
            <a
              href="https://github.com/smk762/argus-curator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-teal hover:text-accent-teal/80 transition-colors"
            >
              argus-curator
            </a>
          </span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function PipelineStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-accent-teal/20 border border-accent-teal/40 flex items-center justify-center text-xs font-bold text-accent-teal">
          {number}
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-foreground/60 mb-1">
        Enter a folder path to get started
      </h2>
      <p className="text-sm text-muted max-w-md">
        Argus Curator will score and rank images, deduplicate near-identical shots, and select an optimal training subset.
      </p>

      <div className="mt-12 w-full max-w-2xl text-left">
        <h3 className="text-xs font-semibold tracking-widest text-muted uppercase mb-4 text-center">
          Curation Pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PipelineStep
            number={1}
            title="Hard filtering (CPU)"
            description="Resolution, aspect ratio, and blur thresholds eliminate technically unacceptable images before any GPU work."
          />
          <PipelineStep
            number={2}
            title="Quality scoring (GPU)"
            description="CLIP aesthetic proxy, sharpness, artifact score, and optional YOLO/MTCNN detectors produce a composite training-utility score."
          />
          <PipelineStep
            number={3}
            title="Deduplication + clustering"
            description="pHash Hamming distance removes near-duplicates. CLIP embeddings cluster the remaining candidates by semantic similarity."
          />
          <PipelineStep
            number={4}
            title="Optimal subset selection"
            description="Proportional per-cluster quota blended toward equal coverage by diversity weight picks the best N images for training."
          />
        </div>
      </div>
    </div>
  );
}
