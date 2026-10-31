import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { BillOfMaterials } from './bom';

describe('BillOfMaterials', () => {
  let component: BillOfMaterials;
  let fixture: ComponentFixture<BillOfMaterials>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillOfMaterials],
      providers: [
        provideRouter([]),
        {
          provide: ProductsService,
          useValue: {
            getAll: () => of({ result: { documentItems: [], totalDocument: 0 } }),
          },
        },
        { provide: NotificationService, useValue: { error: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillOfMaterials);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
