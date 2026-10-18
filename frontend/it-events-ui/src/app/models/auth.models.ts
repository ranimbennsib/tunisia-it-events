export type Occupation = 'Student' | 'Employee' | 'Freelancer' | 'JobSeeker';

export interface RegisterUserRequest {
  lastName: string;
  firstName: string;
  email: string;
  password: string;
  phoneNumber: string;
  occupation: Occupation;
  institution: string;
}

export interface RegisterOrganizerRequest {
  lastName: string;
  firstName: string;
  email: string;
  password: string;
  phoneNumber: string;
  organizationName: string;
  description: string;
  website?: string;
  logo: string;
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
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED';
  createdAt: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors: Record<string, string>;
  timestamp: string;
}