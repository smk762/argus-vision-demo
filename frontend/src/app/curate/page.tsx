"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScanConfigPanel } from "@/components/curator/ScanConfigPanel";
import { ScanSummaryPanel } from "@/components/curator/ScanSummaryPanel";
import { ImageResultsGrid } from "@/components/curator/ImageResultsGrid";
import { defaultConfig, type ScanConfig, type ScanSummary } from "@/components/curator/types";
import {
  CURATOR_UI_MODE,
  LOCAL_OUTPUT_PATH,
  LOCAL_SOURCE_PATH,
  type CuratorUiMode,
} from "@/lib/curatorEnv";

const CURATOR_URL =
  process.env.NEXT_PUBLIC_CURATOR_URL ?? "http://localhost:8101";

const isLocalMode = CURATOR_UI_MODE === "local";

type UploadPick = "none" | "folder" | "zip";

function buildScanJson(config: ScanConfig): Record<string, unknown> {
  return {
    objective: config.objective,
    target_style: config.target_style,
    apply_preset: config.apply_preset,
    filters: config.filters,
    duplicates: config.duplicates,
    embeddings: {
      ...config.embeddings,
      clip_model: "openai/clip-vit-large-patch14",
      dino_model: "facebook/dinov2-base",
      device: "auto",
    },
    detectors: {
      ...config.detectors,
      yolo_model: "yolov8n.pt",
      mtcnn_confidence: 0.9,
      batch_size: config.embeddings.batch_size,
      device: "auto",
    },
    max_workers: 4,
    selection: {
      ...config.selection,
      n_clusters: null,
      caption_tags: null,
    },
  };
}

