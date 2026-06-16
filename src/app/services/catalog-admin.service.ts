import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { CatalogEntity, Grammage } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogAdminService {
  private readonly http = inject(HttpClient);

  // Productos
  listProducts(): Observable<CatalogEntity[]> {
    return this.http.get<CatalogEntity[]>(`${environment.apiUrl}/v1/products/manage`);
  }

  getProduct(id: number): Observable<CatalogEntity> {
    return this.http.get<CatalogEntity>(`${environment.apiUrl}/v1/products/${id}`);
  }

  createProduct(body: { name: string; alias: string }): Observable<CatalogEntity> {
    return this.http.post<CatalogEntity>(`${environment.apiUrl}/v1/products/create`, body);
  }

  updateProduct(id: number, body: { name?: string; alias?: string }): Observable<CatalogEntity> {
    return this.http.put<CatalogEntity>(`${environment.apiUrl}/v1/products/${id}`, body);
  }

  deleteProduct(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${environment.apiUrl}/v1/products/${id}`);
  }

  // Marcas
  listBrands(): Observable<CatalogEntity[]> {
    return this.http.get<CatalogEntity[]>(`${environment.apiUrl}/v1/brands/manage`);
  }

  getBrand(id: number): Observable<CatalogEntity> {
    return this.http.get<CatalogEntity>(`${environment.apiUrl}/v1/brands/${id}`);
  }

  createBrand(body: { name: string; alias: string }): Observable<CatalogEntity> {
    return this.http.post<CatalogEntity>(`${environment.apiUrl}/v1/brands/create`, body);
  }

  updateBrand(id: number, body: { name?: string; alias?: string }): Observable<CatalogEntity> {
    return this.http.put<CatalogEntity>(`${environment.apiUrl}/v1/brands/${id}`, body);
  }

  deleteBrand(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${environment.apiUrl}/v1/brands/${id}`);
  }

  // Gramajes
  listGrammages(): Observable<Grammage[]> {
    return this.http.get<Grammage[]>(`${environment.apiUrl}/v1/grammage/manage`);
  }

  getGrammage(id: number): Observable<Grammage> {
    return this.http.get<Grammage>(`${environment.apiUrl}/v1/grammage/${id}`);
  }

  createGrammage(body: { name: string; alias: string; tolerance: string }): Observable<Grammage> {
    return this.http.post<Grammage>(`${environment.apiUrl}/v1/grammage/create`, body);
  }

  updateGrammage(
    id: number,
    body: { name?: string; alias?: string; tolerance?: string }
  ): Observable<Grammage> {
    return this.http.put<Grammage>(`${environment.apiUrl}/v1/grammage/${id}`, body);
  }

  deleteGrammage(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${environment.apiUrl}/v1/grammage/${id}`);
  }
}
