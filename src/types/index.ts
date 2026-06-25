export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
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
  amountMinor: number;
  currency?: string;
  date: string | Date;
  merchant: string;
  categoryId?: string | null;
  confidence?: number;
  sourceType?: 'screenshot' | 'manual' | 'statement';
  notes?: string;
}

export interface CategoryMatcher {
  id: string;
  keywords: string[];
}
