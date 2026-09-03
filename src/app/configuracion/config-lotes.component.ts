import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService } from '../services/catalog.service';
import { CatalogAdminService } from '../services/catalog-admin.service';
import type { LotSize } from '../models/catalog.model';
import { httpErrorMessage } from '../core/http-error.util';

@Component({
  selector: 'app-config-lotes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-lotes.component.html',
  styleUrls: ['./config-lotes.component.scss', './config-crud.scss'],
})
export class ConfigLotesComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly catalogAdmin = inject(CatalogAdminService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<LotSize[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly showForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    sample_size: ['', [Validators.required, Validators.maxLength(150)]],
    allowed_with_error: ['', [Validators.required, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.catalog.getLotSizes().subscribe({
      next: (rows) => {
        this.items.set([...rows].sort((a, b) => a.id - b.id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudieron cargar los tamaños de lote'));
        this.loading.set(false);
      },
    });
  }

  startCreate(): void {
    this.showForm.set(true);
    this.form.reset({ name: '', sample_size: '', allowed_with_error: '' });
  }

  cancelForm(): void {
    this.showForm.set(false);
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
    this.catalogAdmin
      .createLotSize({
        name: raw.name.trim(),
        sample_size: raw.sample_size.trim(),
        allowed_with_error: raw.allowed_with_error.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Tamaño de lote creado.');
          this.cancelForm();
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(httpErrorMessage(err, 'No se pudo guardar el tamaño de lote'));
        },
      });
  }
}
