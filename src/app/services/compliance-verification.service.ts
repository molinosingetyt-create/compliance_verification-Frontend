import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  ComplianceVerificationCreatePayload,
  ComplianceVerificationDetail,
  ComplianceVerificationRow,
  ComplianceVerificationPackageWeights,
  CreateComplianceVerificationResponse,
  UpdateItemPayload,
  UpdateItemResponse,
  UpdatePackageWeightsResponse,
} from '../models/compliance.model';

@Injectable({ providedIn: 'root' })
export class ComplianceVerificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1/compliance_verifications`;

  createComplianceVerification(
    data: ComplianceVerificationCreatePayload
  ): Observable<CreateComplianceVerificationResponse> {
    return this.http.post<CreateComplianceVerificationResponse>(`${this.apiUrl}/create`, data);
  }

  getComplianceVerifications(
    dateFrom?: string | null,
    dateTo?: string | null
  ): Observable<ComplianceVerificationRow[]> {
    let params = new HttpParams();
    if (dateFrom) {
      params = params.set('date_from', dateFrom);
    }
    if (dateTo) {
      params = params.set('date_to', dateTo);
    }
    return this.http.get<ComplianceVerificationRow[]>(`${this.apiUrl}/list-all`, { params });
  }

  deleteComplianceVerification(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.apiUrl}/list/${id}`);
  }

  getComplianceVerificationDetail(id: number): Observable<ComplianceVerificationDetail> {
    return this.http.get<ComplianceVerificationDetail>(`${this.apiUrl}/list/${id}`);
  }

  getComplianceVerificationPackageWeights(
    id: number
  ): Observable<ComplianceVerificationPackageWeights> {
    return this.http.get<ComplianceVerificationPackageWeights>(
      `${this.apiUrl}/list/${id}/package-weights`
    );
  }

  updateItem(itemId: number, body: UpdateItemPayload): Observable<UpdateItemResponse> {
    return this.http.put<UpdateItemResponse>(`${this.apiUrl}/items/${itemId}`, body);
  }

  updatePackageWeights(
    id: number,
    packageWeights: number[]
  ): Observable<UpdatePackageWeightsResponse> {
    return this.http.put<UpdatePackageWeightsResponse>(`${this.apiUrl}/list/${id}/package-weights`, {
      package_weights: packageWeights,
    });
  }
}
