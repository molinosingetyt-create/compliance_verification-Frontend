import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** En vista móvil el menú lateral se abre/cierra con el botón hamburguesa */
  readonly mobileNavOpen = signal(false);

  readonly initials = computed(() => {
    const words = this.auth.displayName().trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return '?';
    }
    const first = words[0][0] ?? '';
    const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  });

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  onSidebarLinkClick(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      this.closeMobileNav();
    }
  }
}
