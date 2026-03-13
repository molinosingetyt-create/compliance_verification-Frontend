import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  // Variables existentes
  verificationForm: FormGroup;
  step: number = 1;
  products: any[] = [];
  brands: any[] = [];
  grammages: any[] = [];
  machines: any[] = [];
  showForm: boolean = false;
  verifications: any[] = [];

  // Variables para el Detalle
  detailItems: any[] = [];
  selectedDetail: any = null;

  modalMessage: string = '';
  modalType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private complianceService: ComplianceVerificationService,
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef
  ) {
    this.verificationForm = this.fb.group({
      sampled: ['', Validators.required],
      product_id: [null, Validators.required],
      brand_id: [null, Validators.required],
      grammage_id: [null, Validators.required],
      analyzed: ['', Validators.required],
      machine_id: [null, Validators.required],
      lot_expires: ['', Validators.required],
      package_weights: this.fb.array(
        Array(10).fill(0).map(() => this.fb.control('', Validators.required))
      ),
      package_average: [{ value: '', disabled: true }],
      items: this.fb.array([
        this.fb.group({
          sample_weight_agm: ['', Validators.required]
        })
      ])
    });
  }

  ngOnInit() {
    this.loadVerifications();
    this.loadCatalogs();
    this.packageWeights.valueChanges.subscribe(() => {
      this.calculatePackageAverage();
    });
  }
  loadCatalogs() {
    this.catalogService.getProducts().subscribe(res => this.products = res.data || res);
    this.catalogService.getBrands().subscribe(res => this.brands = res.data || res);
    this.catalogService.getGramages().subscribe(res => this.grammages = res.data || res);
    this.catalogService.getMachines().subscribe(res => this.machines = res.data || res);
  }

  loadVerifications() {
    this.complianceService.getComplianceVerifications().subscribe({
      next: (res: any) => {
        this.verifications = res.data || res || [];
        this.cdr.detectChanges(); // Forzamos a Angular a detectar los nuevos datos
      },
      error: (err) => {
        console.error("ERROR LOADING VERIFICATIONS:", err);
        this.verifications = [];
        this.cdr.detectChanges();
      }
    });
  }

  startSampling() {
    this.showForm = true;
    this.step = 1;
    this.cdr.detectChanges();
  }

  cancelSampling() {
    this.showForm = false;
    this.step = 1;
    this.verificationForm.reset();
    this.loadVerifications();
  }

  nextStep() { this.step++; }
  prevStep() { this.step--; }

  get items() { return this.verificationForm.get('items') as FormArray; }
  get packageWeights(): FormArray { return this.verificationForm.get('package_weights') as FormArray; }

  addItem() {
    this.items.push(this.fb.group({
      sample_weight_agm: ['', Validators.required]
    }));
  }

  removeItem(index: number) {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  calculatePackageAverage() {
    const weights = this.packageWeights.value.map((v: any) => Number(v) || 0);
    const total = weights.reduce((a: number, b: number) => a + b, 0);
    const avg = total / weights.length;
    this.verificationForm.patchValue({ package_average: avg.toFixed(2) }, { emitEvent: false });
  }/* 

  showModal(message: string, type: 'success' | 'error') {
    this.modalMessage = message;
    this.modalType = type;
    setTimeout(() => {
      const modalElement = document.getElementById('responseModal');
      if (modalElement) new bootstrap.Modal(modalElement).show();
    }, 100);
  } */

  viewDetail(id: number) {
    this.complianceService.getComplianceVerificationDetail(id).subscribe({
      next: (res: any) => {
        this.selectedDetail = res;
        this.detailItems = res.item_compliance_verifications || [];

        this.cdr.detectChanges();

        const modalElement = document.getElementById('detailModal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      },
      error: (err) => {
        console.error("Error al obtener detalle:", err);
      }
    });
  }

  onSubmit() {
    if (this.verificationForm.valid) {
      const rawForm = this.verificationForm.getRawValue();
      const globalAvg = rawForm.package_average;

      const formData = {
        ...rawForm,
        items: this.items.value.map((item: any) => {
          const diff = (Number(item.sample_weight_agm) - Number(globalAvg)).toFixed(2);
          return {
            sample_weight_agm: item.sample_weight_agm.toString(),
            average_weight: diff.toString()
          };
        })
      };

      this.complianceService.createComplianceVerification(formData).subscribe({
        next: (res: any) => {
          // 1. Mostramos la modal de éxito
          this.showModal(res.detail || '¡Verificación creada exitosamente!', 'success');

          // 2. Ejecutamos la limpieza y volvemos al listado
          // Esto pone showForm = false, resetea el form y llama a loadVerifications()
          this.cancelSampling();

          // 3. Forzamos la actualización de la vista
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    } else {
      this.verificationForm.markAllAsTouched();
      this.showModal('Por favor, complete todos los campos requeridos.', 'error');
    }
  }

  // Función auxiliar para procesar errores de validación 422
  private handleError(err: any) {
    let errorMessage = 'Error en la solicitud';

    if (err.status === 422 && err.error?.detail) {
      // Extraemos los mensajes del objeto de error de FastAPI
      errorMessage = err.error.detail.map((e: any) => {
        const field = e.loc[e.loc.length - 1];
        return `Campo "${field}": ${e.msg}`;
      }).join('\n');
    } else {
      errorMessage = err.error?.detail || 'Error inesperado en el servidor';
    }

    this.showModal(errorMessage, 'error');
  }

  showModal(message: string, type: 'success' | 'error') {
    this.modalMessage = message;
    this.modalType = type; // CRITICO: Esto debe cambiar a 'error'
    this.cdr.detectChanges(); // Asegura que el HTML reaccione al cambio de color

    const modalElement = document.getElementById('responseModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

}