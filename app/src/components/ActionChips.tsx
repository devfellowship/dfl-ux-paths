import { Badge } from "@devfellowship/components";
import type { Action } from "../lib/types";

export function ActionChips({ actions }: { actions?: Action[] }) {
  if (!actions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="action-chips">
      {actions.map((a) => (
        <Badge key={a.id} variant="outline" title={a.side_effect} data-testid="action-chip" className="font-mono font-normal">
          {a.label || a.id}
          {a.next_screen ? <span className="ml-1 text-muted-foreground">→ {a.next_screen}</span> : null}
        </Badge>
      ))}
    </div>
  );
}
