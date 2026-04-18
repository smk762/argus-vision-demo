import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load repo-root `.env` (this file lives in `frontend/`).
loadEnvConfig(path.join(__dirname, ".."));

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
