import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly menu = [
    { label: 'Dashboard', link: '/app/dashboard', icon: 'bi-speedometer2' },
    { label: 'Users', link: '/app/users', icon: 'bi-people' },
  ];

  logout() {
    this.auth.logout();
    this.router.navigate(['/signin']);
  }
  isCollapsed = false;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
