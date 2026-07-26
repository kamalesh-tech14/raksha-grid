export type RiskLevel = "flood" | "rain" | "heat";

const levelColor: Record<RiskLevel, string> = {
  flood: "text-warn-amber",
  rain: "text-accent-cyan",
  heat: "text-success-green",
};

const barColor: Record<RiskLevel, string> = {
  flood: "bg-warn-amber",
  rain: "bg-accent-cyan",
  heat: "bg-success-green",
};

interface RiskCardProps {
  level: RiskLevel;
  label: string;
  /** 0-100. Demonstration data only — never present as an official prediction. */
  probabilityPct: number;
}

export default function RiskCard({ level, label, probabilityPct }: RiskCardProps) {
  const pct = Math.max(0, Math.min(100, probabilityPct));

  return (
    <div className="min-w-[104px] flex-shrink-0 rounded-card border border-border-hairline bg-bg-surface p-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className={`mt-1.5 font-display text-[22px] font-bold ${levelColor[level]}`}>
        {pct}%
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-border-hairline">
        <span
          className={`block h-full ${barColor[level]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
