import { useEffect, useState } from "react";
import {
  Label,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@devfellowship/components";
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

  const knownRepo = repos.some((r) => r.repo === value.repo);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      data-testid={`${idPrefix}-form`}
    >
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">repo</Label>
        <Select
          value={value.repo}
          onValueChange={(repo) => {
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
          <SelectTrigger data-testid={`${idPrefix}-repo`} className="min-w-[220px] font-mono text-sm">
            <SelectValue placeholder="select repo" />
          </SelectTrigger>
          <SelectContent>
            {!knownRepo && value.repo ? <SelectItem value={value.repo}>{value.repo}</SelectItem> : null}
            {repos.map((r) => (
              <SelectItem key={r.repo} value={r.repo}>
                {r.repo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor={`${idPrefix}-path`} className="text-xs text-muted-foreground">
          path
        </Label>
        <Input
          id={`${idPrefix}-path`}
          data-testid={`${idPrefix}-path`}
          className="font-mono text-sm"
          value={value.path}
          onChange={(e) => onChange({ ...value, path: e.target.value })}
        />
      </div>
      <Button type="submit" size="sm" data-testid={`${idPrefix}-load`}>
        Load
      </Button>
    </form>
  );
}
