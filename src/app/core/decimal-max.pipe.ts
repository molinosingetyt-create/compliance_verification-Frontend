import { Pipe, PipeTransform } from '@angular/core';
import { formatNumber } from '@angular/common';

/** Formatea números con hasta 2 decimales (sin forzar ceros finales). */
@Pipe({
  name: 'decimalMax',
  standalone: true,
})
export class DecimalMaxPipe implements PipeTransform {
  transform(value: number | string | null | undefined, maxFractionDigits = 2): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const num =
      typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));

    if (!Number.isFinite(num)) {
      return String(value);
    }

    const max = Math.min(Math.max(0, maxFractionDigits), 20);
    return formatNumber(num, 'en-US', `1.0-${max}`);
  }
}
