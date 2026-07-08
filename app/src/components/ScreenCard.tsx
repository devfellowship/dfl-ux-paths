import type { Screen } from "../lib/types";
import { ActionChips } from "./ActionChips";
import { ScreenshotGallery } from "./ScreenshotGallery";
import { SourceRefView } from "./SourceRefView";

export function ScreenCard({ screen }: { screen: Screen }) {
  return (
    <div
      className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2"
      data-testid="screen-card"
      data-screen-id={screen.id}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{screen.name || screen.id}</h4>
        {screen.fidelity ? (
          <span
            className="dfl-chip"
            data-testid="fidelity-badge"
            title="v1.3 forward-looking field (schema bump pending)"
          >
            {screen.fidelity}
          </span>
        ) : null}
      </div>
      <div className="text-xs text-white/50">{screen.route || screen.page_class || screen.id}</div>
      <SourceRefView sourceRef={screen.source_ref} />
      <ActionChips actions={screen.actions} />
      <ScreenshotGallery screenshots={screen.screenshots} />
    </div>
  );
}
