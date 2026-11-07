import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { ProfileApi } from '../../services/profile-api';
import { Occupation } from '../../models/auth.models';
import { UpdateProfileBody } from '../../models/profile.models';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  private api = inject(ProfileApi);
  private fb = inject(FormBuilder);
  protected auth = inject(Auth);

  isOrganizer = this.auth.currentAccount()?.role === 'ORGANIZER';
  isUser = this.auth.currentAccount()?.role === 'USER';
  occupations: Occupation[] = ['student', 'employee', 'freelancer', 'jobSeeker'];
  commissionRate = signal<number | null>(null);

  loading = signal(true);
  accountMsg = signal(''); accountErr = signal('');
  profileMsg = signal(''); profileErr = signal('');
  passwordMsg = signal(''); passwordErr = signal('');

  accountForm = this.fb.nonNullable.group({
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]]
  });

  profileForm = this.fb.nonNullable.group({
    occupation: ['student' as Occupation],
    institution: ['', Validators.maxLength(150)],
    organizationName: ['', Validators.maxLength(150)],
    description: ['', Validators.maxLength(2000)],
    website: ['', Validators.maxLength(255)],
    logo: ['', Validators.maxLength(500)]
  });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]]
  });

  constructor() {
    this.api.getAccount().subscribe({
      next: a => this.accountForm.patchValue({
        lastName: a.lastName, firstName: a.firstName, phoneNumber: a.phoneNumber
      }),
      error: () => this.accountErr.set('Could not load your account.')
    });
    if (this.isUser || this.isOrganizer) {
      this.api.getProfile().subscribe({
        next: p => {
          this.profileForm.patchValue({
            occupation: p.occupation ?? 'student',
            institution: p.institution ?? '',
            organizationName: p.organizationName ?? '',
            description: p.description ?? '',
            website: p.website ?? '',
            logo: p.logo ?? ''
          });
          this.commissionRate.set(p.commissionRate ?? null);
          this.loading.set(false);
        },
        error: err => { this.profileErr.set(this.msg(err)); this.loading.set(false); }
      });
    } else {
      this.loading.set(false);
    }
  }

  saveAccount(): void {
    if (this.accountForm.invalid) { this.accountForm.markAllAsTouched(); return; }
    this.accountMsg.set(''); this.accountErr.set('');
    const body = this.accountForm.getRawValue();
    this.api.updateAccount(body).subscribe({
      next: () => {
        this.auth.updateStoredAccount(body);
        this.accountMsg.set('Account updated.');
      },
      error: err => this.accountErr.set(this.msg(err))
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.profileMsg.set(''); this.profileErr.set('');
    const v = this.profileForm.getRawValue();
    const body: UpdateProfileBody = this.isOrganizer
      ? { organizationName: v.organizationName, description: v.description, website: v.website, logo: v.logo }
      : { occupation: v.occupation, institution: v.institution };
    this.api.updateProfile(body).subscribe({
      next: () => this.profileMsg.set('Profile updated.'),
      error: err => this.profileErr.set(this.msg(err))
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.passwordMsg.set(''); this.passwordErr.set('');
    this.api.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => { this.passwordMsg.set('Password changed.'); this.passwordForm.reset(); },
      error: err => this.passwordErr.set(this.msg(err))
    });
  }

  private msg(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Cannot reach the server.';
    const api = err.error as { message?: string; errors?: Record<string, string> } | null;
    const fields = api?.errors ? Object.entries(api.errors).map(([k, v]) => `${k}: ${v}`).join(' | ') : '';
    return [api?.message, fields].filter(Boolean).join(' - ') || `Error ${err.status}`;
  }
}