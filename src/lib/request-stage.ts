import { Clock, FileText, Send, ShieldCheck } from "lucide-react";

/** Hatua nne za ombi, kama zinavyoonyeshwa kwa viongozi na wanafunzi. */
export const STAGE_STEPS = [
  { key: "pending", labelKey: "mw.stage_received", icon: Clock },
  { key: "reviewing", labelKey: "mw.stage_review", icon: FileText },
  { key: "forwarded", labelKey: "mw.stage_forwarded", icon: Send },
  { key: "approved", labelKey: "mw.stage_done", icon: ShieldCheck },
] as const;

/** Hurudisha nafasi ya hali kwenye hatua nne (0–3). */
export function stageIndex(status: string): number {
  switch (status) {
    case "approved":
    case "completed":
      return 3;
    case "forwarded":
      return 2;
    case "reviewing":
    case "needs_correction":
      return 1;
    default:
      return 0;
  }
}

const STATUS_TONE: Record<string, string> = {
  pending: "mw-badge-pending",
  reviewing: "mw-badge-forwarded",
  needs_correction: "mw-badge-fix",
  forwarded: "mw-badge-forwarded",
  approved: "mw-badge-approved",
  completed: "mw-badge-approved",
  rejected: "mw-badge-rejected",
};

export function statusTone(status: string): string {
  return STATUS_TONE[status] ?? "mw-badge-pending";
}

const KIND_LABEL: Record<string, string> = {
  mikopo: "mw.kind_mikopo",
  changamoto: "mw.kind_changamoto",
  idara: "mw.kind_idara",
  misiba: "mw.kind_misiba",
  mengine: "mw.kind_mengine",
};

export function kindLabel(kind: string, t: (k: string) => string): string {
  return t(KIND_LABEL[kind] ?? "mw.kind_mengine");
}

export const APPROVAL_KINDS = ["mikopo", "changamoto", "idara", "misiba", "mengine"] as const;
