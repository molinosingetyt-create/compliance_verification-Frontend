import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ComplianceVerificationService } from '../services/compliance-verification.service';
import { CatalogService } from '../services/catalog.service';
declare var bootstrap: any;

@Component({
  selector: 'app-compliance-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compliance-verification.component.html',
  styleUrls: ['./compliance-verification.component.scss']
})
export class ComplianceVerificationComponent implements OnInit {
  verificationForm: FormGroup;
  responseMessage: string = '';
  products: any[] = [];
  brands: any[] = [];
  grammages: any[] = [];
  machines: any[] = [];
  modalMessage: string = '';
  modalType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private complianceService: ComplianceVerificationService,
    private catalogService: CatalogService
  ) {
    this.verificationForm = this.fb.group({
      sampled: ['', Validators.required],
      product_id: [null, Validators.required],
      brand_id: [null, Validators.required],
      grammage_id: [null, Validators.required],
      analyzed: ['', Validators.required],
      machine_id: [null, Validators.required],
      lot_expires: ['', Validators.required],
      items: this.fb.array([
        this.fb.group({
          sample_weight_agm: ['', Validators.required],
          average_weight: ['', Validators.required],
        })
      ])
    });
  }

  ngOnInit() {
    this.catalogService.getProducts().subscribe(res => this.products = res.data || res);
    this.catalogService.getBrands().subscribe(res => this.brands = res.data || res);
    this.catalogService.getGramages().subscribe(res => this.grammages = res.data || res);
    this.catalogService.getMachines().subscribe(res => this.machines = res.data || res);
  }

  get items() {
    return this.verificationForm.get('items') as FormArray;
  }

  addItem() {
    this.items.push(this.fb.group({
      sample_weight_agm: ['', Validators.required],
      average_weight: ['', Validators.required],
    }));
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  showModal(message: string, type: 'success' | 'error') {
    this.modalMessage = message;
    this.modalType = type;
    const modal = new bootstrap.Modal(document.getElementById('responseModal'));
    modal.show();
  }

  onSubmit() {
    if (this.verificationForm.valid) {
      this.complianceService.createComplianceVerification(this.verificationForm.value).subscribe({
        next: (res) => {
          this.showModal('¡Verificación creada exitosamente!', 'success');
          this.verificationForm.reset();
          while (this.items.length > 1) this.items.removeAt(0);
        },
        error: (err) => {
          let msg = 'Ocurrió un error inesperado.';
          if (err.status === 400 || err.status === 500) {
            if (err.error) {
              if (typeof err.error === 'string') {
                try {
                  const parsed = JSON.parse(err.error);
                  msg = parsed.detail || err.error;
                } catch {
                  msg = err.error;
                }
              } else if (err.error.detail) {
                msg = err.error.detail;
              }
            }
          }
          this.showModal(msg, 'error');
        }
      });
    }
  }
}
