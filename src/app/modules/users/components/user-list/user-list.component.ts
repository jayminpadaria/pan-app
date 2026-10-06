import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, merge } from 'rxjs';
import { ListFilter } from '../../../../shared/interfaces/list.interface';
import { User } from '../../../../shared/interfaces/user.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { UsersService } from '../../../../shared/services/users.service';

const DEFAULT_SORT = { header: 'createdAt', direction: 'DESC' };

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'name',
    'primaryEmail',
    'primaryPhone',
    'role',
    'isActive',
    'createdAt',
    'actions',
  ];
  readonly roles = ['admin', 'user'];
  readonly dataSource = new MatTableDataSource<User>([]);

  readonly search = new FormControl('', { nonNullable: true });
  readonly role = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });
  readonly startDate = new FormControl('', { nonNullable: true });
  readonly endDate = new FormControl('', { nonNullable: true });

  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly loading = signal(false);
  readonly sortHeader = signal(DEFAULT_SORT.header);
  readonly sortDirection = signal(DEFAULT_SORT.direction);

  ngOnInit() {
    merge(
      this.search.valueChanges.pipe(debounceTime(300)),
      this.role.valueChanges,
      this.status.valueChanges,
      this.startDate.valueChanges,
      this.endDate.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.load();
  }

  get hasFilters() {
    return !!(
      this.search.value ||
      this.role.value ||
      this.status.value ||
      this.startDate.value ||
      this.endDate.value
    );
  }

  clearFilters() {
    const options = { emitEvent: false };
    this.search.setValue('', options);
    this.role.setValue('', options);
    this.status.setValue('', options);
    this.startDate.setValue('', options);
    this.endDate.setValue('', options);
    this.page.set(1);
    this.load();
  }

  fullName(user: User) {
    return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
  }

  onPage(event: PageEvent) {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.load();
  }

  onSort(sort: Sort) {
    this.sortHeader.set(sort.direction ? sort.active : DEFAULT_SORT.header);
    this.sortDirection.set(sort.direction ? sort.direction.toUpperCase() : DEFAULT_SORT.direction);
    this.page.set(1);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.usersService
      .getAll({
        filterList: this.buildFilterList(),
        sortHeader: this.sortHeader(),
        sortDirection: this.sortDirection(),
        page: this.page(),
        limit: this.limit(),
        isPagination: true,
      })
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.result?.documentItems ?? [];
          this.total.set(res.result?.totalDocument ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Failed to load users.');
          this.loading.set(false);
        },
      });
  }

  private buildFilterList(): ListFilter[] {
    const filters: ListFilter[] = [
      {
        columnName: ['firstName', 'middleName', 'lastName', 'primaryEmail', 'primaryPhone'],
        type: 'search',
        value: this.search.value.trim(),
      },
    ];
    if (this.startDate.value || this.endDate.value) {
      filters.push({
        columnName: 'createdAt',
        type: 'filterDateRange',
        value: {
          startDate: this.startDate.value ? `${this.startDate.value}T00:00:00.000Z` : null,
          endDate: this.endDate.value ? `${this.endDate.value}T23:59:59.999Z` : null,
        },
      });
    }
    if (this.role.value) {
      filters.push({ columnName: 'role', type: 'filterName', value: [this.role.value] });
    }
    if (this.status.value) {
      filters.push({
        columnName: 'isActive',
        type: 'filterName',
        value: [this.status.value === 'active'],
      });
    }
    return filters;
  }
}
