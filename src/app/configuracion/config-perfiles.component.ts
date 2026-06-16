import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, type AdminPermission, type AdminRole } from '../services/admin.service';
import { httpErrorMessage } from '../core/http-error.util';

@Component({
  selector: 'app-config-perfiles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-perfiles.component.html',
  styleUrls: ['./config-perfiles.component.scss', './config-crud.scss'],
})
export class ConfigPerfilesComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly permissions = signal<AdminPermission[]>([]);
  readonly roles = signal<AdminRole[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPermissions = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly viewingItem = signal<AdminRole | null>(null);
  readonly showForm = signal(false);

  /** Perfil seleccionado para asignar permisos */
  readonly assigningRoleId = signal<number | null>(null);
  readonly assignPermissionIds = signal<Set<number>>(new Set());

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.listPermissions().subscribe({
      next: (p) => this.permissions.set([...p].sort((a, b) => a.id - b.id)),
      error: (err) => this.error.set(httpErrorMessage(err, 'No se pudieron cargar los permisos')),
    });
    this.admin.listRoles().subscribe({
      next: (r) => {
        const sorted = [...r].sort((a, b) => a.id - b.id);
        this.roles.set(sorted);
        this.loading.set(false);
        const currentAssign = this.assigningRoleId();
        if (currentAssign != null) {
          const updated = sorted.find((x) => x.id === currentAssign);
          if (updated) {
            this.assignPermissionIds.set(new Set(updated.permission_ids ?? []));
          } else {
            this.assigningRoleId.set(null);
            this.assignPermissionIds.set(new Set());
          }
        }
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudieron cargar los perfiles'));
        this.loading.set(false);
      },
    });
  }

  assigningRoleName(): string {
    const id = this.assigningRoleId();
    if (id == null) {
      return '';
    }
    return this.roles().find((r) => r.id === id)?.name ?? '';
  }

  startCreate(): void {
    this.editingId.set(null);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.form.reset({ name: '' });
  }

  startEdit(r: AdminRole): void {
    this.editingId.set(r.id);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.form.patchValue({ name: r.name });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  viewItem(r: AdminRole): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.admin.getRole(r.id).subscribe({
      next: (detail) => this.viewingItem.set(detail),
      error: (err) => this.error.set(httpErrorMessage(err, 'No se pudo cargar el perfil')),
    });
  }

  closeView(): void {
    this.viewingItem.set(null);
  }

  selectRoleForAssign(r: AdminRole): void {
    this.assigningRoleId.set(r.id);
    this.assignPermissionIds.set(new Set(r.permission_ids ?? []));
    this.showForm.set(false);
    this.viewingItem.set(null);
    this.message.set(null);
    this.error.set(null);
  }

  onAssignRoleSelect(ev: Event): void {
    const v = Number((ev.target as HTMLSelectElement).value);
    if (!Number.isFinite(v) || v <= 0) {
      this.assigningRoleId.set(null);
      this.assignPermissionIds.set(new Set());
      return;
    }
    const role = this.roles().find((r) => r.id === v);
    if (role) {
      this.selectRoleForAssign(role);
    }
  }

  isAssignPermChecked(pid: number): boolean {
    return this.assignPermissionIds().has(pid);
  }

  toggleAssignPermission(pid: number): void {
    const s = new Set(this.assignPermissionIds());
    if (s.has(pid)) {
      s.delete(pid);
    } else {
      s.add(pid);
    }
    this.assignPermissionIds.set(s);
  }

  selectAllAssignPermissions(): void {
    this.assignPermissionIds.set(new Set(this.permissions().map((p) => p.id)));
  }

  clearAllAssignPermissions(): void {
    this.assignPermissionIds.set(new Set());
  }

  saveAssignedPermissions(): void {
    const rid = this.assigningRoleId();
    if (rid == null) {
      this.error.set('Seleccione un perfil para asignar permisos.');
      return;
    }
    this.savingPermissions.set(true);
    this.message.set(null);
    this.error.set(null);
    this.admin.setRolePermissions(rid, Array.from(this.assignPermissionIds())).subscribe({
      next: () => {
        this.savingPermissions.set(false);
        this.message.set(`Permisos guardados para el perfil «${this.assigningRoleName()}».`);
        this.reload();
      },
      error: (err) => {
        this.savingPermissions.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudieron guardar los permisos del perfil'));
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = this.form.getRawValue().name.trim();
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    const id = this.editingId();
    const req =
      id == null
        ? this.admin.createRole({ name, permission_ids: [] })
        : this.admin.updateRole(id, { name });
    req.subscribe({
      next: (role) => {
        this.saving.set(false);
        this.message.set(id == null ? 'Perfil creado. Asigne los permisos abajo.' : 'Perfil actualizado.');
        this.cancelForm();
        this.admin.listRoles().subscribe((r) => {
          this.roles.set([...r].sort((a, b) => a.id - b.id));
          if (id == null && role?.id) {
            const created = r.find((x) => x.id === role.id) ?? role;
            this.selectRoleForAssign(created);
          }
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo guardar el perfil'));
      },
    });
  }

  deleteItem(r: AdminRole): void {
    if (!confirm(`¿Eliminar el perfil "${r.name}"?`)) {
      return;
    }
    this.message.set(null);
    this.error.set(null);
    this.admin.deleteRole(r.id).subscribe({
      next: () => {
        this.message.set('Perfil eliminado.');
        if (this.viewingItem()?.id === r.id) {
          this.closeView();
        }
        if (this.assigningRoleId() === r.id) {
          this.assigningRoleId.set(null);
          this.assignPermissionIds.set(new Set());
        }
        this.reload();
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudo eliminar el perfil'));
      },
    });
  }
}
