import { Routes } from '@angular/router';
import { ComplianceVerificationComponent } from './compliance-verification/compliance-verification.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'compliance' },
  {
    path: 'compliance',
    component: ComplianceVerificationComponent,
    title: 'Verificación de cumplimiento de contenido neto',
  },
  { path: '**', redirectTo: 'compliance' },
];
