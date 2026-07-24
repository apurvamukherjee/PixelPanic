import { useEffect, useState } from "react";
import {
  ClientEvents,
  type HintFrequency,
  type WordPackCreateResult,
  type ChaosModes,
} from "@pixelpanic/shared";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { fetchWordPacks, type WordPackSummary } from "../../lib/api";
import { Button } from "../shared/Button";

const HINT_OPTIONS: HintFrequency[] = ["off", "slow", "normal", "fast"];

const CHAOS_MODE_INFO: { key: keyof ChaosModes; label: string; description: string; comingSoon?: boolean }[] = [
  { key: "momentum", label: "Momentum", description: "Guess streaks ramp up your points, up to 2x." },
  { key: "bounty", label: "Bounty round", description: "One random round is worth 5x points." },
  { key: "curseWords", label: "Curse words", description: "The drawer can't see their own canvas." },
  { key: "reverseMode", label: "Reverse mode", description: "Everyone but the drawer sees the word." },
  { key: "mashup", label: "Word mashup", description: "One round combines 2 words; room votes on the best guess." },
  { key: "sabotage", label: "Sabotage powerups", description: "Guess streaks earn a powerup to prank a rival." },
  { key: "ghostDrawing", label: "Ghost drawing", description: "Coming soon — needs more game history first.", comingSoon: true },
];

const FIELD =
  "rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary";
const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-on-surface";
const SUBLABEL = "font-mono text-[11px] uppercase tracking-wide text-on-surface-variant";

export function HostSettingsPanel() {
  const room = useRoomStore((s) => s.room);
  const isHost = useRoomStore((s) => s.isHost);
  const socket = useConnectionStore((s) => s.socket);
  const [packs, setPacks] = useState<WordPackSummary[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customWords, setCustomWords] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    fetchWordPacks().then(setPacks);
  }, [room?.settings.customWordListId]);

  if (!room) return null;

  if (!isHost) {
    const activeChaos = CHAOS_MODE_INFO.filter((c) => room.settings.chaosModes[c.key]).map((c) => c.label);
    return (
      <div className="glass flex flex-col gap-1 rounded-2xl px-4 py-3 font-mono text-xs text-on-surface-variant">
        <div>
          Draw time: <span className="text-secondary">{room.settings.drawTimeSec}s</span> · Rounds:{" "}
          <span className="text-secondary">{room.settings.roundCount}</span> · Hints:{" "}
          <span className="text-secondary">{room.settings.hintFrequency}</span> · Mode:{" "}
          <span className="text-secondary">{room.settings.mode}</span>
        </div>
        {activeChaos.length > 0 && (
          <div>
            Chaos: <span className="text-tertiary">{activeChaos.join(", ")}</span>
          </div>
        )}
      </div>
    );
  }

  const update = (patch: Record<string, unknown>) => {
    socket?.emit(ClientEvents.ROOM_UPDATE_SETTINGS, patch);
  };

  const submitCustomPack = () => {
    setCustomError(null);
    const words = customWords
      .split(/[\n,]/)
      .map((w) => w.trim())
      .filter(Boolean);
    socket?.emit(
      ClientEvents.WORD_PACK_CREATE,
      { name: customName, words },
      (result: WordPackCreateResult) => {
        if (result.ok) {
          setShowCustom(false);
          setCustomWords("");
          setCustomName("");
        } else {
          setCustomError(result.error);
        }
      }
    );
  };

  return (
    <div className="glass flex flex-col gap-4 rounded-2xl p-4">
      <div className="font-display text-sm font-bold uppercase tracking-wide text-on-surface-variant">
        Host settings
      </div>

      <label className={LABEL}>
        <span className={SUBLABEL}>Mode</span>
        <select className={FIELD} value={room.settings.mode} onChange={(e) => update({ mode: e.target.value })}>
          <option value="solo">Solo</option>
          <option value="team">Team</option>
        </select>
      </label>

      <label className={LABEL}>
        <span className={SUBLABEL}>Rounds ({room.settings.roundCount})</span>
        <input
          className="accent-primary"
          type="range"
          min={1}
          max={10}
          value={room.settings.roundCount}
          onChange={(e) => update({ roundCount: Number(e.target.value) })}
        />
      </label>

      <label className={LABEL}>
        <span className={SUBLABEL}>Draw time ({room.settings.drawTimeSec}s)</span>
        <input
          className="accent-primary"
          type="range"
          min={30}
          max={180}
          step={10}
          value={room.settings.drawTimeSec}
          onChange={(e) => update({ drawTimeSec: Number(e.target.value) })}
        />
      </label>

      <label className={LABEL}>
        <span className={SUBLABEL}>Hint frequency</span>
        <select
          className={FIELD}
          value={room.settings.hintFrequency}
          onChange={(e) => update({ hintFrequency: e.target.value })}
        >
          {HINT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      <label className={LABEL}>
        <span className={SUBLABEL}>Word list</span>
        <select
          className={FIELD}
          value={room.settings.customWordListId ?? ""}
          onChange={(e) => update({ customWordListId: e.target.value || null })}
        >
          <option value="">Classic Mix (default)</option>
          {packs
            .filter((p) => !p.isBuiltIn)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className={SUBLABEL}>Chaos modes</span>
        {CHAOS_MODE_INFO.map(({ key, label, description, comingSoon }) => (
          <label
            key={key}
            className={`flex items-start gap-2.5 rounded-lg border border-white/5 bg-surface-container-high/40 px-3 py-2 ${
              comingSoon ? "opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 accent-tertiary"
              checked={room.settings.chaosModes[key]}
              disabled={comingSoon}
              onChange={(e) => update({ chaosModes: { [key]: e.target.checked } })}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-on-surface">{label}</span>
              <span className="text-xs text-on-surface-variant">{description}</span>
            </span>
          </label>
        ))}
      </div>

      {!showCustom ? (
        <Button variant="secondary" onClick={() => setShowCustom(true)}>
          + Add custom word list
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            className={FIELD}
            placeholder="Pack name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <textarea
            className={FIELD}
            rows={4}
            placeholder="comma or newline separated words (min 10)"
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value)}
          />
          {customError && <div className="text-xs text-error">{customError}</div>}
          <div className="flex gap-2">
            <Button onClick={submitCustomPack}>Save pack</Button>
            <Button variant="ghost" onClick={() => setShowCustom(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
