import { AVATAR_PRESETS } from "../../lib/avatarPresets";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

interface AvatarPickerProps {
  avatarId: string | null;
  onChange: (avatarId: string) => void;
  name: string;
}

// Curated preset picker: left/right arrows cycle, dice randomizes — the v1
// scope from PHASE3-PLAN.md (complete presets, not independently-composable
// layers). Falls back to index 0 if the stored id doesn't match a known
// preset (e.g. the preset list changes later).
export function AvatarPicker({ avatarId, onChange, name }: AvatarPickerProps) {
  const currentIndex = Math.max(
    0,
    AVATAR_PRESETS.findIndex((p) => p.id === avatarId)
  );

  const cycle = (delta: number) => {
    const next = (currentIndex + delta + AVATAR_PRESETS.length) % AVATAR_PRESETS.length;
    onChange(AVATAR_PRESETS[next]!.id);
  };

  const randomize = () => {
    const next = Math.floor(Math.random() * AVATAR_PRESETS.length);
    onChange(AVATAR_PRESETS[next]!.id);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => cycle(-1)}
        aria-label="Previous avatar"
        className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-primary"
      >
        <Icon name="chevron_left" />
      </button>

      <Avatar name={name || "?"} color="#8b5cf6" avatarId={avatarId ?? AVATAR_PRESETS[0]!.id} size={56} />

      <button
        type="button"
        onClick={() => cycle(1)}
        aria-label="Next avatar"
        className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-primary"
      >
        <Icon name="chevron_right" />
      </button>

      <button
        type="button"
        onClick={randomize}
        title="Randomize"
        className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-secondary"
      >
        <Icon name="casino" />
      </button>
    </div>
  );
}
