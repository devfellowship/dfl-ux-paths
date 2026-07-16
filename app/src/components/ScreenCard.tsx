import { Card, CardContent, Badge } from "@devfellowship/components";
import type { Screen } from "../lib/types";
import { ActionChips } from "./ActionChips";
import { ScreenshotGallery } from "./ScreenshotGallery";
import { SourceRefView } from "./SourceRefView";

export function ScreenCard({ screen }: { screen: Screen }) {
  return (
    <Card data-testid="screen-card" data-screen-id={screen.id}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">{screen.name || screen.id}</h4>
          {screen.fidelity ? (
            <Badge
              variant="outline"
              data-testid="fidelity-badge"
              title="v1.3 forward-looking field (schema bump pending)"
            >
              {screen.fidelity}
            </Badge>
          ) : null}
        </div>
        <div className="font-mono text-xs text-muted-foreground">{screen.route || screen.page_class || screen.id}</div>
        <SourceRefView sourceRef={screen.source_ref} />
        <ActionChips actions={screen.actions} />
        <ScreenshotGallery screenshots={screen.screenshots} />
      </CardContent>
    </Card>
  );
}
