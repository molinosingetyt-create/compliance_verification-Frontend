import { Routes } from '@angular/router';
import { ComplianceVerificationComponent } from './compliance-verification/compliance-verification.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { ConfiguracionShellComponent } from './configuracion/configuracion-shell.component';
import { ConfigUsuariosComponent } from './configuracion/config-usuarios.component';
import { ConfigPerfilesComponent } from './configuracion/config-perfiles.component';
import { ConfigPermisosComponent } from './configuracion/config-permisos.component';
import { ConfigProductosComponent } from './configuracion/config-productos.component';
import { ConfigMarcasComponent } from './configuracion/config-marcas.component';
import { ConfigGramajesComponent } from './configuracion/config-gramajes.component';
import { ConfigAreasComponent } from './configuracion/config-areas.component';
import { ConfigUnidadesHoraComponent } from './configuracion/config-unidades-hora.component';
import { ConfigLotesComponent } from './configuracion/config-lotes.component';
import { authGuard } from './core/auth.guard';
import { anyPermissionGuard, permissionGuard } from './core/permission.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, title: 'Ingreso' },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard',
        canActivate: [permissionGuard('sampling:view', '/configuracion/productos')],
      },
      {
        path: 'compliance',
        component: ComplianceVerificationComponent,
        title: 'Verificaciones',
        canActivate: [permissionGuard('sampling:view', '/configuracion/productos')],
      },
      {
        path: 'configuracion',
        component: ConfiguracionShellComponent,
        canActivate: [anyPermissionGuard('users:manage', 'catalog:manage')],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'productos' },
          {
            path: 'usuarios',
            component: ConfigUsuariosComponent,
            title: 'Usuarios · Configuración',
            canActivate: [permissionGuard('users:manage', '/configuracion/productos')],
          },
          {
            path: 'perfiles',
            component: ConfigPerfilesComponent,
            title: 'Perfiles · Configuración',
            canActivate: [permissionGuard('users:manage', '/configuracion/productos')],
          },
          {
            path: 'permisos',
            component: ConfigPermisosComponent,
            title: 'Permisos · Configuración',
            canActivate: [permissionGuard('users:manage', '/configuracion/productos')],
          },
          {
            path: 'productos',
            component: ConfigProductosComponent,
            title: 'Productos · Configuración',
            canActivate: [permissionGuard('catalog:manage', '/compliance')],
          },
          {
            path: 'marcas',
            component: ConfigMarcasComponent,
            title: 'Marcas · Configuración',
            canActivate: [permissionGuard('catalog:manage', '/compliance')],
          },
          {
            path: 'gramajes',
            component: ConfigGramajesComponent,
            title: 'Gramajes · Configuración',
            canActivate: [permissionGuard('catalog:manage', '/compliance')],
          },
          {
            path: 'areas',
            component: ConfigAreasComponent,
            title: 'Áreas · Configuración',
            canActivate: [permissionGuard('catalog:manage', '/compliance')],
          },
          {
            path: 'unidades-hora',
            component: ConfigUnidadesHoraComponent,
            title: 'Unidades/hora · Configuración',
            canActivate: [permissionGuard('catalog:manage', '/compliance')],
          },
          {
            path: 'tamanos-lote',
            component: ConfigLotesComponent,
            title: 'Tamaños de lote · Configuración',
            canActivate: [permissionGuard('catalog:manage', '/compliance')],
          },
        ],
      },
      { path: 'admin', redirectTo: 'configuracion/usuarios', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
