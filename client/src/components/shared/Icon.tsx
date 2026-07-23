interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

// Thin wrapper around the Material Symbols Outlined webfont (loaded in
// index.html) so icon usage is `<Icon name="settings" />` everywhere instead
// of repeating the raw span + font-variation-settings.
export function Icon({ name, className = "", filled = false }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
