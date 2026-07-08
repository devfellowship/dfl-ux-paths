import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleFlows, handleRepos } from "./routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");
const PORT = process.env.PORT || 3100;

const app = express();

app.get("/api/flows", handleFlows);
app.get("/api/repos", handleRepos);
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.use(express.static(DIST_DIR));

// SPA fallback — any non-/api route serves index.html so deep-link query
// params (?repo=&path=&ref=, ?a_repo=…) work on a fresh load.
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`ux-paths app server listening on :${PORT}`);
});
