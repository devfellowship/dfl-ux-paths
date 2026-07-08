import type { Action } from "../lib/types";

export function ActionChips({ actions }: { actions?: Action[] }) {
  if (!actions?.length) return null;
  return (
    <div className="flex flex-wrap" data-testid="action-chips">
      {actions.map((a) => (
        <span key={a.id} className="dfl-chip" title={a.side_effect} data-testid="action-chip">
          {a.label || a.id}
          {a.next_screen ? ` → ${a.next_screen}` : ""}
        </span>
      ))}
    </div>
  );
}
