"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatarMoeda } from "@/lib/format";

interface PontoSerie {
  mes: string;
  faturado: number;
  recebido: number;
}

export function RevenueChart({ dados }: { dados: PontoSerie[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="corFaturado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="corRecebido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="mes"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
        />
        <Tooltip
          formatter={(value: number, nome: string) => [
            formatarMoeda(value),
            nome === "faturado" ? "Faturado" : "Recebido",
          ]}
          labelStyle={{ color: "var(--color-text-main)", fontWeight: 600 }}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-popover)",
          }}
        />
        <Area
          type="monotone"
          dataKey="faturado"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#corFaturado)"
        />
        <Area
          type="monotone"
          dataKey="recebido"
          stroke="var(--color-success)"
          strokeWidth={2}
          fill="url(#corRecebido)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
