/** Extrae mensaje de error del API FastAPI (`detail` string). */
export function httpErrorMessage(err: unknown, fallback: string): string {
  const e = err as { error?: { detail?: string | Array<{ msg?: string }> } };
  const d = e?.error?.detail;
  if (typeof d === 'string') {
    return d;
  }
  if (Array.isArray(d) && d.length > 0) {
    return d.map((x) => x.msg ?? '').filter(Boolean).join('; ') || fallback;
  }
  return fallback;
}
