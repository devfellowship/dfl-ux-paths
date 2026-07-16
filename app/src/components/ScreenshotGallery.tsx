import type { Screenshot } from "../lib/types";

/** Multi-viewport gallery keyed by platform × orientation × viewport (ADR-3). */
export function ScreenshotGallery({ screenshots }: { screenshots?: Screenshot[] }) {
  if (!screenshots?.length) {
    return (
      <div
        className="rounded-md border border-dashed border-border p-3 text-center text-xs italic text-muted-foreground"
        data-testid="shots-placeholder"
      >
        no screenshot
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2" data-testid="shots-gallery">
      {screenshots.map((sh, i) => {
        const cap = `${sh.platform} · ${sh.orientation}${sh.viewport ? ` · ${sh.viewport}` : ""}`;
        return (
          <a
            key={`${sh.platform}-${sh.orientation}-${sh.viewport ?? i}`}
            href={sh.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-28"
            data-testid="shot"
          >
            <img
              loading="lazy"
              src={sh.url}
              alt={cap}
              className="h-20 w-full rounded-md border border-border bg-muted object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="mt-1 text-center text-[10px] text-muted-foreground">{cap}</div>
          </a>
        );
      })}
    </div>
  );
}
