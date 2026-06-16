import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, type AdminPermission } from '../services/admin.service';
import { httpErrorMessage } from '../core/http-error.util';

@Component({
  selector: 'app-config-permisos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-permisos.component.html',
  styleUrls: ['./config-permisos.component.scss', './config-crud.scss'],
})
export class ConfigPermisosComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly permissions = signal<AdminPermission[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly viewingItem = signal<AdminPermission | null>(null);
  readonly showForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(80)]],
    description: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.listPermissions().subscribe({
      next: (p) => {
        this.permissions.set([...p].sort((a, b) => a.id - b.id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudieron cargar los permisos'));
        this.loading.set(false);
      },
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.form.reset({ code: '', description: '' });
  }

  startEdit(p: AdminPermission): void {
    this.editingId.set(p.id);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.form.patchValue({
      code: p.code,
      description: p.description ?? '',
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  viewItem(p: AdminPermission): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.admin.getPermission(p.id).subscribe({
      next: (detail) => this.viewingItem.set(detail),
      error: (err) => this.error.set(httpErrorMessage(err, 'No se pudo cargar el permiso')),
    });
  }

  closeView(): void {
    this.viewingItem.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      code: raw.code.trim(),
      description: raw.description.trim() || null,
    };
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    const id = this.editingId();
    const req =
      id == null
        ? this.admin.createPermission(body)
        : this.admin.updatePermission(id, body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(id == null ? 'Permiso creado.' : 'Permiso actualizado.');
        this.cancelForm();
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo guardar el permiso'));
      },
    });
  }

  deleteItem(p: AdminPermission): void {
    if (!confirm(`¿Eliminar el permiso "${p.code}"?`)) {
      return;
    }
    this.message.set(null);
    this.error.set(null);
    this.admin.deletePermission(p.id).subscribe({
      next: () => {
        this.message.set('Permiso eliminado.');
        if (this.viewingItem()?.id === p.id) {
          this.closeView();
        }
        this.reload();
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudo eliminar el permiso'));
      },
    });
  }
}
