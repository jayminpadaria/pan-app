import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../shared/services/auth.service';
import { REPORT_TABS } from '../../report-tabs';

@Component({
  imports: [CommonModule, MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-reports',
  standalone: true,
  templateUrl: './reports.html',
})
export class Reports {
  private readonly role =
    inject(AuthService).getUserIdentity()?.role?.trim().toLowerCase() ?? 'user';

  readonly reportTabs = REPORT_TABS.filter((tab) => tab.roles.includes(this.role));
}
