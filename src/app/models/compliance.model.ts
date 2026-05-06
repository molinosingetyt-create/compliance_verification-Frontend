export interface ComplianceVerificationItemPayload {
  sample_weight_agm: string;
  average_weight: string;
}

export interface ComplianceVerificationCreatePayload {
  sampled: string;
  product_id: number | null;
  brand_id: number | null;
  grammage_id: number | null;
  analyzed: string;
  machine_id: number | null;
  lot_expires: string;
  /** Enviados por el formulario; el API los ignora al validar el cuerpo. */
  package_weights?: unknown[];
  package_average?: string;
  items: ComplianceVerificationItemPayload[];
}

/** Fila devuelta por GET /compliance_verifications/list-all */
export interface ComplianceVerificationRow {
  id: number;
  created_at: string;
  sampled: string;
  product_name: string | null;
  machine_name: string | null;
  grammage_name: string | null;
  brand_name: string | null;
  tolerance: number;
  avg_net_weight: number;
  avg_gross_weight: number;
  t1_errors_count: number;
  t2_errors_count: number;
  standard_deviation: number;
  under_nominal_count: number;
  percentage_under_nominal: number;
  status: number;
}

export interface ComplianceDetailProduct {
  name?: string;
}

export interface ComplianceDetailNested {
  name?: string;
  alias?: string;
}

export interface ItemComplianceVerificationRow {
  sample_weight_agm: string;
  average_weight: string;
  actual_quantity: string;
  status: number;
}

export interface ComplianceVerificationDetail {
  id: number;
  created_at?: string;
  sampled?: string;
  lot_expires?: string;
  product?: ComplianceDetailProduct;
  brand?: ComplianceDetailNested;
  grammage?: ComplianceDetailNested;
  machine?: ComplianceDetailNested;
  item_compliance_verifications: ItemComplianceVerificationRow[];
}

export interface CreateComplianceVerificationResponse {
  detail: string;
  result: number;
  errors_found: Record<string, number>;
  allowed_t1: number;
  data: unknown;
}

export type ItemComplianceStatusClass = 'T1' | 'T2';
