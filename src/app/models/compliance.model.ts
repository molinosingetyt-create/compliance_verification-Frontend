export interface ComplianceVerificationItemPayload {
  sample_weight_agm: string;
  average_weight: string;
}

export type MarketDestination = 'nacional' | 'exportacion';

export interface ComplianceVerificationCreatePayload {
  sampled: string;
  market_destination: MarketDestination;
  product_id: number | null;
  brand_id: number | null;
  grammage_id: number | null;
  analyzed: string;
  machine_id: number | null;
  lot_expires: string;
  /** Pesos de empaques (sin contenido). */
  package_weights?: Array<string | number>;
  package_average?: string;
  items: ComplianceVerificationItemPayload[];
}

/** Fila devuelta por GET /compliance_verifications/list-all */
export interface ComplianceVerificationRow {
  id: number;
  created_at: string;
  sampled: string;
  market_destination?: MarketDestination | string | null;
  product_id?: number | null;
  machine_id?: number | null;
  brand_id?: number | null;
  grammage_id?: number | null;
  packaging_area_id?: number | null;
  packaging_area_name?: string | null;
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
  lot_expires?: string | null;
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
  id?: number;
  sample_weight_agm: string;
  average_weight: string;
  actual_quantity: string;
  status: number;
}

export interface ComplianceVerificationDetail {
  id: number;
  created_at?: string;
  sampled?: string;
  market_destination?: MarketDestination | string | null;
  lot_expires?: string;
  status?: number;
  product?: ComplianceDetailProduct;
  brand?: ComplianceDetailNested;
  grammage?: ComplianceDetailNested;
  machine?: ComplianceDetailNested;
  item_compliance_verifications: ItemComplianceVerificationRow[];
}

export interface UpdateItemPayload {
  sample_weight_agm?: number;
  actual_quantity?: number;
}

export interface UpdateItemMetrics {
  verification_status: number;
  errors_found: { T1: number; T2: number };
  allowed_t1: number;
  avg_net_weight: number;
}

export interface UpdateItemResponse {
  detail: string;
  metrics: UpdateItemMetrics;
  item?: ItemComplianceVerificationRow;
}

export interface UpdatePackageWeightsResponse {
  detail: string;
  package_weights: number[];
  average_weight: number;
  metrics: UpdateItemMetrics;
}

export interface ComplianceVerificationPackageWeights {
  package_weights: number[];
  average_weight: number;
}

export interface CreateComplianceVerificationResponse {
  detail: string;
  result: number;
  errors_found: Record<string, number>;
  allowed_t1: number;
  data: unknown;
}

export type ItemComplianceStatusClass = 'T1' | 'T2';
