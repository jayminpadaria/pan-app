import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BillOfMaterials,
  BillOfMaterialsInput,
} from '../../../../shared/interfaces/bill-of-materials.interface';
import { INVENTORY_UNIT, Product, ProductVariant } from '../../../../shared/interfaces/product.interface';
import { BillOfMaterialsService } from '../../../../shared/services/bill-of-materials.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';

interface BillOfMaterialsComponentControls {
  productId: FormControl<string>;
  productVariantId: FormControl<string>;
  quantity: FormControl<number>;
  inventoryUnit: FormControl<INVENTORY_UNIT>;
}

interface BillOfMaterialsFormControls {
  productId: FormControl<string>;
  productVariantId: FormControl<string>;
  outputQuantity: FormControl<number>;
  outputUnit: FormControl<INVENTORY_UNIT>;
  isActive: FormControl<boolean>;
  components: FormArray<FormGroup<BillOfMaterialsComponentControls>>;
}

@Component({
  selector: 'app-bill-of-materials-form',
  standalone: false,
  templateUrl: './bill-of-materials-form.component.html',
})
export class BillOfMaterialsFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly billOfMaterialsService = inject(BillOfMaterialsService);
  private readonly productsService = inject(ProductsService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly units = Object.values(INVENTORY_UNIT);
  readonly products = signal<Product[]>([]);
  readonly loadingProducts = signal(false);
  readonly loadingBom = signal(false);
  readonly saving = signal(false);
  readonly isEdit = signal(false);
  private bomId: string | null = null;

  readonly form: FormGroup<BillOfMaterialsFormControls> = this.formBuilder.group({
    productId: this.formBuilder.control('', Validators.required),
    productVariantId: this.formBuilder.control('', Validators.required),
    outputQuantity: this.formBuilder.control(1, [Validators.required, Validators.min(0.000001)]),
    outputUnit: this.formBuilder.control(INVENTORY_UNIT.PIECE, Validators.required),
    isActive: this.formBuilder.control(true),
    components: this.formBuilder.array<FormGroup<BillOfMaterialsComponentControls>>([
      this.createComponent(),
    ]),
  });

  get components(): FormArray<FormGroup<BillOfMaterialsComponentControls>> {
    return this.form.controls.components;
  }

  ngOnInit(): void {
    this.bomId = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(this.bomId !== null);
    this.loadProducts();
    if (this.bomId) this.loadBillOfMaterials(this.bomId);
  }

  variantsFor(productId: string): ProductVariant[] {
    return this.products().find((product) => product._id === productId)?.variants ?? [];
  }

  onOutputProductChange(): void {
    this.form.controls.productVariantId.setValue('');
  }

  onComponentProductChange(component: FormGroup<BillOfMaterialsComponentControls>): void {
    component.controls.productVariantId.setValue('');
  }

  addComponent(): void {
    this.components.push(this.createComponent());
  }

  removeComponent(index: number): void {
    if (this.components.length > 1) this.components.removeAt(index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: BillOfMaterialsInput = this.form.getRawValue();
    this.saving.set(true);
    const request = this.bomId
      ? this.billOfMaterialsService.update(this.bomId, payload)
      : this.billOfMaterialsService.create(payload);

    request.subscribe({
      next: (response) => {
        this.notification.success(response.message || 'Bill of materials saved successfully.');
        this.saving.set(false);
        this.router.navigate(['/app/bill-of-materials']);
      },
      error: () => {
        this.notification.error('Failed to save the bill of materials.');
        this.saving.set(false);
      },
    });
  }

  private createComponent(
    component?: BillOfMaterials['components'][number],
  ): FormGroup<BillOfMaterialsComponentControls> {
    return this.formBuilder.group({
      productId: this.formBuilder.control(component?.productId ?? '', Validators.required),
      productVariantId: this.formBuilder.control(
        component?.productVariantId ?? '',
        Validators.required,
      ),
      quantity: this.formBuilder.control(component?.quantity ?? 1, [
        Validators.required,
        Validators.min(0.000001),
      ]),
      inventoryUnit: this.formBuilder.control(
        component?.inventoryUnit ?? INVENTORY_UNIT.PIECE,
        Validators.required,
      ),
    });
  }

  private loadProducts(): void {
    this.loadingProducts.set(true);
    this.productsService
      .getAll({
        filterList: [],
        sortHeader: 'name',
        sortDirection: 'ASC',
        page: 1,
        limit: 500,
        isPagination: true,
      })
      .subscribe({
        next: (response) => {
          this.products.set(response.result?.documentItems ?? []);
          this.loadingProducts.set(false);
        },
        error: () => {
          this.notification.error('Failed to load products for the bill of materials.');
          this.loadingProducts.set(false);
        },
      });
  }

  private loadBillOfMaterials(id: string): void {
    this.loadingBom.set(true);
    this.billOfMaterialsService.getById(id).subscribe({
      next: (response) => {
        const bom = response.result;
        if (!bom) {
          this.notification.error('Bill of materials not found.');
          this.router.navigate(['/app/bill-of-materials']);
          return;
        }

        this.patchBillOfMaterials(bom);
        this.loadingBom.set(false);
      },
      error: () => {
        this.notification.error('Failed to load the bill of materials.');
        this.loadingBom.set(false);
        this.router.navigate(['/app/bill-of-materials']);
      },
    });
  }

  private patchBillOfMaterials(bom: BillOfMaterials): void {
    this.form.patchValue({
      productId: bom.productId,
      productVariantId: bom.productVariantId,
      outputQuantity: bom.outputQuantity,
      outputUnit: bom.outputUnit,
      isActive: bom.isActive,
    });
    this.components.clear();
    bom.components.forEach((component) => this.components.push(this.createComponent(component)));
  }
}
