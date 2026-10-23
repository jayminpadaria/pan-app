import { Component, effect, HostListener, inject, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from './shared/services/notification.service';
import { AuthService } from './shared/services/auth.service';
import { environment } from '../environments/environment';

const IDLE_TIMEOUT_MS = environment.idealTimeoutMs;
const WARNING_DURATION_SECONDS = environment.warningDurationSeconds;

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private idleTimeout?: number;
  private countdownInterval?: number;

  readonly showIdlePrompt = signal(false);
  readonly countdown = signal(WARNING_DURATION_SECONDS);
  readonly refreshing = signal(false);

  constructor() {
    effect(() => {
      if (this.auth.loggedIn()) {
        this.resetIdleTimer();
      } else {
        this.clearTimers();
        this.showIdlePrompt.set(false);
      }
    });
  }

  @HostListener('document:mousemove')
  @HostListener('document:mousedown')
  @HostListener('document:keydown')
  @HostListener('document:touchstart')
  @HostListener('document:scroll')
  onUserActivity(): void {
    if (this.auth.loggedIn() && !this.showIdlePrompt()) {
      this.resetIdleTimer();
    }
  }

  continueSession(): void {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    if (this.countdownInterval !== undefined) {
      window.clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }

    this.auth.refreshToken().subscribe({
      next: () => {
        this.showIdlePrompt.set(false);
        this.refreshing.set(false);
        this.resetIdleTimer();
      },
      error: () => this.expireSession(),
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private resetIdleTimer(): void {
    this.clearTimers();
    this.idleTimeout = window.setTimeout(() => this.showWarning(), IDLE_TIMEOUT_MS);
  }

  private showWarning(): void {
    this.showIdlePrompt.set(true);
    this.countdown.set(WARNING_DURATION_SECONDS);
    this.countdownInterval = window.setInterval(() => {
      const remaining = this.countdown() - 1;
      this.countdown.set(remaining);
      if (remaining <= 0) this.expireSession();
    }, 1000);
  }

  private expireSession(): void {
    this.clearTimers();
    this.showIdlePrompt.set(false);
    this.auth.logout();
    this.notification.error('Session expired. Please sign in again.');
    this.router.navigateByUrl('/signin');
  }

  private clearTimers(): void {
    if (this.idleTimeout !== undefined) {
      window.clearTimeout(this.idleTimeout);
      this.idleTimeout = undefined;
    }
    if (this.countdownInterval !== undefined) {
      window.clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }
}
