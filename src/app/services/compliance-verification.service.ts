import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getComplianceVerifications(): Observable<ComplianceVerificationRow[]> {
    return this.http.get<ComplianceVerificationRow[]>(`${this.apiUrl}/list-all`);
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
}
