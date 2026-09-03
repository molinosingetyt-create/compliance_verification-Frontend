import type { ComplianceVerificationRow, MarketDestination } from '../models/compliance.model';
import type { PackagingMachine } from '../models/catalog.model';

export interface DashboardFilters {
  dateFrom: string | null;
  dateTo: string | null;
  packagingAreaId: number | null;
  machineIds: number[];
  productId: number | null;
  brandId: number | null;
  marketDestination: MarketDestination | '' | null;
  status: 1 | 2 | null;
}

export interface DashboardKpis {
  total: number;
  complyCount: number;
  complyPct: number;
  avgT1: number;
  avgT2: number;
  avgUnderNominalPct: number;
  avgNetWeight: number;
  avgGrossWeight: number;
}

export interface DashboardGroupRow {
  key: string;
  label: string;
  count: number;
  complyCount: number;
  complyPct: number;
  avgT1: number;
  avgT2: number;
  avgUnderNominalPct: number;
  avgNetWeight: number;
  avgStdDev: number;
}

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  dateFrom: null,
  dateTo: null,
  packagingAreaId: null,
  machineIds: [],
  productId: null,
  brandId: null,
  marketDestination: null,
  status: null,
};

function parseRowDate(createdAt: string): Date | null {
  const normalized = createdAt.trim().replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function applyDashboardFilters(
  rows: ComplianceVerificationRow[],
  filters: DashboardFilters,
  machines: PackagingMachine[] = []
): ComplianceVerificationRow[] {
  const areaMachineIds =
    filters.packagingAreaId != null
      ? new Set(
          machines
            .filter((m) => m.packaging_area_id === filters.packagingAreaId)
            .map((m) => m.id)
        )
      : null;

  return rows.filter((row) => {
    if (filters.machineIds.length > 0) {
      if (row.machine_id == null || !filters.machineIds.includes(row.machine_id)) {
        return false;
      }
    } else if (areaMachineIds != null) {
      if (row.machine_id == null || !areaMachineIds.has(row.machine_id)) {
        return false;
      }
    }
    if (filters.productId != null && row.product_id !== filters.productId) {
      return false;
    }
    if (filters.brandId != null && row.brand_id !== filters.brandId) {
      return false;
    }
    if (filters.marketDestination && row.market_destination !== filters.marketDestination) {
      return false;
    }
    if (filters.status != null && row.status !== filters.status) {
      return false;
    }
    const rowDate = parseRowDate(row.created_at);
    if (rowDate && filters.dateFrom) {
      if (toDateOnly(rowDate) < filters.dateFrom) {
        return false;
      }
    }
    if (rowDate && filters.dateTo) {
      if (toDateOnly(rowDate) > filters.dateTo) {
        return false;
      }
    }
    return true;
  });
}

export function computeGlobalKpis(rows: ComplianceVerificationRow[]): DashboardKpis {
  const total = rows.length;
  if (total === 0) {
    return {
      total: 0,
      complyCount: 0,
      complyPct: 0,
      avgT1: 0,
      avgT2: 0,
      avgUnderNominalPct: 0,
      avgNetWeight: 0,
      avgGrossWeight: 0,
    };
  }
  const complyCount = rows.filter((r) => r.status === 1).length;
  const sumT1 = rows.reduce((a, r) => a + (r.t1_errors_count ?? 0), 0);
  const sumT2 = rows.reduce((a, r) => a + (r.t2_errors_count ?? 0), 0);
  const sumUnder = rows.reduce((a, r) => a + (r.percentage_under_nominal ?? 0), 0);
  const sumNet = rows.reduce((a, r) => a + (r.avg_net_weight ?? 0), 0);
  const sumGross = rows.reduce((a, r) => a + (r.avg_gross_weight ?? 0), 0);
  return {
    total,
    complyCount,
    complyPct: Math.round((complyCount / total) * 1000) / 10,
    avgT1: Math.round((sumT1 / total) * 100) / 100,
    avgT2: Math.round((sumT2 / total) * 100) / 100,
    avgUnderNominalPct: Math.round((sumUnder / total) * 100) / 100,
    avgNetWeight: Math.round((sumNet / total) * 100) / 100,
    avgGrossWeight: Math.round((sumGross / total) * 100) / 100,
  };
}

function aggregateByKey(
  rows: ComplianceVerificationRow[],
  keyFn: (r: ComplianceVerificationRow) => string,
  labelFn: (r: ComplianceVerificationRow) => string
): DashboardGroupRow[] {
  const map = new Map<
    string,
    {
      label: string;
      rows: ComplianceVerificationRow[];
    }
  >();

  for (const row of rows) {
    const key = keyFn(row);
    if (!key) {
      continue;
    }
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      map.set(key, { label: labelFn(row), rows: [row] });
    }
  }

  const groups: DashboardGroupRow[] = [];
  for (const [key, { label, rows: groupRows }] of map) {
    const count = groupRows.length;
    const complyCount = groupRows.filter((r) => r.status === 1).length;
    const sumT1 = groupRows.reduce((a, r) => a + (r.t1_errors_count ?? 0), 0);
    const sumT2 = groupRows.reduce((a, r) => a + (r.t2_errors_count ?? 0), 0);
    const sumUnder = groupRows.reduce((a, r) => a + (r.percentage_under_nominal ?? 0), 0);
    const sumNet = groupRows.reduce((a, r) => a + (r.avg_net_weight ?? 0), 0);
    const sumStd = groupRows.reduce((a, r) => a + (r.standard_deviation ?? 0), 0);
    groups.push({
      key,
      label,
      count,
      complyCount,
      complyPct: Math.round((complyCount / count) * 1000) / 10,
      avgT1: Math.round((sumT1 / count) * 100) / 100,
      avgT2: Math.round((sumT2 / count) * 100) / 100,
      avgUnderNominalPct: Math.round((sumUnder / count) * 100) / 100,
      avgNetWeight: Math.round((sumNet / count) * 100) / 100,
      avgStdDev: Math.round((sumStd / count) * 10000) / 10000,
    });
  }

  return groups.sort((a, b) => b.count - a.count);
}

