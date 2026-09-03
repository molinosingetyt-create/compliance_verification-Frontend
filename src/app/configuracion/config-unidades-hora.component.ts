import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService } from '../services/catalog.service';
import { CatalogAdminService } from '../services/catalog-admin.service';
import type { Grammage, PackagingMachine, UnitsPackedHour } from '../models/catalog.model';
import { httpErrorMessage } from '../core/http-error.util';

@Component({
  selector: 'app-config-unidades-hora',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-unidades-hora.component.html',
  styleUrls: ['./config-unidades-hora.component.scss', './config-crud.scss'],
})
export class ConfigUnidadesHoraComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly catalogAdmin = inject(CatalogAdminService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<UnitsPackedHour[]>([]);
  readonly machines = signal<PackagingMachine[]>([]);
  readonly grammages = signal<Grammage[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly showForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    packaging_machine_id: [null as number | null, Validators.required],
    grammage_id: [null as number | null, Validators.required],
    value: ['', [Validators.required, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.catalog.getMachines().subscribe((data) => this.machines.set(data));
    this.catalog.getGrammages().subscribe((data) => this.grammages.set(data));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.catalog.getUnitsPackedHours().subscribe({
      next: (rows) => {
        this.items.set([...rows].sort((a, b) => a.id - b.id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(httpErrorMessage(err, 'No se pudieron cargar las unidades por hora'));
        this.loading.set(false);
      },
    });
  }

  machineName(id: number): string {
    return this.machines().find((m) => m.id === id)?.name ?? `#${id}`;
  }

  grammageName(id: number): string {
    return this.grammages().find((g) => g.id === id)?.name ?? `#${id}`;
  }

  startCreate(): void {
    this.showForm.set(true);
    this.form.reset({ packaging_machine_id: null, grammage_id: null, value: '' });
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
    if (raw.packaging_machine_id == null || raw.grammage_id == null) {
      return;
    }
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    this.catalogAdmin
      .createUnitsPackedHour({
        packaging_machine_id: raw.packaging_machine_id,
        grammage_id: raw.grammage_id,
        value: raw.value.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Unidad por hora creada.');
          this.cancelForm();
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(httpErrorMessage(err, 'No se pudo guardar la unidad por hora'));
        },
      });
  }
}
