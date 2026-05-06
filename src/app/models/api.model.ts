/** Respuesta típica de listados del API (productos, marcas, etc.). */
export interface ApiListResponse<T> {
  data: T[];
  message?: string;
}

export function unwrapList<T>(res: T[] | ApiListResponse<T> | null | undefined): T[] {
  if (res == null) {
    return [];
  }
  return Array.isArray(res) ? res : res.data ?? [];
}
