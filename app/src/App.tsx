import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, Alert, AlertDescription, Button } from "@devfellowship/components";
import type { FlowsJson } from "./lib/types";
import { fetchFlows, FlowsFetchError, defaultPathFor, defaultRefFor, type RepoRef } from "./lib/api";
import { parseDeepLink, buildDeepLink, type ModeName } from "./lib/deeplink";
import { RepoPicker, type RepoPickerValue } from "./components/RepoPicker";
import { ExplorarAtlas } from "./modes/ExplorarAtlas";
import { CompararRevisao } from "./modes/CompararRevisao";
import { RequisitosFluxo } from "./modes/RequisitosFluxo";
import { RoteiroPresent } from "./modes/RoteiroPresent";

const DEMO_SINGLE: RepoRef = { repo: "demo/lesson-studio-web", path: "lesson-studio-web.flows.json", ref: "fixture" };
const DEMO_A: RepoRef = { repo: "demo/lesson-studio-web", path: "lesson-studio-web.flows.json", ref: "fixture" };
const DEMO_B: RepoRef = { repo: "demo/learn-mobile-studio", path: "learn-mobile-studio.flows.json", ref: "fixture" };

const TABS: { id: ModeName; label: string }[] = [
  { id: "explorar", label: "Explorar (Atlas)" },
  { id: "comparar", label: "Comparar (Revisão)" },
  { id: "requisitos", label: "Requisitos→Fluxo" },
  { id: "roteiro", label: "Roteiro" },
];

type LoadState<T> = { status: "idle" | "loading" | "error" | "ok"; error?: string; data?: T };

/** DS Alert (danger) + Retry — replaces the ad-hoc red error boxes. */
function ErrorPanel({ message, onRetry, testId }: { message: string; onRetry: () => void; testId: string }) {
  return (
    <Alert variant="danger" className="flex items-start gap-3">
      <AlertDescription className="flex-1 text-sm" data-testid={testId}>
        {message}
      </AlertDescription>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry} data-testid={`${testId.replace("-error", "")}-retry`}>
        Retry
      </Button>
    </Alert>
  );
}

