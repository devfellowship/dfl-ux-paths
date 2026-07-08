// GET /api/flows?repo=owner/name&path=.dfl-ux-paths/flows.json&ref=main
// GET /api/repos
//
// Ported 1:1 (ADR-3) from devfellowship/dfl-labs:functions/api/{flows,repos}.js
// (Cloudflare Pages Functions) to Express routes for the new Dokploy-hosted
// app/ (ADR-1). Same allowlist + private-repo support + discovery behavior.
import { ALLOWED_OWNER, ghHeaders, guardOwner, guardPath } from "./lib.mjs";

const CURATED = [
  { repo: "devfellowship/dfl-lesson-studio", refs: ["main"] },
  { repo: "devfellowship/dfl-learn-mobile", refs: ["main", "claude-main/plans-app-mobile-integration"] },
];
const FLOWS_PATH = ".dfl-ux-paths/flows.json";

export async function handleFlows(req, res) {
  if (!process.env.GITHUB_READ_TOKEN) {
    return res.status(500).json({ error: "server not configured: GITHUB_READ_TOKEN missing" });
  }

  const repo = String(req.query.repo || "").trim().replace(/\/+$/, "");
  const path = String(req.query.path || "").trim();
  const ref = String(req.query.ref || "main").trim() || "main";

  const slash = repo.indexOf("/");
  if (slash < 1) return res.status(400).json({ error: "repo must be 'owner/name'" });
  const owner = repo.slice(0, slash);
  const name = repo.slice(slash + 1);

  const ownerErr = guardOwner(owner);
  if (ownerErr) return res.status(ownerErr.status).json(ownerErr.body);
  const pathErr = guardPath(path);
  if (pathErr) return res.status(pathErr.status).json(pathErr.body);
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return res.status(400).json({ error: "invalid repo name" });
  if (!/^[A-Za-z0-9._/-]+$/.test(ref)) return res.status(400).json({ error: "invalid ref" });

  const normalizedPath = path.replace(/^\/+/, "");
  const ghUrl = `https://api.github.com/repos/${owner}/${name}/contents/${normalizedPath}?ref=${encodeURIComponent(ref)}`;
  const isJson = normalizedPath.endsWith(".json");

  let ghRes;
  try {
    ghRes = await fetch(ghUrl, { headers: { ...ghHeaders(), Accept: "application/vnd.github.raw" } });
  } catch (e) {
    return res.status(502).json({ error: `upstream fetch failed: ${e.message}` });
  }

  if (!ghRes.ok) {
    let detail = "";
    try {
      detail = (await ghRes.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    return res.status(ghRes.status === 404 ? 404 : 502).json({
      error: `GitHub ${ghRes.status} for ${owner}/${name}/${normalizedPath}@${ref}`,
      hint:
        ghRes.status === 404
          ? "check repo/path/ref — note some repos keep flows.json on a feature branch (pass ?ref=)."
          : undefined,
      detail: detail || undefined,
    });
  }

  const text = await ghRes.text();
  res.set("Cache-Control", "no-store");
  res.set("Content-Type", isJson ? "application/json" : "text/plain; charset=utf-8");
  res.status(200).send(text);
}

async function fileExists(repo, ref) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${FLOWS_PATH}?ref=${encodeURIComponent(ref)}`,
      { headers: { ...ghHeaders(), Accept: "application/vnd.github.raw" }, method: "HEAD" },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function handleRepos(_req, res) {
  const map = new Map();
  let source = "fallback";

  if (process.env.GITHUB_READ_TOKEN) {
    try {
      const q = "path:.dfl-ux-paths/flows.json+org:devfellowship";
      const ghRes = await fetch(`https://api.github.com/search/code?q=${q}&per_page=100`, { headers: ghHeaders() });
      if (ghRes.ok) {
        const data = await ghRes.json();
        for (const item of data.items || []) {
          const full = item.repository && item.repository.full_name;
          if (full && full.split("/")[0] === ALLOWED_OWNER && !map.has(full)) {
            map.set(full, "main");
          }
        }
        if (map.size) source = "code-search";
      }
    } catch {
      /* fall through to curated */
    }

    for (const { repo, refs } of CURATED) {
      if (map.has(repo)) continue;
      let found = null;
      for (const ref of refs) {
        if (await fileExists(repo, ref)) {
          found = ref;
          break;
        }
      }
      map.set(repo, found || refs[0]);
    }
  } else {
    for (const { repo, refs } of CURATED) map.set(repo, refs[0]);
  }

  const repos = Array.from(map.entries())
    .map(([repo, ref]) => ({ repo, ref }))
    .sort((a, b) => a.repo.localeCompare(b.repo));

  res.set("Cache-Control", "public, max-age=300");
  res.status(200).json({ repos, source });
}
