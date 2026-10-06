import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Category, CategoryInput } from '../../../../shared/interfaces/category.interface';
import { CategoriesService } from '../../../../shared/services/categories.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-category-form',
  standalone: false,
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent implements OnInit {
  private readonly categoriesService = inject(CategoriesService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly loadingCategory = signal(false);
  readonly isEdit = signal(false);
  private categoryId: string | null = null;

  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', Validators.required],
    description: [''],
  });

  ngOnInit() {
    this.categoryId = this.route.snapshot.paramMap.get('id');
    if (!this.categoryId) {
      return;
    }

    this.isEdit.set(true);
    this.loadingCategory.set(true);
    this.categoriesService.getById(this.categoryId).subscribe({
      next: (res) => {
        if (!res.result) {
          this.notification.error('Category not found.');
          this.router.navigate(['/app/categories']);
          return;
        }

        this.patchCategory(res.result);
        this.loadingCategory.set(false);
      },
      error: () => {
        this.notification.error('Failed to load category.');
        this.router.navigate(['/app/categories']);
      },
    });
  }

  isInvalid(name: 'title') {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  saveCategory() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const category: CategoryInput = {
      title: value.title.trim(),
      ...(value.description.trim() ? { description: value.description.trim() } : {}),
    };
    const request =
      this.isEdit() && this.categoryId
        ? this.categoriesService.update(this.categoryId, category)
        : this.categoriesService.create(category);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notification.success(
          this.isEdit() ? 'Category updated successfully.' : 'Category created successfully.',
        );
        this.router.navigate(['/app/categories']);
      },
      error: () => {
        this.notification.error(
          this.isEdit() ? 'Failed to update category.' : 'Failed to create category.',
        );
        this.saving.set(false);
      },
    });
  }

  private patchCategory(category: Category) {
    this.form.patchValue({
      title: category.title,
      description: category.description ?? '',
    });
  }
}
