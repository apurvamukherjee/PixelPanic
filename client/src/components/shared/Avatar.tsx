import { getAvatarPreset } from "../../lib/avatarPresets";
import { Icon } from "./Icon";

interface AvatarProps {
  name: string;
  color: string;
  avatarId?: string | null;
  size?: number;
  // Border color follows the design system's status convention: purple
  // while drawing, cyan while active/guessing, gray otherwise.
  status?: "drawing" | "active" | "idle";
}

const STATUS_RING: Record<NonNullable<AvatarProps["status"]>, string> = {
  drawing: "border-primary shadow-[0_0_12px_rgba(221,183,255,0.4)]",
  active: "border-secondary",
  idle: "border-outline/60",
};

export function Avatar({ name, color, avatarId, size = 36, status }: AvatarProps) {
  const preset = getAvatarPreset(avatarId);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`flex items-center justify-center rounded-full font-display font-semibold text-white shrink-0 border-[3px] ${
        status ? STATUS_RING[status] : "border-white/10"
      }`}
      style={{ width: size, height: size, backgroundColor: preset?.bg ?? color, fontSize: size * 0.4 }}
    >
      {preset ? <Icon name={preset.icon} className="!text-base" style={{ fontSize: size * 0.55 }} /> : initial}
    </div>
  );
}
