import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id?: number;
  username?: string;
  full_name?: string | null;
  role?: { name?: string } | null;
  /** Códigos de permiso devueltos por el API al hacer login */
  permissions?: string[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'cv_token';
  private readonly userKey = 'cv_user';

  readonly token = signal<string | null>(null);
  readonly user = signal<AuthUser | null>(null);

  constructor() {
    const t = localStorage.getItem(this.tokenKey);
    let u: AuthUser | null = null;
    try {
      const raw = localStorage.getItem(this.userKey);
      if (raw) u = JSON.parse(raw) as AuthUser;
    } catch {
      u = null;
    }
    if (t && u && !Array.isArray(u.permissions)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      this.token.set(null);
      this.user.set(null);
      return;
    }
    this.token.set(t);
    this.user.set(u);
  }

  readonly isLoggedIn = computed(() => !!this.token());
  readonly roleName = computed(() => this.user()?.role?.name ?? null);
  readonly permissionList = computed(() => this.user()?.permissions ?? []);

  /** Nombre para muestreo: nombre completo o correo de usuario. */
  readonly displayName = computed(() => {
    const u = this.user();
    const fn = (u?.full_name ?? '').trim();
    return fn || (u?.username ?? '').trim();
  });

  hasPermission(code: string): boolean {
    return this.permissionList().includes(code);
  }

  readonly canEditNetContent = computed(() => this.hasPermission('sampling:edit'));
  readonly canCreateSampling = computed(() => this.hasPermission('sampling:create'));
  readonly canManageUsers = computed(() => this.hasPermission('users:manage'));
  readonly canManageCatalog = computed(() => this.hasPermission('catalog:manage'));
  readonly canAccessConfiguration = computed(
    () => this.hasPermission('users:manage') || this.hasPermission('catalog:manage')
  );

  /** El API usa `username`; en UI se ingresa correo corporativo. */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/v1/auth/login`, {
        username: email,
        password,
      })
      .pipe(tap((resp) => this.setSession(resp)));
  }

  setSession(resp: LoginResponse) {
    localStorage.setItem(this.tokenKey, resp.access_token);
    localStorage.setItem(this.userKey, JSON.stringify(resp.user ?? null));
    this.token.set(resp.access_token);
    this.user.set(resp.user ?? null);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.user.set(null);
  }
}
