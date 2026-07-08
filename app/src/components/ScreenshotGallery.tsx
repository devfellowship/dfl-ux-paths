import type { Screenshot } from "../lib/types";

/** Multi-viewport gallery keyed by platform × orientation × viewport (ADR-3). */
export function ScreenshotGallery({ screenshots }: { screenshots?: Screenshot[] }) {
  if (!screenshots?.length) {
    return (
      <div className="text-xs italic text-white/40 border border-dashed border-white/15 rounded p-3 text-center" data-testid="shots-placeholder">
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
              className="w-full h-20 object-cover rounded border border-white/10 bg-black/30"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="text-[10px] text-white/50 mt-1 text-center">{cap}</div>
          </a>
        );
      })}
    </div>
  );
}
