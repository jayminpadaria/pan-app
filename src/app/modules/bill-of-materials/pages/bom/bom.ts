import { Component } from '@angular/core';
import { BillOfMaterialsListComponent } from '../../components/bill-of-materials-list/bill-of-materials-list.component';

@Component({
  imports: [BillOfMaterialsListComponent],
  selector: 'app-bill-of-materials',
  standalone: true,
  styleUrl: './bom.scss',
  templateUrl: './bom.html',
})
export class BillOfMaterials {}
