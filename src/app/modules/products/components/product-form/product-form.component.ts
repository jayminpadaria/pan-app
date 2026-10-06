import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Product, ProductInput, ProductVariant } from '../../../../shared/interfaces/product.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';

interface ProductVariantControls {
  sku: FormControl<string>;
  barcode: FormControl<string>;
  weight: FormControl<number>;
  unit: FormControl<string>;
  sizeLabel: FormControl<string>;
}

@Component({
  selector: 'app-product-form',
  standalone: false,
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly productsService = inject(ProductsService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly loadingProduct = signal(false);
  readonly isEdit = signal(false);
  private productId: string | null = null;

  readonly form = this.formBuilder.group({
    name: ['', Validators.required],
    sku: [''],
    brand: [''],
    description: [''],
    categories: [''],
    variants: this.formBuilder.array<FormGroup<ProductVariantControls>>([]),
  });

  get variants() {
    return this.form.controls.variants;
  }

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (!this.productId) {
      return;
    }

    this.isEdit.set(true);
    this.loadingProduct.set(true);
    this.productsService.getById(this.productId).subscribe({
      next: (res) => {
        if (!res.result) {
          this.notification.error('Product not found.');
          this.router.navigate(['/app/products']);
          return;
        }

        this.patchProduct(res.result);
        this.loadingProduct.set(false);
      },
      error: () => {
        this.notification.error('Failed to load product.');
        this.router.navigate(['/app/products']);
      },
    });
  }

  addVariant(variant?: ProductVariant) {
    this.variants.push(
      this.formBuilder.group({
        sku: [variant?.sku ?? '', Validators.required],
        barcode: [variant?.barcode ?? '', Validators.required],
        weight: [variant?.weight ?? 0, [Validators.required, Validators.min(0)]],
        unit: [variant?.unit ?? '', Validators.required],
        sizeLabel: [variant?.sizeLabel ?? '', Validators.required],
      }),
    );
  }

  removeVariant(index: number) {
    this.variants.removeAt(index);
  }

  isInvalid(name: string) {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isVariantInvalid(variant: FormGroup<ProductVariantControls>, name: keyof ProductVariantControls) {
    const control = variant.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  saveProduct() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const categories = values.categories
      .split(',')
      .map((category) => category.trim())
      .filter(Boolean);
    const product: ProductInput = {
      name: values.name.trim(),
      ...(values.sku.trim() ? { sku: values.sku.trim() } : {}),
      ...(values.brand.trim() ? { brand: values.brand.trim() } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      categories,
      variants: values.variants,
    };

    const request =
      this.isEdit() && this.productId
        ? this.productsService.update(this.productId, product)
        : this.productsService.create(product);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notification.success(
          this.isEdit() ? 'Product updated successfully.' : 'Product created successfully.',
        );
        this.router.navigate(['/app/products']);
      },
      error: () => {
        this.notification.error(
          this.isEdit() ? 'Failed to update product.' : 'Failed to create product.',
        );
        this.saving.set(false);
      },
    });
  }

  private patchProduct(product: Product) {
    this.form.patchValue({
      name: product.name,
      sku: product.sku ?? '',
      brand: product.brand ?? '',
      description: product.description ?? '',
      categories: product.categories?.join(', ') ?? '',
    });
    this.variants.clear();
    product.variants?.forEach((variant) => this.addVariant(variant));
  }
}
