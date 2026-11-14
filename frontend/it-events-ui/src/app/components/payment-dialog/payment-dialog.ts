import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PaymentApi, toPaymentFailure } from '../../services/payment-api';
import { PaymentResult, brandLabel } from '../../models/payment.models';

@Component({
  selector: 'app-payment-dialog',
  imports: [DecimalPipe],
  templateUrl: './payment-dialog.html',
  styleUrl: './payment-dialog.css'
})
export class PaymentDialog {
  private api = inject(PaymentApi);

  registrationId = input.required<number>();
  eventTitle = input<string>('');

  paid = output<PaymentResult>();
  closed = output<void>();

  number = signal('');
  expiry = signal('');
  cvv = signal('');

  busy = signal(false);
  error = signal('');
  errorField = signal<string | null>(null);
  result = signal<PaymentResult | null>(null);

  brandLabel = brandLabel;

  onNumber(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    this.number.set(digits.replace(/(.{4})/g, '$1 ').trim());
  }

  onExpiry(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    this.expiry.set(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  }

  onCvv(value: string): void {
    this.cvv.set(value.replace(/\D/g, '').slice(0, 4));
  }

  private fail(field: string, message: string): void {
    this.errorField.set(field);
    this.error.set(message);
  }

  submit(): void {
    if (this.busy()) return;
    this.error.set('');
    this.errorField.set(null);

    const digits = this.number().replace(/\s/g, '');
    const match = /^(\d{2})\/(\d{2})$/.exec(this.expiry());

    if (digits.length < 13) {
      this.fail('number', 'Enter a valid card number.');
      return;
    }
    if (!match || Number(match[1]) < 1 || Number(match[1]) > 12) {
      this.fail('expiry', 'Enter the expiry date as MM/YY.');
      return;
    }
    if (this.cvv().length < 3) {
      this.fail('cvv', 'Enter the security code.');
      return;
    }

    this.busy.set(true);
    this.api
      .pay(this.registrationId(), {
        number: digits,
        expMonth: Number(match[1]),
        expYear: 2000 + Number(match[2]),
        cvv: this.cvv()
      })
      .subscribe({
        next: r => {
          // On n'a plus besoin des données de carte : on les efface.
          this.number.set('');
          this.expiry.set('');
          this.cvv.set('');
          this.result.set(r);
          this.busy.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const failure = toPaymentFailure(err);
          this.error.set(failure.message);
          this.errorField.set(failure.field ?? null);
          this.busy.set(false);
        }
      });
  }
}