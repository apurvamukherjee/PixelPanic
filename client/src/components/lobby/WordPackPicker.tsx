import type { ReactNode } from "react";
import type { WordPackSummary } from "../../lib/api";

// Matches RoomInstance.updateSettings' server-side clamp on wordPackIds.
const MAX_WORD_PACKS = 5;

const SUBLABEL = "text-sm font-semibold text-on-surface-variant";

interface WordPackPickerProps {
  packs: WordPackSummary[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// Multiple packs can be combined into one match — RoomManager.resolveWordPacks
// merges their word pools server-side, so this is purely a selection UI: a
// chip row for what's picked plus a checklist grid grouped built-in/custom,
// replacing the old single-choice <select>.
export function WordPackPicker({ packs, selectedIds, onChange }: WordPackPickerProps) {
  const builtIn = packs.filter((p) => p.isBuiltIn);
  const custom = packs.filter((p) => !p.isBuiltIn);
  const selectedPacks = packs.filter((p) => selectedIds.includes(p.id));
  const atCap = selectedIds.length >= MAX_WORD_PACKS;

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (!atCap) {
      onChange([...selectedIds, id]);
    }
  };

  const totalWords = selectedPacks.reduce((sum, p) => sum + p.wordCount, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={SUBLABEL}>Word packs</span>
        <span className="font-mono text-[11px] text-on-surface-variant">
          {selectedPacks.length === 0
            ? "Classic Mix (default)"
            : `${totalWords} words · ${selectedPacks.length} pack${selectedPacks.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {selectedPacks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedPacks.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="flex items-center gap-1 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary"
            >
              {p.name}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-lg border border-white/10 bg-background p-1.5">
        {packs.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-on-surface-variant">No word packs yet.</div>
        )}
        {builtIn.length > 0 && <PackGroupLabel>Built-in packs</PackGroupLabel>}
        {builtIn.map((p) => (
          <PackRow
            key={p.id}
            pack={p}
            selected={selectedIds.includes(p.id)}
            disabled={atCap && !selectedIds.includes(p.id)}
            onToggle={() => toggle(p.id)}
          />
        ))}
        {custom.length > 0 && <PackGroupLabel>Custom lists</PackGroupLabel>}
        {custom.map((p) => (
          <PackRow
            key={p.id}
            pack={p}
            selected={selectedIds.includes(p.id)}
            disabled={atCap && !selectedIds.includes(p.id)}
            onToggle={() => toggle(p.id)}
          />
        ))}
      </div>

      {atCap && (
        <div className="text-[11px] text-on-surface-variant">Max {MAX_WORD_PACKS} packs per match.</div>
      )}
    </div>
  );
}

function PackGroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pb-0.5 pt-1.5 font-mono text-[10px] uppercase tracking-wide text-on-surface-variant/70">
      {children}
    </div>
  );
}

function PackRow({
  pack,
  selected,
  disabled,
  onToggle,
}: {
  pack: WordPackSummary;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        selected ? "bg-secondary/10" : "hover:bg-white/5"
      } ${disabled ? "opacity-40" : "cursor-pointer"}`}
    >
      <input type="checkbox" className="accent-secondary" checked={selected} disabled={disabled} onChange={onToggle} />
      <span className="flex-1 text-on-surface">{pack.name}</span>
      <span className="font-mono text-[11px] text-on-surface-variant">{pack.wordCount}</span>
    </label>
  );
}