export default function CuratePage() {
  const [config, setConfig] = useState<ScanConfig>(defaultConfig());
  const [uploadPick, setUploadPick] = useState<UploadPick>("none");
  const [folderPath, setFolderPath] = useState(
    () => (isLocalMode ? LOCAL_SOURCE_PATH : ""),
  );
  const [outputPath, setOutputPath] = useState(
    () => (isLocalMode ? LOCAL_OUTPUT_PATH : ""),
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [curatorVersion, setCuratorVersion] = useState<string | null>(null);
  const [fileInputNonce, setFileInputNonce] = useState(0);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const resetUploadInputs = useCallback(() => {
    setUploadPick("none");
    setFileInputNonce((n) => n + 1);
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (zipInputRef.current) zipInputRef.current.value = "";
  }, []);

  const destroySessionQuiet = useCallback(async (id: string | null) => {
    if (!id) return;
    try {
      await fetch(`${CURATOR_URL}/sessions/${id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }, []);

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

  const onFolderPickChange = () => {
    const el = folderInputRef.current;
    if (!el?.files?.length) {
      setUploadPick("none");
      return;
    }
    setUploadPick("folder");
    if (zipInputRef.current) zipInputRef.current.value = "";
  };

  const onZipPickChange = () => {
    const el = zipInputRef.current;
    if (!el?.files?.length) {
      setUploadPick("none");
      return;
    }
    setUploadPick("zip");
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const runLocalScan = async () => {
    if (!folderPath.trim()) return;
    setLoading(true);
    try {
      const body = {
        folder: folderPath.trim(),
        ...buildScanJson(config),
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

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSummary(null);
    setSessionId(null);

    if (isLocalMode) {
      await runLocalScan();
      return;
    }

    const folderEl = folderInputRef.current;
    const zipEl = zipInputRef.current;
    const folderFiles = folderEl?.files?.length ? Array.from(folderEl.files) : [];
    const zipFile = zipEl?.files?.[0] ?? null;

    if (uploadPick === "folder" && folderFiles.length === 0) {
      setError("Choose an image folder first.");
      return;
    }
    if (uploadPick === "zip" && !zipFile) {
      setError("Choose a .zip file first.");
      return;
    }
    if (uploadPick === "none") {
      setError("Choose a folder of images or a .zip archive.");
      return;
    }

    setLoading(true);
    let sid: string | null = null;
    try {
      const cr = await fetch(`${CURATOR_URL}/sessions`, { method: "POST" });
      if (!cr.ok) {
        const detail = await cr.json().catch(() => null);
        throw new Error(detail?.detail ?? `Could not start session (${cr.status}).`);
      }
      const { session_id } = (await cr.json()) as { session_id: string };
      sid = session_id;

      if (uploadPick === "zip" && zipFile) {
        const fd = new FormData();
        fd.append("archive", zipFile, zipFile.name);
        const up = await fetch(`${CURATOR_URL}/sessions/${sid}/upload-zip`, {
          method: "POST",
          body: fd,
        });
        if (!up.ok) {
          const detail = await up.json().catch(() => null);
          throw new Error(detail?.detail ?? `Upload failed (${up.status}).`);
        }
      } else {
        const fd = new FormData();
        for (const f of folderFiles) {
          const rel =
            (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
          fd.append("files", f, rel.replace(/\\/g, "/"));
        }
        const up = await fetch(`${CURATOR_URL}/sessions/${sid}/upload`, {
          method: "POST",
          body: fd,
        });
        if (!up.ok) {
          const detail = await up.json().catch(() => null);
          throw new Error(detail?.detail ?? `Upload failed (${up.status}).`);
        }
      }

      const scanBody = buildScanJson(config);
      const resp = await fetch(`${CURATOR_URL}/sessions/${sid}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanBody),
      });
      if (!resp.ok) {
        const detail = await resp.json().catch(() => null);
        throw new Error(detail?.detail ?? `Scan failed (${resp.status}).`);
      }
      const data: ScanSummary = await resp.json();
      setSummary(data);
      setSessionId(data.session_id ?? sid);
    } catch (err) {
      await destroySessionQuiet(sid);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardSession = async () => {
    await destroySessionQuiet(sessionId);
    setSessionId(null);
    setSummary(null);
    setError(null);
    resetUploadInputs();
  };

  const handleDownloadZip = async () => {
    if (!summary || !sessionId || summary.selected_names.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const resp = await fetch(`${CURATOR_URL}/sessions/${sessionId}/export-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_names: summary.selected_names }),
      });
      if (!resp.ok) {
        const detail = await resp.json().catch(() => null);
        throw new Error(detail?.detail ?? `Export failed (${resp.status}).`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "curated-subset.zip";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await destroySessionQuiet(sessionId);
      setSessionId(null);
      setSummary(null);
      resetUploadInputs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExporting(false);
    }
  };

  const handleExport = async (mode: "copy" | "move") => {
    if (!summary || !outputPath.trim()) return;

    const selectedRows = summary.results.filter((r) => r.selected);
    if (selectedRows.length === 0) return;

    setExporting(true);
    setError(null);

    try {
      const body = {
        sources: selectedRows.map((r) => r.source),
        dest_names: selectedRows.map((r) => r.name),
        target_folder: outputPath.trim(),
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

      const data: { copied?: number; moved?: number; target_folder: string } = await resp.json();
      const n = data.copied ?? data.moved ?? 0;
      alert(`${mode === "copy" ? "Copied" : "Moved"} ${n} images to ${data.target_folder}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = summary?.selected ?? 0;
  const canScanUpload =
    uploadPick === "folder"
      ? Boolean(folderInputRef.current?.files?.length)
      : uploadPick === "zip"
        ? Boolean(zipInputRef.current?.files?.length)
        : false;
  const canScanLocal = folderPath.trim().length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
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

          <div className="shrink-0 flex flex-col items-end gap-1">
            <span
              className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                isLocalMode
                  ? "border-accent-purple/40 text-accent-purple bg-accent-purple/10"
                  : "border-accent-teal/40 text-accent-teal bg-accent-teal/10"
              }`}
              title={
                isLocalMode
                  ? "NEXT_PUBLIC_CURATOR_UI_MODE=local — paths are read on the curator host (e.g. Docker volumes)."
                  : "NEXT_PUBLIC_CURATOR_UI_MODE=demo (default) — browser upload to ephemeral server session."
              }
            >
              {isLocalMode ? "Local paths" : "Live demo"}
            </span>
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <aside className="space-y-4">
            <form onSubmit={handleScan} className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Image source
                </span>
                {isLocalMode ? (
                  <>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Paths are sent to the curator API as JSON; they must exist on the host running
                      argus-curator (for Docker, mount volumes and set{" "}
                      <span className="font-mono text-foreground/80">NEXT_PUBLIC_CURATOR_*</span>{" "}
                      at <strong className="text-foreground/90">build</strong> time).
                    </p>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Source directory
                    </label>
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="/data/images"
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:border-accent-teal/50"
                    />
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Export directory
                    </label>
                    <input
                      type="text"
                      value={outputPath}
                      onChange={(e) => setOutputPath(e.target.value)}
                      placeholder="/data/out"
                      className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green/50"
                    />
                    <button
                      type="submit"
                      disabled={loading || !canScanLocal}
                      className="w-full px-4 py-2.5 rounded-lg bg-accent-teal text-black font-semibold text-sm hover:bg-accent-teal/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {loading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Spinner />
                          Scanning…
                        </span>
                      ) : (
                        "Scan folder"
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Upload a folder or zip for the public demo. Files live in a temp directory on
                      the API host until you download a zip or discard the session.
                    </p>
                    <input
                      key={`f-${fileInputNonce}`}
                      ref={folderInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={onFolderPickChange}
                      {...{ webkitdirectory: "true" } as React.InputHTMLAttributes<HTMLInputElement>}
                    />
                    <input
                      key={`z-${fileInputNonce}`}
                      ref={zipInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      className="hidden"
                      onChange={onZipPickChange}
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        className="w-full px-3 py-2.5 rounded-lg border border-accent-teal/50 bg-accent-teal/10 text-accent-teal text-sm font-medium hover:bg-accent-teal/20 transition-colors cursor-pointer"
                      >
                        Choose image folder…
                      </button>
                      <button
                        type="button"
                        onClick={() => zipInputRef.current?.click()}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-surface-hover transition-colors cursor-pointer"
                      >
                        Choose .zip archive…
                      </button>
                    </div>
                    <p className="text-[11px] text-muted">
                      {uploadPick === "folder" && folderInputRef.current?.files?.length
                        ? `${folderInputRef.current.files.length} files selected`
                        : uploadPick === "zip" && zipInputRef.current?.files?.[0]
                          ? `Zip: ${zipInputRef.current.files[0].name}`
                          : "No files selected yet."}
                    </p>
                    <button
                      type="submit"
                      disabled={loading || !canScanUpload}
                      className="w-full px-4 py-2.5 rounded-lg bg-accent-teal text-black font-semibold text-sm hover:bg-accent-teal/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {loading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Spinner />
                          Scanning…
                        </span>
                      ) : (
                        "Scan"
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-border bg-surface p-4">
                <ScanConfigPanel
                  config={config}
                  onChange={setConfig}
                  loading={loading}
                />
              </div>
            </form>

            {!isLocalMode && summary && sessionId && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                {selectedCount > 0 ? (
                  <>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Download subset
                    </label>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Saves only the selected images as{" "}
                      <span className="font-mono text-foreground/80">curated-subset.zip</span>, then
                      deletes the temporary session on the server.
                    </p>
                    <button
                      type="button"
                      disabled={exporting}
                      onClick={() => void handleDownloadZip()}
                      className="w-full px-4 py-2.5 rounded-lg bg-accent-green/20 border border-accent-green/40 text-accent-green text-sm font-semibold hover:bg-accent-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {exporting ? <Spinner /> : "Download zip & clear session"}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted leading-relaxed">
                    No images were selected for this run. Tweak filters or try a different source set,
                    then discard the upload when you are done.
                  </p>
                )}
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => void handleDiscardSession()}
                  className="w-full px-3 py-2 rounded-lg border border-border text-muted text-xs font-medium hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Discard session (delete server copy)
                </button>
              </div>
            )}

            {isLocalMode && summary && selectedCount > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Export {selectedCount} selected
                </label>
                <p className="text-[11px] text-muted leading-relaxed">
                  Target folder on the curator host (defaults from env; edit above if needed).
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={exporting || !outputPath.trim()}
                    onClick={() => void handleExport("copy")}
                    className="flex-1 px-3 py-2 rounded-lg bg-accent-green/20 border border-accent-green/40 text-accent-green text-sm font-medium hover:bg-accent-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {exporting ? <Spinner /> : "Copy"}
                  </button>
                  <button
                    type="button"
                    disabled={exporting || !outputPath.trim()}
                    onClick={() => void handleExport("move")}
                    className="flex-1 px-3 py-2 rounded-lg bg-accent-amber/20 border border-accent-amber/40 text-accent-amber text-sm font-medium hover:bg-accent-amber/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {exporting ? <Spinner /> : "Move"}
                  </button>
                </div>
              </div>
            )}
          </aside>

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
              <EmptyState uiMode={CURATOR_UI_MODE} />
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

function EmptyState({ uiMode }: { uiMode: CuratorUiMode }) {
  const isLocal = uiMode === "local";
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-foreground/60 mb-1">
        {isLocal ? "Configure paths and scan" : "Upload a folder or zip to get started"}
      </h2>
      <p className="text-sm text-muted max-w-md">
        {isLocal
          ? "Local mode uses directories on the curator host. Set NEXT_PUBLIC_CURATOR_SOURCE_PATH and NEXT_PUBLIC_CURATOR_OUTPUT_PATH when building the frontend image so they match your Docker volume mounts."
          : "The live demo uploads into a short-lived server session. Download the optimal subset as a zip when you are done, or discard to delete server-side copies."}
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
