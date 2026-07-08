// Shared helpers for the /api/flows + /api/repos proxy routes.
// Ported 1:1 (ADR-3) from devfellowship/dfl-labs:functions/api/_lib.js
// (Cloudflare Pages Functions) to a plain Express route, same security
// guards. SECURITY: the GitHub token (process.env.GITHUB_READ_TOKEN) NEVER
// reaches the browser — used server-side only. All routes enforce a strict
// owner + path allowlist to bound the token's blast radius.

export const ALLOWED_OWNER = "devfellowship";

// Validate owner == devfellowship. Returns an error object, or null if ok.
export function guardOwner(owner) {
  if (owner !== ALLOWED_OWNER) {
    return { status: 400, body: { error: `owner must be '${ALLOWED_OWNER}' (got '${owner}')` } };
  }
  return null;
}

// Validate the flows path: must live under .dfl-ux-paths/ and end .json or .mmd.
// Blocks path traversal and arbitrary-file reads.
export function guardPath(path) {
  if (!path) return { status: 400, body: { error: "path is required" } };
  if (path.includes("..") || path.includes("\\")) {
    return { status: 400, body: { error: "path may not contain '..' or backslashes" } };
  }
  const normalized = path.replace(/^\/+/, "");
  if (!normalized.startsWith(".dfl-ux-paths/")) {
    return { status: 400, body: { error: "path must start with '.dfl-ux-paths/'" } };
  }
  if (!/\.(json|mmd)$/.test(normalized)) {
    return { status: 400, body: { error: "path must end in .json or .mmd" } };
  }
  return null;
}

export function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_READ_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "dfl-ux-paths-app",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
