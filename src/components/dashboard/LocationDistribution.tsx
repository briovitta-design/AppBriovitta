import { Building2, Home } from "lucide-react";

export function LocationDistribution({ clinica, homeCare }: { clinica: number; homeCare: number }) {
  const total = clinica + homeCare;
  const pctClinica = total > 0 ? Math.round((clinica / total) * 100) : 0;
  const pctHomeCare = total > 0 ? 100 - pctClinica : 0;

  return (
    <div className="space-y-5">
      <div className="flex h-3 overflow-hidden rounded-full bg-bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pctClinica}%` }} />
        <div className="h-full bg-support transition-all" style={{ width: `${pctHomeCare}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-text-main">
              {clinica} <span className="text-xs font-normal text-text-secondary">({pctClinica}%)</span>
            </p>
            <p className="text-xs text-text-secondary">Clínica</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-support text-support-foreground">
            <Home className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-text-main">
              {homeCare} <span className="text-xs font-normal text-text-secondary">({pctHomeCare}%)</span>
            </p>
            <p className="text-xs text-text-secondary">Home Care</p>
          </div>
        </div>
      </div>
    </div>
  );
}
