import { UserRole } from '../enums';

export interface IJwtPayload {
  sub: string;
  walletAddress: string;
  iat?: number;
  exp?: number;
}

export interface IAuthUser {
  id: string;
  walletAddress: string;
}

export interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  path?: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  meta: IPaginationMeta;
}

export interface IRequestWithUser extends Request {
  user: IAuthUser;
}
