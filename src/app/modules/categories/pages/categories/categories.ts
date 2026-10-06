import { Component } from '@angular/core';
import { CategoryListComponent } from '../../components/category-list/category-list.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CategoryListComponent],
  templateUrl: './categories.html',
})
export class Categories {}
