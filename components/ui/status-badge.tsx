import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompatibilityStatus } from "@/types/domain";

const statusConfig = {
  compatible: { label: "Compatível", Icon: CheckCircle2, style: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  warning: { label: "Atenção", Icon: AlertTriangle, style: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  incompatible: { label: "Incompatível", Icon: XCircle, style: "border-rose-400/30 bg-rose-400/10 text-rose-300" }
};

export function StatusBadge({ status, className }: { status: CompatibilityStatus; className?: string }) {
  const { label, Icon, style } = statusConfig[status];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", style, className)}><Icon size={14} />{label}</span>;
}
