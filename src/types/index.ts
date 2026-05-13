import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  avatar?: string;
  provider: 'google' | 'yandex';
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface TransactionInput {
  amount: number;
  currency?: string;
  date: string | Date;
  merchant: string;
  categoryId?: string;
  confidence?: number;
  imageUrl?: string;
  notes?: string;
}

export interface CategoryMatcher {
  id: string;
  keywords: string[];
}