export function aggregateByMachine(rows: ComplianceVerificationRow[]): DashboardGroupRow[] {
  return aggregateByKey(
    rows,
    (r) => (r.machine_id != null ? String(r.machine_id) : r.machine_name ?? ''),
    (r) => r.machine_name ?? 'Sin máquina'
  );
}

export function aggregateByProduct(rows: ComplianceVerificationRow[]): DashboardGroupRow[] {
  return aggregateByKey(
    rows,
    (r) => (r.product_id != null ? String(r.product_id) : r.product_name ?? ''),
    (r) => {
      const parts = [r.product_name, r.brand_name].filter(Boolean);
      return parts.length ? parts.join(' · ') : 'Sin producto';
    }
  );
}

export function marketDestinationLabel(value: string | null | undefined): string {
  if (value === 'exportacion') {
    return 'Exportación';
  }
  if (value === 'nacional') {
    return 'Nacional';
  }
  return value?.trim() ? value : '—';
}

export function statusLabel(status: number | undefined): string {
  return status === 1 ? 'CUMPLE' : 'NO CUMPLE';
}

export interface MachineDeviationSeries {
  machineKey: string;
  machineLabel: string;
  color: string;
  /** Promedio diario de desviación estándar (g); null si no hubo muestreo ese día */
  values: Array<number | null>;
}

export interface MachineDeviationChartData {
  labels: string[];
  daysIso: string[];
  series: MachineDeviationSeries[];
  hasData: boolean;
}

const CHART_LINE_COLORS = [
  '#0066cc',
  '#d6661b',
  '#198754',
  '#c1272d',
  '#a37f3e',
  '#103847',
  '#e8c04c',
  '#6f42c1',
  '#20c997',
  '#fd7e14',
];

function rowToDayKey(createdAt: string): string | null {
  const d = parseRowDate(createdAt);
  return d ? toDateOnly(d) : null;
}

function formatDayLabel(isoDay: string): string {
  const [y, m, day] = isoDay.split('-').map(Number);
  if (!y || !m || !day) {
    return isoDay;
  }
  const dd = String(day).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm}/${String(y).slice(-2)}`;
}

/** Serie temporal: desviación estándar promedio por máquina y día (respeta filas ya filtradas). */
export function buildMachineDeviationChartData(
  rows: ComplianceVerificationRow[],
  maxMachines = 10
): MachineDeviationChartData {
  const bucket = new Map<string, { sum: number; count: number; label: string }>();
  const machineMeta = new Map<string, { label: string; count: number }>();

  for (const row of rows) {
    const day = rowToDayKey(row.created_at);
    const machineKey =
      row.machine_id != null ? String(row.machine_id) : (row.machine_name ?? '').trim();
    if (!day || !machineKey) {
      continue;
    }
    const std = Number(row.standard_deviation);
    if (!Number.isFinite(std)) {
      continue;
    }
    const label = row.machine_name ?? 'Sin máquina';
    const bKey = `${day}|${machineKey}`;
    const prev = bucket.get(bKey);
    if (prev) {
      prev.sum += std;
      prev.count += 1;
    } else {
      bucket.set(bKey, { sum: std, count: 1, label });
    }
    const meta = machineMeta.get(machineKey);
    if (meta) {
      meta.count += 1;
    } else {
      machineMeta.set(machineKey, { label, count: 1 });
    }
  }

  const daysIso = [...new Set([...bucket.keys()].map((k) => k.split('|')[0]))].sort();
  const topMachineKeys = [...machineMeta.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxMachines)
    .map(([key]) => key);

  const series: MachineDeviationSeries[] = topMachineKeys.map((machineKey, idx) => {
    const label = machineMeta.get(machineKey)?.label ?? machineKey;
    const values = daysIso.map((day) => {
      const cell = bucket.get(`${day}|${machineKey}`);
      if (!cell) {
        return null;
      }
      return Math.round((cell.sum / cell.count) * 10000) / 10000;
    });
    return {
      machineKey,
      machineLabel: label,
      color: CHART_LINE_COLORS[idx % CHART_LINE_COLORS.length],
      values,
    };
  });

  const hasData = series.some((s) => s.values.some((v) => v != null));

  return {
    labels: daysIso.map(formatDayLabel),
    daysIso,
    series,
    hasData,
  };
}
