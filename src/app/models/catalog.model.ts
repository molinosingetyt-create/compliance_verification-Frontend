export interface CatalogEntity {
  id: number;
  name: string;
  alias?: string;
  status?: number;
}

export interface Grammage extends CatalogEntity {
  tolerance?: string;
}

export interface PackagingMachine extends CatalogEntity {
  packaging_area_id?: number;
}

export type PackagingArea = CatalogEntity;

export interface UnitsPackedHour {
  id: number;
  packaging_machine_id: number;
  grammage_id: number;
  value: string;
  status?: number;
}

export interface LotSize {
  id: number;
  name: string;
  sample_size: string;
  allowed_with_error: string;
  status?: number;
}
