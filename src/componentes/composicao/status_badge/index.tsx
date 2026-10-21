import Badge, { type BadgeVariant } from "#/componentes/ux/badge";

export type StatusType =
  | "NOVO"
  | "CONTATADO"
  | "QUALIFICADO"
  | "PROPOSTA_ENVIADA"
  | "NEGOCIANDO"
  | "FECHADO_GANHO"
  | "FECHADO_PERDIDO"
  | "EM_ANDAMENTO"
  | "PAUSADO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "PENDENTE"
  | "PAGO"
  | "ATRASADO";

interface StatusBadgeProps {
  status: StatusType | string;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  // Leads
  NOVO: { label: "Novo Lead", variant: "blue" },
  CONTATADO: { label: "Contatado", variant: "zinc" },
  QUALIFICADO: { label: "Qualificado", variant: "indigo" },
  PROPOSTA_ENVIADA: { label: "Proposta Enviada", variant: "amber" },
  NEGOCIANDO: { label: "Negociação", variant: "amber" },
  FECHADO_GANHO: { label: "Convertido", variant: "emerald" },
  FECHADO_PERDIDO: { label: "Perdido", variant: "rose" },

  // Projetos
  EM_ANDAMENTO: { label: "Em Andamento", variant: "blue" },
  PAUSADO: { label: "Pausado", variant: "amber" },
  CONCLUIDO: { label: "Concluído", variant: "emerald" },
  CANCELADO: { label: "Cancelado", variant: "rose" },

  // Financeiro / Parcelas
  PENDENTE: { label: "A Vencer", variant: "zinc" },
  PAGO: { label: "Pago", variant: "emerald" },
  ATRASADO: { label: "Atrasado", variant: "rose" },
};

export default function StatusBadge({ status, size = "sm", className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "zinc" };

  return (
    <Badge variant={config.variant} size={size} className={className}>
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1 ${
          config.variant === "emerald"
            ? "bg-emerald-500"
            : config.variant === "rose"
              ? "bg-rose-500"
              : config.variant === "amber"
                ? "bg-amber-500"
                : config.variant === "blue" || config.variant === "indigo"
                  ? "bg-indigo-400"
                  : "bg-slate-400"
        }`}
      />
      {config.label}
    </Badge>
  );
}
