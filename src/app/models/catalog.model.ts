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
