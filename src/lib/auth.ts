import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'admin_auth';
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

// Segredo usado para assinar o cookie. Se ADMIN_SESSION_SECRET não existir,
// usa a própria senha (trocar a senha invalida todas as sessões).
function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD || '';
  return typeof password === 'string' && expected !== '' && safeEqual(password, expected);
}

// Token no formato "<expiraEm>.<assinatura>"
export function createSessionToken(): string {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isAuthenticated(request: NextRequest): boolean {
  if (!getSecret()) return false;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) return false;
  if (!safeEqual(signature, sign(expiresAt))) return false;
  return Number(expiresAt) > Date.now();
}

export function sessionCookie(value: string, maxAge: number): string {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
}
