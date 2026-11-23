import { AccountResponse, Role } from './auth.models';

export type AccountStatus = AccountResponse['accountStatus'];

// Same shape as the PageResponse of the account-service
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
}

export interface AccountFilter {
  role: Role | '';
  status: AccountStatus | '';
  search: string;
  page: number;
  size: number;
}