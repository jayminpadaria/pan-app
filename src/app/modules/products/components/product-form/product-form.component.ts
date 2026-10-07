import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Category } from '../../../../shared/interfaces/category.interface';
import {
  Product,
  ProductInput,
  ProductVariant,
  ProductVariantInput,
} from '../../../../shared/interfaces/product.interface';
import { CategoriesService } from '../../../../shared/services/categories.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { ProductVariantDialogComponent } from './product-variant-dialog.component';

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
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  readonly saving = signal(false);
  readonly loadingProduct = signal(false);
  readonly loadingCategories = signal(false);
  readonly isEdit = signal(false);
  readonly availableCategories = signal<Category[]>([]);
  readonly categorySearch = new FormControl('', { nonNullable: true });
  private productId: string | null = null;
  private readonly variantIds = new WeakMap<FormGroup<ProductVariantControls>, string | null>();
  readonly savingVariant = signal(false);

  readonly form = this.formBuilder.group({
    name: ['', Validators.required],
    sku: [''],
    brand: [''],
    description: [''],
    categories: this.formBuilder.control<string[]>([]),
    variants: this.formBuilder.array<FormGroup<ProductVariantControls>>([]),
  });

  get variants() {
    return this.form.controls.variants;
  }

  ngOnInit() {
    this.loadCategories();
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
        this.setVariants(res.result?.variants ?? []);
        this.loadingProduct.set(false);
      },
      error: () => {
        this.notification.error('Failed to load product.');
        this.router.navigate(['/app/products']);
        this.loadingProduct.set(false);
      },
    });
  }

  private addVariant(variant?: ProductVariant) {
    const group = this.formBuilder.group({
      sku: [variant?.sku ?? '', Validators.required],
      barcode: [variant?.barcode ?? '', Validators.required],
      weight: [variant?.weight ?? 0, [Validators.required, Validators.min(0)]],
      unit: [variant?.unit ?? '', Validators.required],
      sizeLabel: [variant?.sizeLabel ?? '', Validators.required],
    });
    this.variantIds.set(group, variant?._id ?? null);
    if (this.isEdit() && variant?._id) {
      group.disable();
    }
    this.variants.push(group);
    return group;
  }

  openVariantDialog(variant?: FormGroup<ProductVariantControls>) {
    if (this.savingVariant()) {
      return;
    }

    const dialogRef = this.dialog.open(ProductVariantDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { variant: variant?.getRawValue() },
    });
    dialogRef.afterClosed().subscribe((payload: ProductVariantInput | undefined) => {
      if (!payload) {
        return;
      }

      if (variant && (!this.isEdit() || !this.getVariantId(variant))) {
        variant.patchValue(payload);
        return;
      }

      if (!variant && !this.isEdit()) {
        this.addVariant(payload);
        return;
      }

      this.persistVariant(variant, payload);
    });
  }

  removeVariant(index: number) {
    const variant = this.variants.at(index);
    if (this.savingVariant()) {
      return;
    }
    const variantId = this.variantIds.get(variant);
    if (!variantId || !this.productId) {
      this.variants.removeAt(index);
      return;
    }

    this.savingVariant.set(true);
    this.productsService.removeVariant(this.productId, variantId).subscribe({
      next: () => {
        this.refreshVariants(
          'Variant removed successfully.',
          'Variant was removed, but the variant list could not be refreshed.',
        );
      },
      error: () => {
        this.notification.error('Failed to remove variant.');
        this.savingVariant.set(false);
      },
    });
  }

  getVariantId(variant: FormGroup<ProductVariantControls>) {
    return this.variantIds.get(variant) ?? null;
  }

  private persistVariant(
    variant: FormGroup<ProductVariantControls> | undefined,
    payload: ProductVariantInput,
  ) {
    if (!this.productId || this.savingVariant()) {
      return;
    }

    const variantId = variant ? this.getVariantId(variant) : null;
    if (variant && !variantId) {
      variant.patchValue(payload);
      return;
    }

    this.savingVariant.set(true);

    const request = variantId
      ? this.productsService.updateVariant(this.productId, variantId, payload)
      : this.productsService.addVariant(this.productId, payload);

    request.subscribe({
      next: () => {
        this.refreshVariants(
          'Variant saved successfully.',
          'Variant was saved, but the variant list could not be refreshed.',
        );
      },
      error: () => {
        this.notification.error('Failed to save variant.');
        this.savingVariant.set(false);
      },
    });
  }

  private refreshVariants(successMessage: string, failureMessage: string) {
    if (!this.productId) {
      this.notification.error(failureMessage);
      this.savingVariant.set(false);
      return;
    }

    this.productsService.getById(this.productId).subscribe({
      next: (response) => {
        const product = response.result;
        if (!product) {
          this.notification.error(failureMessage);
          this.savingVariant.set(false);
          return;
        }

        this.setVariants(product.variants ?? []);
        this.notification.success(successMessage);
        this.savingVariant.set(false);
      },
      error: () => {
        this.notification.error(failureMessage);
        this.savingVariant.set(false);
      },
    });
  }

  get selectedCategories() {
    return this.form.controls.categories.value;
  }

  filteredCategories() {
    const search = this.categorySearch.value.trim().toLocaleLowerCase();
    return this.availableCategories().filter(
      (category) =>
        !this.selectedCategories.includes(category._id) &&
        category.title.toLocaleLowerCase().includes(search),
    );
  }

  selectCategory(event: MatAutocompleteSelectedEvent) {
    const categoryId = event.option.value as string;
    if (!this.selectedCategories.includes(categoryId)) {
      this.form.controls.categories.setValue([...this.selectedCategories, categoryId]);
    }
    this.categorySearch.setValue('');
  }

  categoryLabel(categoryId: string) {
    return (
      this.availableCategories().find((category) => category._id === categoryId)?.title ??
      categoryId
    );
  }

  removeCategory(categoryId: string) {
    this.form.controls.categories.setValue(
      this.selectedCategories.filter((selected) => selected !== categoryId),
    );
  }

  isInvalid(name: string) {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  saveProduct() {
    const productControls = [
      this.form.controls.name,
      this.form.controls.sku,
      this.form.controls.brand,
      this.form.controls.description,
      this.form.controls.categories,
    ];
    if (this.isEdit() ? productControls.some((control) => control.invalid) : this.form.invalid) {
      if (this.isEdit()) {
        productControls.forEach((control) => control.markAsTouched());
      } else {
        this.form.markAllAsTouched();
      }
      return;
    }

    const values = this.form.getRawValue();
    const categories = values.categories.map((category) => category.trim()).filter(Boolean);
    const product: ProductInput = {
      name: values.name.trim(),
      ...(values.sku.trim() ? { sku: values.sku.trim() } : {}),
      ...(values.brand.trim() ? { brand: values.brand.trim() } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      categories,
      ...(!this.isEdit() ? { variants: values.variants } : {}),
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

  private loadCategories() {
    this.loadingCategories.set(true);
    this.categoriesService
      .getAll({
        filterList: [],
        sortHeader: 'title',
        sortDirection: 'ASC',
        page: 1,
        limit: 100,
        isPagination: false,
      })
      .subscribe({
        next: (res) => {
          this.availableCategories.set(res.result?.documentItems ?? []);
          this.loadingCategories.set(false);
        },
        error: () => {
          this.notification.error('Failed to load categories.');
          this.loadingCategories.set(false);
        },
      });
  }

  private patchProduct(product: Product) {
    this.form.patchValue({
      name: product.name,
      sku: product.sku ?? '',
      brand: product.brand ?? '',
      description: product.description ?? '',
      categories: product.categories ?? [],
    });
    this.variants.clear();
    product.variants?.forEach((variant) => this.addVariant(variant));
  }

  private setVariants(variants: ProductVariant[]) {
    this.variants.clear();
    variants.forEach((variant) => this.addVariant(variant));
  }
}
