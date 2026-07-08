import { useCallback, useEffect, useMemo, useState } from "react";
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
    <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
      <header className="mb-4">
        <h1 className="text-xl font-bold">
          ux-paths <span className="text-white/40 font-normal text-sm">caminhos de UX</span>
        </h1>
      </header>

      <nav className="flex gap-1 mb-4 border-b border-white/10" data-testid="mode-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`tab-${t.id}`}
            onClick={() => setMode(t.id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              mode === t.id ? "border-[#C52614] text-white" : "border-transparent text-white/50 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {mode === "comparar" ? (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <RepoPicker idPrefix="a" value={aTarget} onChange={setATarget} onSubmit={() => loadCompare(aTarget, bTarget)} />
            <RepoPicker idPrefix="b" value={bTarget} onChange={setBTarget} onSubmit={() => loadCompare(aTarget, bTarget)} />
          </div>
          {compareState.status === "loading" && <p data-testid="compare-status-loading">Loading both sides…</p>}
          {compareState.status === "error" && (
            <div className="flex items-start gap-3 rounded border border-red-400/30 bg-red-950/30 p-3">
              <p className="text-red-400 text-sm flex-1" data-testid="compare-status-error">
                {compareState.error}
              </p>
              <button
                type="button"
                data-testid="compare-status-retry"
                onClick={() => loadCompare(aTarget, bTarget)}
                className="shrink-0 bg-white/10 hover:bg-white/20 text-white text-xs rounded px-3 py-1.5"
              >
                Retry
              </button>
            </div>
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
          {singleState.status === "loading" && <p data-testid="single-status-loading">Loading…</p>}
          {singleState.status === "error" && (
            <div className="flex items-start gap-3 rounded border border-red-400/30 bg-red-950/30 p-3">
              <p className="text-red-400 text-sm flex-1" data-testid="single-status-error">
                {singleState.error}
              </p>
              <button
                type="button"
                data-testid="single-status-retry"
                onClick={() => loadSingle(singleTarget)}
                className="shrink-0 bg-white/10 hover:bg-white/20 text-white text-xs rounded px-3 py-1.5"
              >
                Retry
              </button>
            </div>
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
