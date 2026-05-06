import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { unwrapList } from '../models/api.model';
import type { CatalogEntity, Grammage, PackagingMachine } from '../models/catalog.model';

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
}
