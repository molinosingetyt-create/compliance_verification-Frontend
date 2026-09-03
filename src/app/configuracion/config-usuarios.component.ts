import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, type AdminRole, type AdminUser } from '../services/admin.service';
import { CatalogService } from '../services/catalog.service';
import type { PackagingArea } from '../models/catalog.model';
import { httpErrorMessage } from '../core/http-error.util';

@Component({
  selector: 'app-config-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-usuarios.component.html',
  styleUrls: ['./config-usuarios.component.scss', './config-crud.scss'],
})
export class ConfigUsuariosComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);

  readonly roles = signal<AdminRole[]>([]);
  readonly packagingAreas = signal<PackagingArea[]>([]);
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly viewingItem = signal<AdminUser | null>(null);
  readonly showForm = signal(false);

  readonly userForm = this.fb.nonNullable.group({
    full_name: ['', Validators.required],
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role_id: [null as number | null, Validators.required],
    packaging_area_id: [null as number | null, Validators.required],
    is_active: [true],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.listRoles().subscribe({
      next: (r) => {
        this.roles.set([...r].sort((a, b) => a.id - b.id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudieron cargar los perfiles'));
        this.loading.set(false);
      },
    });
    this.admin.listUsers().subscribe({
      next: (u) => this.users.set([...u].sort((a, b) => a.id - b.id)),
      error: () => this.users.set([]),
    });
    this.catalog.getPackagingAreas().subscribe({
      next: (a) => this.packagingAreas.set([...a].sort((x, y) => x.id - y.id)),
      error: () => this.packagingAreas.set([]),
    });
  }

  private setPasswordValidatorsForCreate(): void {
    const ctrl = this.userForm.controls.password;
    ctrl.setValidators([Validators.required, Validators.minLength(6)]);
    ctrl.updateValueAndValidity();
  }

  private setPasswordValidatorsForEdit(): void {
    const ctrl = this.userForm.controls.password;
    ctrl.clearValidators();
    ctrl.updateValueAndValidity();
  }

  startCreate(): void {
    this.editingId.set(null);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.userForm.reset({
      full_name: '',
      username: '',
      password: '',
      role_id: null,
      packaging_area_id: null,
      is_active: true,
    });
    this.setPasswordValidatorsForCreate();
  }

  startEdit(u: AdminUser): void {
    this.editingId.set(u.id);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.userForm.patchValue({
      full_name: u.full_name ?? '',
      username: u.username,
      password: '',
      role_id: u.role_id ?? u.role?.id ?? null,
      packaging_area_id: u.packaging_area_id ?? u.packaging_area?.id ?? null,
      is_active: u.is_active ?? true,
    });
    this.setPasswordValidatorsForEdit();
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  viewItem(u: AdminUser): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.admin.getUser(u.id).subscribe({
      next: (detail) => this.viewingItem.set(detail),
      error: (err) => this.error.set(httpErrorMessage(err, 'No se pudo cargar el usuario')),
    });
  }

  closeView(): void {
    this.viewingItem.set(null);
  }

  submit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const raw = this.userForm.getRawValue();
    if (raw.role_id == null || raw.packaging_area_id == null) {
      return;
    }
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    const id = this.editingId();
    if (id == null) {
      this.admin
        .createUser({
          username: raw.username.trim(),
          full_name: raw.full_name.trim(),
          password: raw.password,
          role_id: raw.role_id,
          packaging_area_id: raw.packaging_area_id,
          is_active: raw.is_active,
        })
        .subscribe({
          next: () => this.onSaveSuccess('Usuario creado.'),
          error: (err) => this.onSaveError(err, 'No se pudo crear el usuario'),
        });
    } else {
      const body: {
        username: string;
        full_name: string;
        role_id: number;
        packaging_area_id: number;
        is_active: boolean;
        password?: string;
      } = {
        username: raw.username.trim(),
        full_name: raw.full_name.trim(),
        role_id: raw.role_id,
        packaging_area_id: raw.packaging_area_id,
        is_active: raw.is_active,
      };
      if (raw.password.trim()) {
        body.password = raw.password;
      }
      this.admin.updateUser(id, body).subscribe({
        next: () => this.onSaveSuccess('Usuario actualizado.'),
        error: (err) => this.onSaveError(err, 'No se pudo actualizar el usuario'),
      });
    }
  }

  private onSaveSuccess(msg: string): void {
    this.saving.set(false);
    this.message.set(msg);
    this.cancelForm();
    this.admin.listUsers().subscribe((u) => this.users.set([...u].sort((a, b) => a.id - b.id)));
  }

  private onSaveError(err: unknown, fallback: string): void {
    this.saving.set(false);
    this.error.set(httpErrorMessage(err, fallback));
  }

  deleteItem(u: AdminUser): void {
    if (!confirm(`¿Eliminar el usuario "${u.username}"?`)) {
      return;
    }
    this.message.set(null);
    this.error.set(null);
    this.admin.deleteUser(u.id).subscribe({
      next: () => {
        this.message.set('Usuario eliminado.');
        if (this.viewingItem()?.id === u.id) {
          this.closeView();
        }
          this.admin.listUsers().subscribe((list) =>
            this.users.set([...list].sort((a, b) => a.id - b.id))
          );
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudo eliminar el usuario'));
      },
    });
  }
}
