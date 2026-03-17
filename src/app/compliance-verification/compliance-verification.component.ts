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
  verificationForm: FormGroup;
  step: number = 1;
  products: any[] = [];
  brands: any[] = [];
  grammages: any[] = [];
  machines: any[] = [];
  showForm: boolean = false;
  verifications: any[] = [];

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
      // SE ELIMINÓ: analyzed (Persona responsable)
      machine_id: [null, Validators.required],
      lot_expires: ['', Validators.required],
      package_weights: this.fb.array(
        Array(10).fill(0).map(() => this.fb.control('', [Validators.required, Validators.min(0.01)]))
      ),
      package_average: [{ value: '', disabled: true }],
      items: this.fb.array([])
    });
  }

  ngOnInit() {
    this.loadVerifications();
    this.loadCatalogs();
    this.packageWeights.valueChanges.subscribe(() => {
      this.calculatePackageAverage();
    });
  }

  // --- LÓGICA DE VALIDACIÓN POR PASOS ---

  isStepValid(): boolean {
    if (this.step === 1) {
      const fields = ['sampled', 'product_id', 'brand_id', 'grammage_id', 'machine_id', 'lot_expires'];
      return fields.every(f => this.verificationForm.get(f)?.valid);
    }
    if (this.step === 2) {
      return this.packageWeights.valid;
    }
    return this.items.valid;
  }

  markCurrentStepAsTouched() {
    if (this.step === 1) {
      const fields = ['sampled', 'product_id', 'brand_id', 'grammage_id', 'machine_id', 'lot_expires'];
      fields.forEach(f => this.verificationForm.get(f)?.markAsTouched());
    } else if (this.step === 2) {
      this.packageWeights.markAllAsTouched();
    } else {
      this.items.markAllAsTouched();
    }
    this.cdr.detectChanges();
  }

  nextStep() {
    if (this.isStepValid()) {
      this.step++;
    } else {
      this.markCurrentStepAsTouched();
      this.showModal('Por favor, complete todos los campos requeridos en esta sección.', 'error');
    }
  }

  prevStep() { this.step--; }

  // --- GETTERS Y AUXILIARES ---

  get items() { return this.verificationForm.get('items') as FormArray; }
  get packageWeights(): FormArray { return this.verificationForm.get('package_weights') as FormArray; }

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
        this.cdr.detectChanges();
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
    this.verificationForm.reset();

    const itemsArray = this.items;
    while (itemsArray.length !== 0) {
      itemsArray.removeAt(0);
    }

    for (let i = 0; i < 98; i++) {
      this.addItem();
    }

    this.cdr.detectChanges();
  }

  cancelSampling() {
    this.showForm = false;
    this.step = 1;
    this.verificationForm.reset();
    this.loadVerifications();
  }

  addItem() {
    this.items.push(this.fb.group({
      sample_weight_agm: ['', [Validators.required, Validators.min(0)]]
    }));
  }

  calculatePackageAverage() {
    const weights = this.packageWeights.value.map((v: any) => Number(v) || 0);
    const total = weights.reduce((a: number, b: number) => a + b, 0);
    const avg = weights.length > 0 ? total / weights.length : 0;
    this.verificationForm.patchValue({ package_average: avg.toFixed(2) }, { emitEvent: false });
  }

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
        // Agregamos un valor por defecto para 'analyzed' ya que el backend lo requiere pero lo quitamos del UI
        analyzed: rawForm.sampled,
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
          this.showModal(res.detail || '¡Verificación creada exitosamente!', 'success');
          this.cancelSampling();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    } else {
      this.markCurrentStepAsTouched();
      this.showModal('Por favor, complete todos los campos requeridos.', 'error');
    }
  }

  private handleError(err: any) {
    let errorMessage = 'Error en la solicitud';
    if (err.status === 422 && err.error?.detail) {
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
    this.modalType = type;
    this.cdr.detectChanges();

    const modalElement = document.getElementById('responseModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }
  obtenerResultadoT1(status: number): string {
    if (status === 2 || status === 3) {
      return 'NO CUMPLE';
    }
    return 'CUMPLE';
  }

  // Solo falla si es estrictamente status 3
  obtenerResultadoT2(status: number): string {
    if (status === 3) {
      return 'NO CUMPLE';
    }
    return 'CUMPLE';
  }

  // Colores: Rojo si hay cualquier error (2 o 3) en T1, o 3 en T2
  claseResultado(status: number, tipo: 'T1' | 'T2'): string {
    if (tipo === 'T1' && (status === 2 || status === 3)) return 'text-danger fw-bold';
    if (tipo === 'T2' && status === 3) return 'text-danger fw-bold';
    return 'text-success';
  }
}