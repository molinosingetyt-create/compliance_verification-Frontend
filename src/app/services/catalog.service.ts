import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { unwrapList } from '../models/api.model';
import type {
  CatalogEntity,
  Grammage,
  LotSize,
  PackagingArea,
  PackagingMachine,
  UnitsPackedHour,
} from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  getProducts(): Observable<CatalogEntity[]> {
    return this.http
      .get<CatalogEntity[] | { data: CatalogEntity[] }>(`${this.base}/v1/products/list/all`)
      .pipe(map(unwrapList));
  }

  getBrands(): Observable<CatalogEntity[]> {
    return this.http
      .get<CatalogEntity[] | { data: CatalogEntity[] }>(`${this.base}/v1/brands/list/all`)
      .pipe(map(unwrapList));
  }

  getGrammages(): Observable<Grammage[]> {
    return this.http
      .get<Grammage[] | { data: Grammage[] }>(`${this.base}/v1/grammage/list/all`)
      .pipe(map(unwrapList));
  }

  getMachines(): Observable<PackagingMachine[]> {
    return this.http
      .get<PackagingMachine[] | { data: PackagingMachine[] }>(
        `${this.base}/v1/packaging_machines/list/all`
      )
      .pipe(map(unwrapList));
  }

  getPackagingAreas(): Observable<PackagingArea[]> {
    return this.http
      .get<PackagingArea[] | { data: PackagingArea[] }>(`${this.base}/v1/packaging_areas/list/all`)
      .pipe(map(unwrapList));
  }

  getUnitsPackedHours(): Observable<UnitsPackedHour[]> {
    return this.http
      .get<UnitsPackedHour[] | { data: UnitsPackedHour[] }>(
        `${this.base}/v1/units_packed_hour/list/all`
      )
      .pipe(map(unwrapList));
  }

  getLotSizes(): Observable<LotSize[]> {
    return this.http
      .get<LotSize[] | { data: LotSize[] }>(`${this.base}/v1/lot_sizes/list/all`)
      .pipe(map(unwrapList));
  }
}
