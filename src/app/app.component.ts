import { Component } from '@angular/core';
import { ComplianceVerificationComponent } from './compliance-verification/compliance-verification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ComplianceVerificationComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Frontend';
}
