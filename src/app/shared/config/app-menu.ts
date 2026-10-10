export interface AppMenuItem {
  label: string;
  link: string;
  icon: string;
  isEnabled: boolean;
  roles: readonly string[];
}

export const allMenu: readonly AppMenuItem[] = [
  {
    label: 'Dashboard',
    link: '/app/dashboard',
    icon: 'bi-speedometer2',
    isEnabled: true,
    roles: ['admin', 'user'],
  },
  {
    label: 'Users',
    link: '/app/users',
    icon: 'bi-people',
    isEnabled: true,
    roles: ['admin'],
  },
  {
    label: 'Products',
    link: '/app/products',
    icon: 'bi-box-seam',
    isEnabled: true,
    roles: ['admin'],
  },
  {
    label: 'Purchases',
    link: '/app/purchases',
    icon: 'bi-receipt',
    isEnabled: true,
    roles: ['admin'],
  },
  {
    label: 'Sales',
    link: '/app/sales',
    icon: 'bi-cart-check',
    isEnabled: true,
    roles: ['admin', 'user'],
  },
  {
    label: 'Reports',
    link: '/app/reports',
    icon: 'bi-graph-up',
    isEnabled: false,
    roles: ['admin'],
  },
  {
    label: 'Categories',
    link: '/app/categories',
    icon: 'bi-tags',
    isEnabled: true,
    roles: ['admin'],
  },
  {
    label: 'Suppliers',
    link: '/app/suppliers',
    icon: 'bi-truck',
    isEnabled: true,
    roles: ['admin'],
  },
  {
    label: 'Customers',
    link: '/app/customers',
    icon: 'bi-person-vcard',
    isEnabled: true,
    roles: ['admin'],
  },
];
