import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { ApiError } from '../../models/auth.models';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  protected auth = inject(Auth);

  justRegistered = this.route.snapshot.queryParamMap.get('registered') === 'true';
  loading = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.loading.set(false),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const api = err.error as Partial<ApiError> | null;
        this.errorMessage.set(
          err.status === 0
            ? 'Cannot reach the server. Is the backend running?'
            : (api?.message ?? 'Something went wrong. Please try again.')
        );
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.form.reset();
  }
}