import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-reports',
  standalone: true,
  templateUrl: './reports.html',
})
export class Reports {}
