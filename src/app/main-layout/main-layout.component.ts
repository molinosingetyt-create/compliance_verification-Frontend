import { Component, inject, signal } from '@angular/core';
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
