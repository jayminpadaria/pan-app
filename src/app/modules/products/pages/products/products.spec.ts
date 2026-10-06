import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { Products } from './products';

describe('Products', () => {
  let component: Products;
  let fixture: ComponentFixture<Products>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Products],
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

    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
