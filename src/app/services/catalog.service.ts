import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/products/list/all`);
  }

  getBrands(): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/brands/list/all`);
  }

  getGramages(): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/grammage/list/all`);
  }

  getMachines(): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/packaging_machines/list/all`);
  }
}
