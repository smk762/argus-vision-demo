/** Curator SPA layout: `demo` = browser upload (public live demo). `local` = mounted paths on the API host. */
export type CuratorUiMode = "demo" | "local";

const raw = (process.env.NEXT_PUBLIC_CURATOR_UI_MODE ?? "demo").toLowerCase();

export const CURATOR_UI_MODE: CuratorUiMode =
  raw === "local" ? "local" : "demo";

/** Scan input directory as seen by argus-curator (container path when using Docker volumes). */
export const LOCAL_SOURCE_PATH = process.env.NEXT_PUBLIC_CURATOR_SOURCE_PATH ?? "";

/** Export target directory on the curator host. */
export const LOCAL_OUTPUT_PATH = process.env.NEXT_PUBLIC_CURATOR_OUTPUT_PATH ?? "";
