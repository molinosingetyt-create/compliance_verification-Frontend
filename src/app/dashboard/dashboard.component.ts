import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComplianceVerificationService } from '../services/compliance-verification.service';
import { CatalogService } from '../services/catalog.service';
import { DecimalMaxPipe } from '../core/decimal-max.pipe';
import type { CatalogEntity, PackagingMachine } from '../models/catalog.model';
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

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly activeTab = signal<DashboardTab>('machines');
  readonly allRows = signal<ComplianceVerificationRow[]>([]);
  readonly filterValues = signal<DashboardFilters>({ ...EMPTY_DASHBOARD_FILTERS });

  readonly products = signal<CatalogEntity[]>([]);
  readonly brands = signal<CatalogEntity[]>([]);
  readonly machines = signal<PackagingMachine[]>([]);

  readonly filterForm = this.fb.group({
    dateFrom: [''],
    dateTo: [''],
    machineId: [null as number | null],
    productId: [null as number | null],
    brandId: [null as number | null],
    marketDestination: ['' as '' | 'nacional' | 'exportacion'],
    status: [null as number | null],
  });

  readonly filteredRows = computed(() =>
    applyDashboardFilters(this.allRows(), this.filterValues())
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
    this.filterForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.syncFiltersFromForm();
    });
  }

  ngOnInit(): void {
    this.syncFiltersFromForm();
    this.loadCatalogs();
    this.loadData();
  }

  setTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  clearFilters(): void {
    this.filterForm.reset({
      dateFrom: '',
      dateTo: '',
      machineId: null,
      productId: null,
      brandId: null,
      marketDestination: '',
      status: null,
    });
    this.filterValues.set({ ...EMPTY_DASHBOARD_FILTERS });
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

  private syncFiltersFromForm(): void {
    const v = this.filterForm.getRawValue();
    this.filterValues.set({
      dateFrom: v.dateFrom?.trim() || null,
      dateTo: v.dateTo?.trim() || null,
      machineId: v.machineId,
      productId: v.productId,
      brandId: v.brandId,
      marketDestination: v.marketDestination || null,
      status: v.status === 1 || v.status === 2 ? v.status : null,
    });
  }
}
