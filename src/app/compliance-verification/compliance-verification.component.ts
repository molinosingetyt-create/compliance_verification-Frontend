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
import { AuthService } from '../core/auth.service';
import { showBootstrapModal } from '../core/bootstrap-modal';
import { DecimalMaxPipe } from '../core/decimal-max.pipe';
import type { CatalogEntity, Grammage, PackagingMachine } from '../models/catalog.model';
import type {
  ComplianceVerificationRow,
  ComplianceVerificationDetail,
  ComplianceVerificationCreatePayload,
  ComplianceVerificationPackageWeights,
  ItemComplianceStatusClass,
  ItemComplianceVerificationRow,
} from '../models/compliance.model';

/** Fila de la tabla de detalle con índice original del muestreo (para columna #). */
interface DetailTableViewRow {
  row: ItemComplianceVerificationRow;
  lineNo: number;
}

/** Columnas ordenables del modal de detalle. */
type DetailTableSortKey = 'lineNo' | 'agm' | 'atm' | 'qi' | 't1' | 't2';

function compareNumericStrings(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const aOk = Number.isFinite(na);
  const bOk = Number.isFinite(nb);
  if (aOk && bOk) {
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  if (aOk !== bOk) {
    return aOk ? -1 : 1;
  }
  return a.localeCompare(b, undefined, { numeric: true });
}

/** 0 = cumple, 1 = no cumple (para orden estable por severidad). */
function complianceRankT1(status: number): number {
  return status === 2 || status === 3 ? 1 : 0;
}

function complianceRankT2(status: number): number {
  return status === 3 ? 1 : 0;
}

const PACKAGE_WEIGHT_SLOTS = 10;
const SAMPLE_ITEM_COUNT = 98;

const EMPTY_LIST_FILTERS = {
  dateFrom: '',
  dateTo: '',
  productId: null as number | null,
  brandId: null as number | null,
  grammageId: null as number | null,
  lot: '',
  status: null as number | null,
  sampled: '',
};

export const MARKET_DESTINATION_OPTIONS = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'exportacion', label: 'Exportación' },
] as const;

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
  readonly auth = inject(AuthService);

  readonly marketDestinationOptions = MARKET_DESTINATION_OPTIONS;

  readonly verificationForm: FormGroup = this.fb.group({
    sampled: ['', Validators.required],
    market_destination: [null as string | null, Validators.required],
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

  readonly listFilterForm = this.fb.group({
    dateFrom: [''],
    dateTo: [''],
    productId: [null as number | null],
    brandId: [null as number | null],
    grammageId: [null as number | null],
    lot: [''],
    status: [null as number | null],
    sampled: [''],
  });

  /** Filtros aplicados (los que realmente afectan la tabla; se actualizan al presionar "Aceptar"). */
  readonly appliedListFilters = signal({ ...EMPTY_LIST_FILTERS });

  readonly activeFilterCount = computed(() => {
    const f = this.appliedListFilters();
    return Object.values(f).filter((v) => v != null && v !== '').length;
  });

  readonly filteredVerifications = computed(() => {
    const f = this.appliedListFilters();
    return this.verifications().filter((v) => {
      if (f.productId != null && v.product_id !== f.productId) {
        return false;
      }
      if (f.brandId != null && v.brand_id !== f.brandId) {
        return false;
      }
      if (f.grammageId != null && v.grammage_id !== f.grammageId) {
        return false;
      }
      if (f.status != null && v.status !== f.status) {
        return false;
      }
      if (f.lot && !(v.lot_expires ?? '').toLowerCase().includes(f.lot.toLowerCase())) {
        return false;
      }
      if (f.sampled && !(v.sampled ?? '').toLowerCase().includes(f.sampled.toLowerCase())) {
        return false;
      }
      return true;
    });
  });

  readonly selectedDetail = signal<ComplianceVerificationDetail | null>(null);
  readonly detailItems = computed(() => {
    const items = this.selectedDetail()?.item_compliance_verifications ?? [];
    return [...items].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  });

  readonly selectedPackageWeights = signal<ComplianceVerificationPackageWeights | null>(null);
  readonly selectedPackageWeightsId = signal<number | null>(null);
  readonly editingPackageWeights = signal(false);
  readonly packageWeightsDraft = signal<string[]>([]);
  readonly savingPackageWeights = signal(false);

  /** Edición inline de AGM en modal de detalle */
  readonly editingItemId = signal<number | null>(null);
  readonly editDraft = signal('');
  /** Promedio de empaque del muestreo (para calcular Qi al editar AGM) */
  readonly detailPackageAvg = signal<number | null>(null);

  /** Orden activo en la tabla de detalle (null = orden original del API). */
  readonly detailSort = signal<{ key: DetailTableSortKey; dir: 'asc' | 'desc' } | null>(null);

  readonly sortedDetailRows = computed((): DetailTableViewRow[] => {
    const items = this.detailItems();
    const base = items.map((row, idx) => ({ row, lineNo: idx + 1 }));
    const sort = this.detailSort();
    if (!sort) {
      return base;
    }
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case 'lineNo':
          cmp = a.lineNo - b.lineNo;
          break;
        case 'agm':
          cmp = compareNumericStrings(a.row.sample_weight_agm, b.row.sample_weight_agm);
          break;
        case 'atm':
          cmp = compareNumericStrings(a.row.average_weight, b.row.average_weight);
          break;
        case 'qi':
          cmp = compareNumericStrings(a.row.actual_quantity, b.row.actual_quantity);
          break;
        case 't1':
          cmp = complianceRankT1(a.row.status) - complianceRankT1(b.row.status);
          break;
        case 't2':
          cmp = complianceRankT2(a.row.status) - complianceRankT2(b.row.status);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
  });

  readonly modalMessage = signal('');
  readonly modalType = signal<'success' | 'error'>('success');

  constructor() {
    this.packageWeights.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.calculatePackageAverage();
    });
  }

  /** Al abrir el modal, el formulario parte de lo último aplicado (cancelar no pierde nada). */
  openFiltersModal(): void {
    this.listFilterForm.reset({ ...this.appliedListFilters() });
    showBootstrapModal('filtersModal');
  }

  /** Aplica el borrador del modal: dispara la búsqueda por fecha en el API y filtra el resto localmente. */
  applyListFilters(): void {
    const v = this.listFilterForm.getRawValue();
    this.appliedListFilters.set({
      dateFrom: v.dateFrom?.trim() ?? '',
      dateTo: v.dateTo?.trim() ?? '',
      productId: v.productId,
      brandId: v.brandId,
      grammageId: v.grammageId,
      lot: v.lot?.trim() ?? '',
      status: v.status === 1 || v.status === 2 ? v.status : null,
      sampled: v.sampled?.trim() ?? '',
    });
    this.loadVerifications();
  }

  clearListFilters(): void {
    this.listFilterForm.reset({ ...EMPTY_LIST_FILTERS });
    this.appliedListFilters.set({ ...EMPTY_LIST_FILTERS });
    this.loadVerifications();
  }

  deleteVerification(v: ComplianceVerificationRow): void {
    if (!this.auth.canDeleteSampling()) {
      return;
    }
    if (!confirm(`¿Eliminar el muestreo #${v.id}? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.complianceService.deleteComplianceVerification(v.id).subscribe({
      next: () => {
        this.openFeedbackModal('Muestreo eliminado.', 'success');
        this.loadVerifications();
      },
      error: () => this.openFeedbackModal('No se pudo eliminar el muestreo.', 'error'),
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

  trackDetailRow(entry: DetailTableViewRow): number {
    return entry.row.id ?? entry.lineNo;
  }

  isEditingItem(entry: DetailTableViewRow): boolean {
    return this.editingItemId() === entry.row.id;
  }

  beginEditAgm(entry: DetailTableViewRow): void {
    if (!this.auth.hasPermission('sampling:edit')) {
      return;
    }
    const id = entry.row.id;
    if (id == null) {
      return;
    }
    this.editingItemId.set(id);
    this.editDraft.set(String(entry.row.sample_weight_agm ?? ''));
  }

  cancelEditItem(): void {
    this.editingItemId.set(null);
    this.editDraft.set('');
  }

  previewQiFromAgm(): string | null {
    const avg = this.detailPackageAvg();
    if (avg == null || this.editingItemId() == null) {
      return null;
    }
    const agm = Number(String(this.editDraft()).replace(',', '.'));
    if (!Number.isFinite(agm)) {
      return null;
    }
    return (agm - avg).toFixed(2);
  }

  saveEditItem(): void {
    const id = this.editingItemId();
    if (id == null) {
      return;
    }
    const val = Number(String(this.editDraft()).replace(',', '.'));
    if (!Number.isFinite(val)) {
      this.openFeedbackModal('Valor inválido para AGM', 'error');
      return;
    }
    const detId = this.selectedDetail()?.id;
    this.complianceService.updateItem(id, { sample_weight_agm: val }).subscribe({
      next: (res) => {
        this.cancelEditItem();
        if (detId != null) {
          this.complianceService.getComplianceVerificationDetail(detId).subscribe({
            next: (detail) => this.selectedDetail.set(detail),
          });
        }
        this.loadVerifications();
        this.openFeedbackModal(res.detail || 'Muestreo actualizado y reevaluado.', 'success');
      },
      error: () => this.openFeedbackModal('No se pudo guardar el AGM', 'error'),
    });
  }

  trackByVerificationId(_index: number, row: ComplianceVerificationRow): number {
    return row.id;
  }

  isStepValid(): boolean {
    if (this.step === 1) {
      const fields = [
        'market_destination',
        'product_id',
        'brand_id',
        'grammage_id',
        'machine_id',
        'lot_expires',
      ] as const;
      return this.applySamplerIdentity() && fields.every((f) => this.verificationForm.get(f)?.valid);
    }
    if (this.step === 2) {
      return this.packageWeights.valid;
    }
    return this.items.valid;
  }

  markCurrentStepAsTouched(): void {
    if (this.step === 1) {
      this.applySamplerIdentity();
      const fields = [
        'market_destination',
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
    const { dateFrom, dateTo } = this.appliedListFilters();
    this.complianceService.getComplianceVerifications(dateFrom, dateTo).subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.verifications.set([...list].sort((a, b) => b.id - a.id));
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
    this.verificationForm.reset({
      sampled: '',
      market_destination: null,
      product_id: null,
      brand_id: null,
      grammage_id: null,
      machine_id: null,
      lot_expires: '',
      package_average: '',
    });
    this.initPackageWeightSlots();
    this.applySamplerIdentity();

    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }

    for (let i = 0; i < SAMPLE_ITEM_COUNT; i++) {
      this.addItem();
    }
  }

  private initPackageWeightSlots(): void {
    const pw = this.packageWeights;
    while (pw.length > 0) {
      pw.removeAt(0);
    }
    for (let i = 0; i < PACKAGE_WEIGHT_SLOTS; i++) {
      pw.push(
        this.fb.control<string | number>('', [Validators.required, Validators.min(0.01)])
      );
    }
  }

  private applySamplerIdentity(): boolean {
    const name = this.auth.displayName();
    if (!name) {
      return false;
    }
    this.verificationForm.patchValue({ sampled: name }, { emitEvent: false });
    return true;
  }

  marketDestinationLabel(value: string | null | undefined): string {
    if (value === 'exportacion') {
      return 'Exportación';
    }
    if (value === 'nacional') {
      return 'Nacional';
    }
    return value?.trim() ? value : '—';
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
    this.resetDetailSort();
    this.cancelEditItem();
    this.detailPackageAvg.set(null);
    this.complianceService.getComplianceVerificationDetail(id).subscribe({
      next: (res) => {
        this.selectedDetail.set(res);
        this.complianceService.getComplianceVerificationPackageWeights(id).subscribe({
          next: (pw) => this.detailPackageAvg.set(pw.average_weight),
          error: () => this.detailPackageAvg.set(null),
        });
        queueMicrotask(() => showBootstrapModal('detailModal'));
      },
      error: (err) => console.error('Error al obtener detalle:', err),
    });
  }

  detailVerdictLabel(status: number | undefined): string {
    return status === 1 ? 'CUMPLE' : 'NO CUMPLE';
  }

  detailVerdictClass(status: number | undefined): string {
    return status === 1 ? 'bg-success-soft' : 'bg-danger-soft';
  }

  viewPackageWeights(id: number): void {
    this.selectedPackageWeightsId.set(id);
    this.editingPackageWeights.set(false);
    this.complianceService.getComplianceVerificationPackageWeights(id).subscribe({
      next: (res) => {
        this.selectedPackageWeights.set(res);
        queueMicrotask(() => showBootstrapModal('packageWeightsModal'));
      },
      error: (err) => console.error('Error al obtener pesos de empaque:', err),
    });
  }

  startEditPackageWeights(): void {
    if (!this.auth.canEditPackageWeights()) {
      return;
    }
    const pw = this.selectedPackageWeights();
    if (!pw) {
      return;
    }
    this.packageWeightsDraft.set(pw.package_weights.map((w) => String(w)));
    this.editingPackageWeights.set(true);
  }

  cancelEditPackageWeights(): void {
    this.editingPackageWeights.set(false);
    this.packageWeightsDraft.set([]);
  }

  updatePackageWeightDraft(index: number, value: string): void {
    this.packageWeightsDraft.update((draft) => {
      const next = [...draft];
      next[index] = value;
      return next;
    });
  }

  savePackageWeights(): void {
    const id = this.selectedPackageWeightsId();
    if (id == null) {
      return;
    }
    const parsed = this.packageWeightsDraft().map((v) => Number(String(v).replace(',', '.')));
    if (parsed.length === 0 || parsed.some((n) => !Number.isFinite(n) || n <= 0)) {
      this.openFeedbackModal('Cada peso de empaque debe ser un número mayor que cero.', 'error');
      return;
    }
    this.savingPackageWeights.set(true);
    this.complianceService.updatePackageWeights(id, parsed).subscribe({
      next: (res) => {
        this.savingPackageWeights.set(false);
        this.editingPackageWeights.set(false);
        this.selectedPackageWeights.set({
          package_weights: res.package_weights,
          average_weight: res.average_weight,
        });
        this.openFeedbackModal(res.detail, 'success');
        this.loadVerifications();
      },
      error: (err) => {
        this.savingPackageWeights.set(false);
        this.handleHttpError(err);
      },
    });
  }

  onSubmit(): void {
    if (!this.applySamplerIdentity()) {
      this.openFeedbackModal(
        'No se pudo identificar al muestreador. Verifique su sesión o solicite al administrador que configure su nombre completo.',
        'error'
      );
      return;
    }
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

  resetDetailSort(): void {
    this.detailSort.set(null);
  }

  toggleDetailSort(key: DetailTableSortKey): void {
    const cur = this.detailSort();
    if (!cur || cur.key !== key) {
      this.detailSort.set({ key, dir: 'asc' });
      return;
    }
    this.detailSort.set({ key, dir: cur.dir === 'asc' ? 'desc' : 'asc' });
  }

  detailSortIconClass(key: DetailTableSortKey): string {
    const s = this.detailSort();
    if (!s || s.key !== key) {
      return 'bi-arrow-down-up detail-sort-icon detail-sort-icon--idle';
    }
    return s.dir === 'asc' ? 'bi-sort-up detail-sort-icon' : 'bi-sort-down detail-sort-icon';
  }

  detailSortAriaLabel(key: DetailTableSortKey): string {
    const titles: Record<DetailTableSortKey, string> = {
      lineNo: 'número de ítem',
      agm: 'AGM',
      atm: 'ATM',
      qi: 'Qi',
      t1: 'T1',
      t2: 'T2',
    };
    const s = this.detailSort();
    if (!s || s.key !== key) {
      return `Ordenar por ${titles[key]}`;
    }
    const next = s.dir === 'asc' ? 'descendente' : 'ascendente';
    return `Orden ${s.dir === 'asc' ? 'ascendente' : 'descendente'} por ${titles[key]}. Clic para ${next}.`;
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
