import { Component, Inject, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private readonly snackBar: MatSnackBar,
    public dialog: MatDialog,
  ) {}

  /**
   * Presents a toast displaying the message with a green background
   * @param message Message to display
   * @example
   * this.notificationService.success("confirm oked");
   */
  success(message: string) {
    this.openSnackBar(message, '', 'success-snackbar');
  }

  /**
   * Presents a toast displaying the message with a red background
   * @param message Message to display
   * @example
   * this.notificationService.error("confirm canceled");
   */
  error(message: string) {
    this.openSnackBar(message, '', 'error-snackbar');
  }

  /**
   * Shows a confirmation modal, presenting the user with
   * an OK and Cancel button.
   * @param message Body of the modal
   * @param okCallback Optional function to call when the user clicks Ok
   * @param title Optional modal title
   * @param cancelCallback Option function to call when the user clicks Cancel
   * @example
   * this.notificationService.confirmation(
   *   'it will be gone forever',
   *   () => this.notificationService.success('confirm oked'),
   *   'Are you sure?',
   *   () => this.notificationService.error('confirm canceled'),
   * );
   */
  confirmation(
    message: string,
    okCallback: () => void,
    title = 'Are you sure?',
    cancelCallback: () => any = () => {},
    note?: string,
  ) {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '420px',
      maxWidth: '90vw',
      data: { message: message, title: title, note },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && okCallback) {
        okCallback();
      }
      if (!result && cancelCallback) {
        cancelCallback();
      }
    });
  }

  /**
   * Shows a modal, presenting the user with an OK button.
   * @param message Body of the modal
   * @param okCallback Optional function to call when the user clicks Ok
   * @param title Optional modal title
   * @example
   * this.notificationService.alert('an alert', 'notice', () => {
   *   this.notificationService.success('alert oked');
   * });
   */
  alert(message: string, title = 'Notice', okCallback: () => void = () => {}) {
    const dialogRef = this.dialog.open(AlertDialog, {
      width: '250px',
      data: { message: message, title: title },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && okCallback) {
        okCallback();
      }
    });
  }

  /**
   * Displays a toast with provided message
   * @param message Message to display
   * @param action Action text, e.g. Close, Done, etc
   * @param className Optional extra css class to apply
   * @param duration Optional number of MILLISECONDS to display the notification for
   */
  openSnackBar(message: string, action: string, className = '', duration = 1000) {
    this.snackBar.open(message, action, {
      duration: duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [className],
    });
  }
}

export interface DialogData {
  message: string;
  title: string;
  note?: string;
}

@Component({
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>
    <div mat-dialog-content>
      <p>{{ data.message }}</p>
      @if (data.note) {
        <p class="small text-muted mb-0"><strong>Note:</strong> {{ data.note }}</p>
      }
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()" cdkFocusInitial>Cancel</button>
      <button mat-flat-button color="primary" (click)="onYesClick()">Confirm</button>
    </div>
  `,
})
export class ConfirmationDialog {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}

@Component({
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>
    <div mat-dialog-content>
      {{ data.message }}
    </div>
    <div mat-dialog-actions>
      <button mat-flat-button (click)="onYesClick()" cdkFocusInitial>Ok</button>
    </div>
  `,
})
export class AlertDialog {
  constructor(
    public dialogRef: MatDialogRef<AlertDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {}

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}
