/**
 * Bootstrap 5 (bundle UMD) expone el namespace en `window`.
 * Evita `declare var bootstrap` disperso en componentes.
 */
export function showBootstrapModal(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) {
    return;
  }
  const win = window as Window & {
    bootstrap?: { Modal: new (e: Element) => { show(): void } };
  };
  const ModalCtor = win.bootstrap?.Modal;
  if (!ModalCtor) {
    console.warn('Bootstrap Modal no está disponible en window.bootstrap');
    return;
  }
  new ModalCtor(el).show();
}
