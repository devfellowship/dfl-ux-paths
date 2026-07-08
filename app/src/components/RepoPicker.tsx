import { useEffect, useState } from "react";
import { fetchRepos, defaultPathFor, defaultRefFor, type RepoOption } from "../lib/api";

export interface RepoPickerValue {
  repo: string;
  path: string;
  ref: string;
}

export function RepoPicker({
  idPrefix,
  value,
  onChange,
  onSubmit,
}: {
  idPrefix: string;
  value: RepoPickerValue;
  onChange: (v: RepoPickerValue) => void;
  onSubmit: () => void;
}) {
  const [repos, setRepos] = useState<RepoOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchRepos().then((r) => {
      if (!cancelled) setRepos(r.repos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      data-testid={`${idPrefix}-form`}
    >
      <label className="flex flex-col text-xs gap-1">
        repo
        <select
          data-testid={`${idPrefix}-repo`}
          className="bg-black/40 border border-white/15 rounded px-2 py-1 text-sm min-w-[220px]"
          value={value.repo}
          onChange={(e) => {
            const repo = e.target.value;
            const opt = repos.find((r) => r.repo === repo);
            // Snap `path`/`ref` to sane defaults for the newly-selected repo
            // (fix, 2026-07-08): leaving a stale path from the previously
            // selected repo is what caused Comparar's
            // "SyntaxError: Unexpected token '<'" — a demo repo's fixture
            // 404s under a real-repo path and the SPA catch-all serves HTML
            // instead. See lib/api.ts DEMO_FIXTURE_PATHS for the full story.
            onChange({ ...value, repo, path: defaultPathFor(repo), ref: opt?.ref || defaultRefFor(repo) });
          }}
        >
          {!repos.find((r) => r.repo === value.repo) && value.repo ? (
            <option value={value.repo}>{value.repo}</option>
          ) : null}
          {repos.map((r) => (
            <option key={r.repo} value={r.repo}>
              {r.repo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs gap-1 flex-1">
        path
        <input
          data-testid={`${idPrefix}-path`}
          className="bg-black/40 border border-white/15 rounded px-2 py-1 text-sm"
          value={value.path}
          onChange={(e) => onChange({ ...value, path: e.target.value })}
        />
      </label>
      <button
        type="submit"
        className="bg-[#C52614] hover:bg-[#a81f10] text-white text-sm rounded px-3 py-1.5"
        data-testid={`${idPrefix}-load`}
      >
        Load
      </button>
    </form>
  );
}
