import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { ApiError, Occupation } from '../../models/auth.models';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  role = signal<'user' | 'organizer'>('user');
  loading = signal(false);
  errorMessage = signal('');
  fieldErrors = signal<Record<string, string>>({});

  occupations: Occupation[] = ['Student', 'Employee', 'Freelancer', 'JobSeeker'];

  form = this.fb.nonNullable.group({
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    // participant only
    occupation: ['Student' as Occupation],
    institution: [''],
    // organizer only
    organizationName: [''],
    description: [''],
    website: [''],
    logo: ['']
  });

  constructor() {
    this.setRole('user');
  }

  setRole(role: 'user' | 'organizer'): void {
    this.role.set(role);
    this.errorMessage.set('');
    this.fieldErrors.set({});
    const c = this.form.controls;
    if (role === 'user') {
      c.institution.setValidators([Validators.required]);
      c.organizationName.clearValidators();
      c.description.clearValidators();
      c.logo.clearValidators();
    } else {
      c.institution.clearValidators();
      c.organizationName.setValidators([Validators.required]);
      c.description.setValidators([Validators.required, Validators.maxLength(1000)]);
      c.logo.setValidators([Validators.required]);
    }
    Object.values(c).forEach(control => control.updateValueAndValidity());
  }

  showError(name: string): boolean {
    if (this.fieldErrors()[name]) return true;
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  message(name: string): string {
    const server = this.fieldErrors()[name];
    if (server) return server;
    const errors = this.form.get(name)?.errors;
    if (!errors) return '';
    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Enter a valid email address';
    if (errors['minlength']) return `At least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `At most ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return name === 'phoneNumber' ? 'Exactly 8 digits' : 'Invalid format';
    return 'Invalid value';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.fieldErrors.set({});

    const v = this.form.getRawValue();
    const common = {
      lastName: v.lastName,
      firstName: v.firstName,
      email: v.email,
      password: v.password,
      phoneNumber: v.phoneNumber
    };

    const request$ =
      this.role() === 'user'
        ? this.auth.registerUser({ ...common, occupation: v.occupation, institution: v.institution })
        : this.auth.registerOrganizer({
            ...common,
            organizationName: v.organizationName,
            description: v.description,
            website: v.website || undefined,
            logo: v.logo
          });

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const api = err.error as Partial<ApiError> | null;
        if (err.status === 0) {
          this.errorMessage.set('Cannot reach the server. Is the backend running?');
        } else {
          this.errorMessage.set(api?.message ?? 'Something went wrong. Please try again.');
          this.fieldErrors.set(api?.errors ?? {});
        }
      }
    });
  }
}