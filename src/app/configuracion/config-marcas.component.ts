import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogAdminService } from '../services/catalog-admin.service';
import type { CatalogEntity } from '../models/catalog.model';
import { httpErrorMessage } from '../core/http-error.util';

@Component({
  selector: 'app-config-marcas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-marcas.component.html',
  styleUrls: ['./config-marcas.component.scss', './config-crud.scss'],
})
export class ConfigMarcasComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<CatalogEntity[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly viewingItem = signal<CatalogEntity | null>(null);
  readonly showForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    alias: ['', [Validators.required, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.catalog.listBrands().subscribe({
      next: (rows) => {
        this.items.set(rows.filter((r) => r.status !== 0).sort((a, b) => a.id - b.id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudieron cargar las marcas'));
        this.loading.set(false);
      },
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.form.reset({ name: '', alias: '' });
  }

  startEdit(p: CatalogEntity): void {
    this.editingId.set(p.id);
    this.viewingItem.set(null);
    this.showForm.set(true);
    this.form.patchValue({ name: p.name, alias: p.alias ?? '' });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  viewItem(p: CatalogEntity): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.catalog.getBrand(p.id).subscribe({
      next: (detail) => this.viewingItem.set(detail),
      error: (err) => this.error.set(httpErrorMessage(err, 'No se pudo cargar la marca')),
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
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    const id = this.editingId();
    const body = { name: raw.name.trim(), alias: raw.alias.trim() };
    const req = id == null ? this.catalog.createBrand(body) : this.catalog.updateBrand(id, body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(id == null ? 'Marca creada.' : 'Marca actualizada.');
        this.cancelForm();
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo guardar la marca'));
      },
    });
  }

  deleteItem(p: CatalogEntity): void {
    if (!confirm(`¿Eliminar la marca "${p.name}"?`)) {
      return;
    }
    this.catalog.deleteBrand(p.id).subscribe({
      next: () => {
        this.message.set('Marca eliminada.');
        if (this.viewingItem()?.id === p.id) {
          this.closeView();
        }
        this.reload();
      },
      error: (err) => this.error.set(httpErrorMessage(err, 'No se pudo eliminar la marca')),
    });
  }
}
