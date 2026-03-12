import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ComplianceVerificationItem {
  sample_weight_agm: string;
  average_weight: string;
}

export interface ComplianceVerificationForm {
  sampled: string;
  product_id?: number;
  brand_id?: number;
  grammage_id?: number;
  analyzed: string;
  machine_id?: number;
  lot_expires: string;
  items: ComplianceVerificationItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ComplianceVerificationService {
  private apiUrl = 'http://localhost:8000'; // Cambia la URL si tu backend usa otro puerto o ruta

  constructor(private http: HttpClient) {}

  createComplianceVerification(data: ComplianceVerificationForm): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}/v1/compliance_verifications/create`, data, { headers });
  }
}
