import { Occupation } from './auth.models';

export interface ProfileResponse {
  occupation?: Occupation | null;
  institution?: string | null;
  organizationName?: string | null;
  description?: string | null;
  website?: string | null;
  logo?: string | null;
  commissionRate?: number | null;   // read-only, shown if present
}

// Send only the fields of the user's role: the backend rejects unknown fields with a 400
export type UpdateProfileBody =
  | { occupation: Occupation; institution: string }
  | { organizationName: string; description: string; website: string; logo: string };

export interface UpdateAccountBody {
  lastName: string;
  firstName: string;
  phoneNumber: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}