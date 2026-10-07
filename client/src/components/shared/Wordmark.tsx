interface WordmarkProps {
  size?: "sm" | "lg";
}

// Hand-lettered logotype. The large version gets a chalk underline that
// draws itself once — the one flourish on the home screen.
export function Wordmark({ size = "sm" }: WordmarkProps) {
  const letters = (
    <>
      pixel<span className="text-primary">panic</span>
    </>
  );
  if (size === "sm") {
    return <span className="hand text-lg font-extrabold lowercase leading-none text-on-surface">{letters}</span>;
  }
  return (
    <div className="relative inline-block -rotate-2 pb-3">
      <h1 className="hand text-6xl font-extrabold lowercase leading-none text-on-surface sm:text-7xl">
        {letters}
      </h1>
      <svg
        viewBox="0 0 300 24"
        preserveAspectRatio="none"
        className="absolute -bottom-1 left-0 h-4 w-full"
        aria-hidden="true"
      >
        <path
          d="M4 15 C 60 5, 120 22, 182 11 S 268 6, 296 15"
          pathLength={1}
          className="scribble-draw"
          fill="none"
          stroke="#f7cb46"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
