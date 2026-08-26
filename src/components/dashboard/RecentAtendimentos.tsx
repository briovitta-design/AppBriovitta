import Link from "next/link";
import { Building2, Home, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarMoeda, formatarDataHora } from "@/lib/format";

interface AtendimentoRecente {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  dataHora: string;
  local: "clinica" | "home_care";
  valor: number;
  statusPagamento: "pago" | "pendente";
}

export function RecentAtendimentos({ itens }: { itens: AtendimentoRecente[] }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhum atendimento ainda"
        description="Assim que um atendimento for registrado, ele aparece aqui."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {itens.map((a) => (
        <li key={a.id}>
          <Link
            href={`/pacientes/${a.pacienteId}`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0 hover:opacity-80"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-text-secondary">
                {a.local === "clinica" ? <Building2 className="h-4 w-4" /> : <Home className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-text-main">{a.pacienteNome}</p>
                <p className="text-xs text-text-secondary">{formatarDataHora(a.dataHora)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-main">{formatarMoeda(a.valor)}</span>
              <Badge variant={a.statusPagamento === "pago" ? "success" : "warning"}>
                {a.statusPagamento === "pago" ? "Pago" : "Pendente"}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
