import { useTournamentStore } from "../../store/useTournamentStore";
import { Icon } from "../shared/Icon";

export function TournamentStandingsScreen() {
  const tournament = useTournamentStore((s) => s.tournament);
  if (!tournament) return null;

  const nameOf = (anonId: string) =>
    tournament.standings.find((s) => s.anonId === anonId)?.name ?? "Player";
  const currentMatch = tournament.matches.find((m) => m.id === tournament.currentMatchId);

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col gap-4 p-4">
      <h1 className="text-center font-display text-2xl font-extrabold uppercase tracking-tight text-primary">
        {tournament.isComplete ? "Tournament complete" : "Tournament standings"}
      </h1>

      {!tournament.isComplete && currentMatch && (
        <div className="glass flex items-center justify-center gap-2 rounded-xl border border-primary/30 px-4 py-3 text-center text-sm">
          <Icon name="bolt" className="!text-base text-primary" />
          Now playing: <strong className="text-on-surface">{nameOf(currentMatch.playerAnonIds[0])}</strong> vs{" "}
          <strong className="text-on-surface">{nameOf(currentMatch.playerAnonIds[1])}</strong>
        </div>
      )}

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-surface-container-low text-left font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3 text-right">W</th>
              <th className="px-4 py-3 text-right">L</th>
              <th className="px-4 py-3 text-right">T</th>
              <th className="px-4 py-3 text-right">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tournament.standings.map((row, i) => (
              <tr key={row.anonId} className="transition-colors hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-on-surface-variant">{i + 1}</td>
                <td className="px-4 py-3 font-display font-medium text-on-surface">{row.name}</td>
                <td className="px-4 py-3 text-right font-mono text-secondary">{row.wins}</td>
                <td className="px-4 py-3 text-right font-mono text-on-surface-variant">{row.losses}</td>
                <td className="px-4 py-3 text-right font-mono text-on-surface-variant">{row.ties}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {row.pointDiff > 0 ? "+" : ""}
                  {row.pointDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center font-mono text-xs text-on-surface-variant">
        {tournament.matches.filter((m) => m.status === "complete").length} / {tournament.matches.length}{" "}
        matches played
      </div>
    </div>
  );
}
