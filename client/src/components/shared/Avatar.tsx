interface AvatarProps {
  name: string;
  color: string;
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

export function Avatar({ name, color, size = 36, status }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`flex items-center justify-center rounded-full font-display font-semibold text-white shrink-0 border-[3px] ${
        status ? STATUS_RING[status] : "border-white/10"
      }`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
