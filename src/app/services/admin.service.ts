import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminPermission {
  id: number;
  code: string;
  description?: string | null;
}

export interface AdminRole {
  id: number;
  name: string;
  permission_ids: number[];
  permissions: string[];
}

export interface AdminUser {
  id: number;
  username: string;
  full_name?: string | null;
  is_active?: boolean;
  role_id?: number | null;
  role?: { id?: number; name?: string } | null;
  packaging_area_id?: number | null;
  packaging_area?: { id?: number; name?: string; alias?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/v1/admin`;

  // Permisos
  listPermissions(): Observable<AdminPermission[]> {
    return this.http.get<AdminPermission[]>(`${this.base}/permissions`);
  }

  getPermission(id: number): Observable<AdminPermission> {
    return this.http.get<AdminPermission>(`${this.base}/permissions/${id}`);
  }

  createPermission(body: { code: string; description?: string | null }): Observable<AdminPermission> {
    return this.http.post<AdminPermission>(`${this.base}/permissions`, body);
  }

  updatePermission(
    id: number,
    body: { code?: string; description?: string | null }
  ): Observable<AdminPermission> {
    return this.http.put<AdminPermission>(`${this.base}/permissions/${id}`, body);
  }

  deletePermission(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/permissions/${id}`);
  }

  // Perfiles
  listRoles(): Observable<AdminRole[]> {
    return this.http.get<AdminRole[]>(`${this.base}/roles`);
  }

  getRole(id: number): Observable<AdminRole> {
    return this.http.get<AdminRole>(`${this.base}/roles/${id}`);
  }

  createRole(body: { name: string; permission_ids?: number[] }): Observable<AdminRole> {
    return this.http.post<AdminRole>(`${this.base}/roles`, body);
  }

  updateRole(
    id: number,
    body: { name?: string; permission_ids?: number[] }
  ): Observable<AdminRole> {
    return this.http.put<AdminRole>(`${this.base}/roles/${id}`, body);
  }

  deleteRole(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/roles/${id}`);
  }

  setRolePermissions(roleId: number, permissionIds: number[]): Observable<AdminRole> {
    return this.http.put<AdminRole>(`${this.base}/roles/${roleId}/permissions`, {
      permission_ids: permissionIds,
    });
  }

  // Usuarios
  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.base}/users`);
  }

  getUser(id: number): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.base}/users/${id}`);
  }

  createUser(body: {
    username: string;
    password: string;
    role_id: number;
    is_active?: boolean;
    full_name?: string | null;
    packaging_area_id: number;
  }): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/users`, body);
  }

  updateUser(
    id: number,
    body: {
      username?: string;
      password?: string;
      role_id?: number;
      is_active?: boolean;
      full_name?: string | null;
      packaging_area_id?: number;
    }
  ): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.base}/users/${id}`, body);
  }

  deleteUser(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/users/${id}`);
  }
}
