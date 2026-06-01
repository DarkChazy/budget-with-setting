// Self-hosted Node target — Cloudflare Workers preset disabled.
// The Lovable wrapper still provides tanstackStart + react + tailwind + tsconfigPaths
// + VITE_* env injection, but we disable the cloudflare plugin so pg / argon2 work.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
});
