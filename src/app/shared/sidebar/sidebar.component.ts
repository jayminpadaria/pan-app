import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { allMenu } from '../config/app-menu';
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

  private readonly role = this.auth.getUserIdentity()?.role?.trim().toLowerCase() ?? 'user';
  readonly menu = allMenu.filter(
    (item) => item.isEnabled && item.roles.includes(this.role),
  );

  logout() {
    this.auth.logout();
    this.router.navigate(['/signin']);
  }
  isCollapsed = true;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
