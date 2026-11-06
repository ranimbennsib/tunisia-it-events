// Valeurs attendues par le profile-service
export type Occupation = 'student' | 'employee' | 'freelancer' | 'jobSeeker';

export type Role = 'USER' | 'ORGANIZER' | 'ADMIN';

export interface UserProfileData {
  occupation: Occupation;
  institution: string;
}

export interface OrganizerProfileData {
  organizationName: string;
  description: string;
  website?: string;
  logo: string;
}

// POST /api/auth/register (un seul endpoint pour les deux rôles)
export interface RegisterRequest {
  lastName: string;
  firstName: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: 'USER' | 'ORGANIZER';
  profile: UserProfileData | OrganizerProfileData;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AccountResponse {
  id: number;
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber: string;
  role: Role;
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED';
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  account: AccountResponse;
}

export interface ApiError {
  status: number;
  message: string;
  errors: Record<string, string>;
  timestamp: string;
}