export default function App() {
  const initial = useMemo(() => parseDeepLink(location.search), []);
  const [mode, setMode] = useState<ModeName>(initial.mode || (initial.compareA ? "comparar" : "explorar"));

  // Fix (P0, 2026-07-08): default `path`/`ref` per-repo via defaultPathFor/
  // defaultRefFor (see lib/api.ts) instead of a single hardcoded
  // ".dfl-ux-paths/flows.json" — that constant is wrong for the bundled demo
  // repos (each has its own fixture filename) and was the root cause of
  // Comparar's "SyntaxError: Unexpected token '<'" (a demo repo 404s on that
  // path, Express's SPA catch-all serves index.html, client JSON.parses HTML).
  const [singleTarget, setSingleTarget] = useState<RepoPickerValue>(() => {
    const repo = initial.single?.repo || DEMO_SINGLE.repo;
    return {
      repo,
      path: initial.single?.path || defaultPathFor(repo),
      ref: initial.single?.ref || defaultRefFor(repo),
    };
  });
  const [singleState, setSingleState] = useState<LoadState<FlowsJson>>({ status: "idle" });

  const [aTarget, setATarget] = useState<RepoPickerValue>(() => {
    const repo = initial.compareA?.repo || DEMO_A.repo;
    return {
      repo,
      path: initial.compareA?.path || defaultPathFor(repo),
      ref: initial.compareA?.ref || defaultRefFor(repo),
    };
  });
  const [bTarget, setBTarget] = useState<RepoPickerValue>(() => {
    const repo = initial.compareB?.repo || DEMO_B.repo;
    return {
      repo,
      path: initial.compareB?.path || defaultPathFor(repo),
      ref: initial.compareB?.ref || defaultRefFor(repo),
    };
  });
  const [compareState, setCompareState] = useState<LoadState<[FlowsJson, FlowsJson]>>({ status: "idle" });

  const loadSingle = useCallback(async (target: RepoRef) => {
    setSingleState({ status: "loading" });
    try {
      const data = await fetchFlows(target);
      setSingleState({ status: "ok", data });
    } catch (e) {
      setSingleState({ status: "error", error: e instanceof FlowsFetchError ? e.message : String(e) });
    }
  }, []);

  const loadCompare = useCallback(async (a: RepoRef, b: RepoRef) => {
    setCompareState({ status: "loading" });
    try {
      const [da, db] = await Promise.all([fetchFlows(a), fetchFlows(b)]);
      setCompareState({ status: "ok", data: [da, db] });
    } catch (e) {
      setCompareState({ status: "error", error: e instanceof FlowsFetchError ? e.message : String(e) });
    }
  }, []);

  // Boot: honor deep-link params if present, else load demo data so the page
  // is never blank (parity with a1f3 legacy boot behavior).
  useEffect(() => {
    if (initial.compareA && initial.compareB) {
      loadCompare(initial.compareA, initial.compareB);
    } else if (initial.single) {
      loadSingle(initial.single);
    } else {
      loadSingle(DEMO_SINGLE);
      loadCompare(DEMO_A, DEMO_B);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const qs = buildDeepLink({
      mode,
      single: mode === "explorar" || mode === "requisitos" || mode === "roteiro" ? singleTarget : null,
      compareA: mode === "comparar" ? aTarget : null,
      compareB: mode === "comparar" ? bTarget : null,
    });
    history.replaceState(null, "", qs || location.pathname);
  }, [mode, singleTarget, aTarget, bTarget]);

  return (
    <div className="w-full overflow-x-clip px-4 py-4 sm:px-6 lg:px-8">
      <header className="mb-4 flex items-baseline gap-2">
        <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">ux-paths</h1>
        <span className="text-sm font-normal text-muted-foreground">caminhos de UX</span>
      </header>

      <Tabs value={mode} onValueChange={(v) => setMode(v as ModeName)} className="mb-4">
        {/* max-w-full + overflow-x-auto so the 4-tab bar scrolls WITHIN itself
            on narrow screens instead of forcing horizontal page scroll (mobile
            docScrollW overflow, found via Playwright). */}
        <TabsList data-testid="mode-tabs" className="w-full max-w-full justify-start overflow-x-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} data-testid={`tab-${t.id}`} className="shrink-0">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {mode === "comparar" ? (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <RepoPicker idPrefix="a" value={aTarget} onChange={setATarget} onSubmit={() => loadCompare(aTarget, bTarget)} />
            <RepoPicker idPrefix="b" value={bTarget} onChange={setBTarget} onSubmit={() => loadCompare(aTarget, bTarget)} />
          </div>
          {compareState.status === "loading" && (
            <p className="text-sm text-muted-foreground" data-testid="compare-status-loading">
              Loading both sides…
            </p>
          )}
          {compareState.status === "error" && (
            <ErrorPanel message={compareState.error!} onRetry={() => loadCompare(aTarget, bTarget)} testId="compare-status-error" />
          )}
          {compareState.status === "ok" && compareState.data && (
            <CompararRevisao a={compareState.data[0]} b={compareState.data[1]} />
          )}
        </section>
      ) : (
        <section>
          <div className="mb-4">
            <RepoPicker idPrefix="s" value={singleTarget} onChange={setSingleTarget} onSubmit={() => loadSingle(singleTarget)} />
          </div>
          {singleState.status === "loading" && (
            <p className="text-sm text-muted-foreground" data-testid="single-status-loading">
              Loading…
            </p>
          )}
          {singleState.status === "error" && (
            <ErrorPanel message={singleState.error!} onRetry={() => loadSingle(singleTarget)} testId="single-status-error" />
          )}
          {singleState.status === "ok" && singleState.data && (
            <>
              {mode === "explorar" && <ExplorarAtlas data={singleState.data} />}
              {mode === "requisitos" && <RequisitosFluxo data={singleState.data} />}
              {mode === "roteiro" && <RoteiroPresent data={singleState.data} />}
            </>
          )}
        </section>
      )}
    </div>
  );
}
