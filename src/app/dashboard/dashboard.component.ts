import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ComplianceVerificationService } from '../services/compliance-verification.service';
import { CatalogService } from '../services/catalog.service';
import { DecimalMaxPipe } from '../core/decimal-max.pipe';
import { showBootstrapModal } from '../core/bootstrap-modal';
import type { CatalogEntity, PackagingArea, PackagingMachine } from '../models/catalog.model';
import type { ComplianceVerificationRow } from '../models/compliance.model';
import {
  EMPTY_DASHBOARD_FILTERS,
  aggregateByMachine,
  aggregateByProduct,
  applyDashboardFilters,
  buildMachineDeviationChartData,
  computeGlobalKpis,
  marketDestinationLabel,
  statusLabel,
  type DashboardFilters,
  type DashboardGroupRow,
} from './dashboard-metrics.util';
import { DashboardMachineDeviationChartComponent } from './dashboard-machine-deviation-chart.component';

type DashboardTab = 'machines' | 'products';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DecimalMaxPipe,
    DashboardMachineDeviationChartComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly compliance = inject(ComplianceVerificationService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly activeTab = signal<DashboardTab>('machines');
  readonly allRows = signal<ComplianceVerificationRow[]>([]);
  readonly filterValues = signal<DashboardFilters>({ ...EMPTY_DASHBOARD_FILTERS });

  readonly products = signal<CatalogEntity[]>([]);
  readonly brands = signal<CatalogEntity[]>([]);
  readonly machines = signal<PackagingMachine[]>([]);
  readonly packagingAreas = signal<PackagingArea[]>([]);

  /** Máquinas seleccionadas en el borrador del modal (se aplican al presionar "Aceptar"). */
  readonly draftMachineIds = signal<number[]>([]);
  readonly machinesMenuOpen = signal(false);

  readonly filterForm = this.fb.group({
    dateFrom: [''],
    dateTo: [''],
    packagingAreaId: [null as number | null],
    productId: [null as number | null],
    brandId: [null as number | null],
    marketDestination: ['' as '' | 'nacional' | 'exportacion'],
    status: [null as number | null],
  });

  private readonly draftPackagingAreaId = toSignal(this.filterForm.controls.packagingAreaId.valueChanges, {
    initialValue: null as number | null,
  });

  readonly activeFilterCount = computed(() => {
    const f = this.filterValues();
    return [
      f.dateFrom,
      f.dateTo,
      f.packagingAreaId,
      f.machineIds.length > 0 ? f.machineIds : null,
      f.productId,
      f.brandId,
      f.marketDestination,
      f.status,
    ].filter((v) => v != null && v !== '').length;
  });

  /** Máquinas disponibles para elegir en el modal: si hay área elegida (borrador), solo las de esa área. */
  readonly areaMachines = computed(() => {
    const areaId = this.draftPackagingAreaId();
    const all = this.machines();
    return areaId == null ? all : all.filter((m) => m.packaging_area_id === areaId);
  });

  readonly machinesSummaryLabel = computed(() => {
    const selected = this.draftMachineIds();
    if (selected.length === 0) {
      return 'Todas las máquinas';
    }
    if (selected.length === 1) {
      const m = this.areaMachines().find((x) => x.id === selected[0]);
      return m?.name ?? '1 seleccionada';
    }
    return `${selected.length} seleccionadas`;
  });

  readonly filteredRows = computed(() =>
    applyDashboardFilters(this.allRows(), this.filterValues(), this.machines())
  );

  readonly kpis = computed(() => computeGlobalKpis(this.filteredRows()));

  readonly machineGroups = computed(() => aggregateByMachine(this.filteredRows()));

  readonly productGroups = computed(() => aggregateByProduct(this.filteredRows()));

  readonly activeGroups = computed((): DashboardGroupRow[] =>
    this.activeTab() === 'machines' ? this.machineGroups() : this.productGroups()
  );

  readonly recentRows = computed(() => this.filteredRows().slice(0, 12));

  readonly machineDeviationChart = computed(() =>
    buildMachineDeviationChartData(this.filteredRows())
  );

  readonly marketDestinationLabel = marketDestinationLabel;
  readonly statusLabel = statusLabel;

  constructor() {
    // Si cambia el área en el borrador, descarta máquinas seleccionadas que ya no pertenezcan a ella.
    this.filterForm.controls.packagingAreaId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((areaId) => {
        if (areaId == null) {
          return;
        }
        const allowed = new Set(
          this.machines()
            .filter((m) => m.packaging_area_id === areaId)
            .map((m) => m.id)
        );
        this.draftMachineIds.update((ids) => ids.filter((id) => allowed.has(id)));
      });
  }

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadData();
  }

  setTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  /** Al abrir el modal, el formulario parte de lo último aplicado (cancelar no pierde nada). */
  openFiltersModal(): void {
    const f = this.filterValues();
    this.filterForm.reset({
      dateFrom: f.dateFrom ?? '',
      dateTo: f.dateTo ?? '',
      packagingAreaId: f.packagingAreaId,
      productId: f.productId,
      brandId: f.brandId,
      marketDestination: (f.marketDestination ?? '') as '' | 'nacional' | 'exportacion',
      status: f.status,
    });
    this.draftMachineIds.set([...f.machineIds]);
    showBootstrapModal('dashboardFiltersModal');
  }

  /** Aplica el borrador del modal contra el dashboard (todo se filtra sobre lo ya cargado). */
  applyFilters(): void {
    const v = this.filterForm.getRawValue();
    this.filterValues.set({
      dateFrom: v.dateFrom?.trim() || null,
      dateTo: v.dateTo?.trim() || null,
      packagingAreaId: v.packagingAreaId,
      machineIds: this.draftMachineIds(),
      productId: v.productId,
      brandId: v.brandId,
      marketDestination: v.marketDestination || null,
      status: v.status === 1 || v.status === 2 ? v.status : null,
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      dateFrom: '',
      dateTo: '',
      packagingAreaId: null,
      productId: null,
      brandId: null,
      marketDestination: '',
      status: null,
    });
    this.draftMachineIds.set([]);
    this.filterValues.set({ ...EMPTY_DASHBOARD_FILTERS });
  }

  toggleMachinesMenu(): void {
    this.machinesMenuOpen.update((v) => !v);
  }

  closeMachinesMenu(): void {
    this.machinesMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.machinesMenuOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeMachinesMenu();
    }
  }

  isMachineSelected(id: number): boolean {
    return this.draftMachineIds().includes(id);
  }

  toggleMachine(id: number): void {
    this.draftMachineIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  barWidth(pct: number): string {
    const clamped = Math.max(0, Math.min(100, pct));
    return `${clamped}%`;
  }

  complyBarClass(pct: number): string {
    if (pct >= 90) {
      return 'dashboard-bar__fill--ok';
    }
    if (pct >= 70) {
      return 'dashboard-bar__fill--warn';
    }
    return 'dashboard-bar__fill--bad';
  }

  private loadCatalogs(): void {
    this.catalog.getProducts().subscribe((data) => this.products.set(data));
    this.catalog.getBrands().subscribe((data) => this.brands.set(data));
    this.catalog.getMachines().subscribe((data) => this.machines.set(data));
    this.catalog.getPackagingAreas().subscribe((data) => this.packagingAreas.set(data));
  }

  private loadData(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.compliance.getComplianceVerifications().subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.allRows.set([...list].sort((a, b) => b.id - a.id));
        this.loading.set(false);
      },
      error: () => {
        this.allRows.set([]);
        this.loadError.set('No se pudieron cargar las verificaciones.');
        this.loading.set(false);
      },
    });
  }

}
