import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/* ========================= */
/* MODELOS */
/* ========================= */

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

/* LISTADO */

export interface ComplianceVerification {
  id: number;
  sampled: string;
  analyzed: string;
  lot_expires: string;
  product_name: string;
  machine_name: string;
  status: number;
  created_at: string;
}

/* DETALLE */

export interface ComplianceVerificationDetail {
  id: number;
  item_compliance_verifications: any[];
}

/* ========================= */
/* SERVICIO */
/* ========================= */

@Injectable({
  providedIn: 'root',
})
export class ComplianceVerificationService {

  private apiUrl = 'http://localhost:8000/v1/compliance_verifications';

  constructor(private http: HttpClient) { }

  /* ========================= */
  /* CREAR VERIFICACIÓN */
  /* ========================= */

  createComplianceVerification(
    data: ComplianceVerificationForm
  ): Observable<any> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(
      `${this.apiUrl}/create`,
      data,
      { headers }
    );

  }

  /* ========================= */
  /* LISTAR VERIFICACIONES */
  /* ========================= */

  getComplianceVerifications(): Observable<ComplianceVerification[]> {

    return this.http.get<ComplianceVerification[]>(
      `${this.apiUrl}/list-all`
    );

  }

  /* ========================= */
  /* DETALLE DE VERIFICACIÓN */
  /* ========================= */

  getComplianceVerificationDetail(
    id: number
  ): Observable<ComplianceVerificationDetail> {

    return this.http.get<ComplianceVerificationDetail>(
      `${this.apiUrl}/list/${id}`
    );

  }

}