import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
} from '@angular/forms';
import { ComplianceVerificationService } from '../services/compliance-verification.service';
import { CatalogService } from '../services/catalog.service';
import { showBootstrapModal } from '../core/bootstrap-modal';
import { DecimalMaxPipe } from '../core/decimal-max.pipe';
import type { CatalogEntity, Grammage, PackagingMachine } from '../models/catalog.model';
import type {
  ComplianceVerificationRow,
  ComplianceVerificationDetail,
  ComplianceVerificationCreatePayload,
  ItemComplianceStatusClass,
} from '../models/compliance.model';

const PACKAGE_WEIGHT_SLOTS = 10;
const SAMPLE_ITEM_COUNT = 98;

@Component({
  selector: 'app-compliance-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalMaxPipe],
  templateUrl: './compliance-verification.component.html',
  styleUrls: ['./compliance-verification.component.scss'],
})
export class ComplianceVerificationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly complianceService = inject(ComplianceVerificationService);
  private readonly catalogService = inject(CatalogService);

  readonly verificationForm: FormGroup = this.fb.group({
    sampled: ['', Validators.required],
    product_id: [null, Validators.required],
    brand_id: [null, Validators.required],
    grammage_id: [null, Validators.required],
    machine_id: [null, Validators.required],
    lot_expires: ['', Validators.required],
    package_weights: this.fb.array(
      Array.from({ length: PACKAGE_WEIGHT_SLOTS }, () =>
        this.fb.control<string | number>('', [Validators.required, Validators.min(0.01)])
      )
    ),
    package_average: [{ value: '', disabled: true }],
    items: this.fb.array<FormGroup>([]),
  });

  step = 1;
  showForm = false;

  readonly products = signal<CatalogEntity[]>([]);
  readonly brands = signal<CatalogEntity[]>([]);
  readonly grammages = signal<Grammage[]>([]);
  readonly machines = signal<PackagingMachine[]>([]);

  readonly verifications = signal<ComplianceVerificationRow[]>([]);
  readonly listLoading = signal(true);
  readonly listError = signal<string | null>(null);

  readonly selectedDetail = signal<ComplianceVerificationDetail | null>(null);
  readonly detailItems = computed(
    () => this.selectedDetail()?.item_compliance_verifications ?? []
  );

  readonly modalMessage = signal('');
  readonly modalType = signal<'success' | 'error'>('success');

  constructor() {
    this.packageWeights.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.calculatePackageAverage();
    });
  }

  ngOnInit(): void {
    this.loadVerifications();
    this.loadCatalogs();
  }

  get items(): FormArray {
    return this.verificationForm.get('items') as FormArray;
  }

  get packageWeights(): FormArray {
    return this.verificationForm.get('package_weights') as FormArray;
  }

  trackByVerificationId(_index: number, row: ComplianceVerificationRow): number {
    return row.id;
  }

  isStepValid(): boolean {
    if (this.step === 1) {
      const fields = [
        'sampled',
        'product_id',
        'brand_id',
        'grammage_id',
        'machine_id',
        'lot_expires',
      ] as const;
      return fields.every((f) => this.verificationForm.get(f)?.valid);
    }
    if (this.step === 2) {
      return this.packageWeights.valid;
    }
    return this.items.valid;
  }

  markCurrentStepAsTouched(): void {
    if (this.step === 1) {
      const fields = [
        'sampled',
        'product_id',
        'brand_id',
        'grammage_id',
        'machine_id',
        'lot_expires',
      ] as const;
      fields.forEach((f) => this.verificationForm.get(f)?.markAsTouched());
    } else if (this.step === 2) {
      this.packageWeights.markAllAsTouched();
    } else {
      this.items.markAllAsTouched();
    }
  }

  nextStep(): void {
    if (this.isStepValid()) {
      this.step++;
    } else {
      this.markCurrentStepAsTouched();
      this.openFeedbackModal('Por favor, complete todos los campos requeridos en esta sección.', 'error');
    }
  }

  prevStep(): void {
    this.step--;
  }

  private loadCatalogs(): void {
    this.catalogService.getProducts().subscribe((data) => this.products.set(data));
    this.catalogService.getBrands().subscribe((data) => this.brands.set(data));
    this.catalogService.getGrammages().subscribe((data) => this.grammages.set(data));
    this.catalogService.getMachines().subscribe((data) => this.machines.set(data));
  }

  loadVerifications(): void {
    this.listLoading.set(true);
    this.listError.set(null);
    this.complianceService.getComplianceVerifications().subscribe({
      next: (rows) => {
        this.verifications.set(Array.isArray(rows) ? rows : []);
        this.listLoading.set(false);
      },
      error: () => {
        this.verifications.set([]);
        this.listError.set('No se pudo cargar el listado. Revise la conexión con el API.');
        this.listLoading.set(false);
      },
    });
  }

  startSampling(): void {
    this.showForm = true;
    this.step = 1;
    this.verificationForm.reset();

    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }

    for (let i = 0; i < SAMPLE_ITEM_COUNT; i++) {
      this.addItem();
    }
  }

  cancelSampling(): void {
    this.showForm = false;
    this.step = 1;
    this.verificationForm.reset();
    this.loadVerifications();
  }

  addItem(): void {
    this.items.push(
      this.fb.group({
        sample_weight_agm: ['', [Validators.required, Validators.min(0)]],
      })
    );
  }

  calculatePackageAverage(): void {
    const weights = this.packageWeights.value.map((v: string | number) => Number(v) || 0);
    const total = weights.reduce((a: number, b: number) => a + b, 0);
    const avg = weights.length > 0 ? total / weights.length : 0;
    this.verificationForm.patchValue({ package_average: avg.toFixed(2) }, { emitEvent: false });
  }

  viewDetail(id: number): void {
    this.complianceService.getComplianceVerificationDetail(id).subscribe({
      next: (res) => {
        this.selectedDetail.set(res);
        queueMicrotask(() => showBootstrapModal('detailModal'));
      },
      error: (err) => console.error('Error al obtener detalle:', err),
    });
  }

  onSubmit(): void {
    if (!this.verificationForm.valid) {
      this.markCurrentStepAsTouched();
      this.openFeedbackModal('Por favor, complete todos los campos requeridos.', 'error');
      return;
    }

    const rawForm = this.verificationForm.getRawValue();
    const globalAvg = rawForm.package_average as string;

    const payload: ComplianceVerificationCreatePayload = {
      ...rawForm,
      analyzed: rawForm.sampled as string,
      items: this.items.value.map((item: { sample_weight_agm: string | number }) => {
        const diff = (Number(item.sample_weight_agm) - Number(globalAvg)).toFixed(2);
        return {
          sample_weight_agm: String(item.sample_weight_agm),
          average_weight: diff,
        };
      }),
    };

    this.complianceService.createComplianceVerification(payload).subscribe({
      next: (res) => {
        this.openFeedbackModal(res.detail || '¡Verificación creada exitosamente!', 'success');
        this.cancelSampling();
      },
      error: (err) => this.handleHttpError(err),
    });
  }

  private handleHttpError(err: unknown): void {
    let errorMessage = 'Error en la solicitud';
    const httpErr = err as {
      status?: number;
      error?: { detail?: string | Array<{ loc: string[]; msg: string }> };
    };
    if (httpErr.status === 422 && Array.isArray(httpErr.error?.detail)) {
      errorMessage = httpErr.error!.detail!
        .map((e) => {
          const field = e.loc[e.loc.length - 1];
          return `Campo "${field}": ${e.msg}`;
        })
        .join('\n');
    } else if (typeof httpErr.error?.detail === 'string') {
      errorMessage = httpErr.error.detail;
    } else {
      errorMessage = 'Error inesperado en el servidor';
    }
    this.openFeedbackModal(errorMessage, 'error');
  }

  private openFeedbackModal(message: string, type: 'success' | 'error'): void {
    this.modalMessage.set(message);
    this.modalType.set(type);
    queueMicrotask(() => showBootstrapModal('responseModal'));
  }

  /** Etiqueta T1 según estado del ítem (2 o 3 → no cumple). */
  labelForT1(status: number): string {
    return status === 2 || status === 3 ? 'NO CUMPLE' : 'CUMPLE';
  }

  /** Etiqueta T2: solo estado 3 no cumple. */
  labelForT2(status: number): string {
    return status === 3 ? 'NO CUMPLE' : 'CUMPLE';
  }

  cssClassForResult(status: number, kind: ItemComplianceStatusClass): string {
    if (kind === 'T1' && (status === 2 || status === 3)) {
      return 'text-brand-no fw-bold';
    }
    if (kind === 'T2' && status === 3) {
      return 'text-brand-no fw-bold';
    }
    return 'text-brand-ok';
  }

  readonly sampleItemCount = SAMPLE_ITEM_COUNT;
  readonly packageWeightSlots = PACKAGE_WEIGHT_SLOTS;
}
