export interface Tenant {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  building: string;
  unit: string;
  rep: string;
  monthlyRent: number;
  utilitiesFee: number;
  securityDeposit: number;
  nnnFee: number;
  cleaningFee: number;
  camFee: number;
  nnFee: number;
  leaseStart: string | null;
  leaseEnd: string | null;
  renewalDate: string | null;
  leaseAlertDays: number | null; // 90 | 60 | 30 | null
  escalationPct: number;
  escalationDate: string | null;
  status: "active" | "pending" | "expired";
  notes: string;
  sourceLeadId: string;
  createdAt: string;
  leaseDocuments?: string;
  secDepReceived?: boolean;
  secDepDate?: string | null;
  secDepStatus?: string;
  secDepNotes?: string;
}

export function rowToTenant(r: Record<string, unknown>): Tenant {
  return {
    id: r.id as string,
    name: r.name as string,
    contactName: (r.contact_name as string) || "",
    email: (r.email as string) || "",
    phone: (r.phone as string) || "",
    building: (r.building as string) || "",
    unit: (r.unit as string) || "",
    rep: (r.rep as string) || "",
    monthlyRent: Number(r.monthly_rent) || 0,
    utilitiesFee: Number(r.utilities_fee) || 0,
    securityDeposit: Number(r.security_deposit) || 0,
    nnnFee: Number(r.nnn_fee) || 0,
    cleaningFee: Number(r.cleaning_fee) || 0,
    camFee: Number(r.cam_fee) || 0,
    nnFee: Number(r.nn_fee) || 0,
    leaseStart: (r.lease_start as string) || null,
    leaseEnd: (r.lease_end as string) || null,
    renewalDate: (r.renewal_date as string) || null,
    leaseAlertDays:
      r.lease_alert_days !== undefined && r.lease_alert_days !== null
        ? Number(r.lease_alert_days)
        : 90,
    escalationPct: Number(r.escalation_pct) || 0,
    escalationDate: (r.escalation_date as string) || null,
    status: (r.status as "active" | "pending" | "expired") || "active",
    notes: (r.notes as string) || "",
    sourceLeadId: (r.source_lead_id as string) || "",
    createdAt: (r.created_at as string) || new Date().toISOString(),
    leaseDocuments: (r.lease_documents as string) || "[]",
    secDepReceived: !!r.sec_dep_received,
    secDepDate: (r.sec_dep_date as string) || null,
    secDepStatus: (r.sec_dep_status as string) || "no_change",
    secDepNotes: (r.sec_dep_notes as string) || "",
  };
}
