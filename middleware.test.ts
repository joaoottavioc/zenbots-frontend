import { isProtectedRoute } from './middleware';

describe('isProtectedRoute', () => {
  it('returns true for /meus-bots', () => {
    expect(isProtectedRoute('/meus-bots')).toBe(true);
  });

  it('returns true for /pedidos', () => {
    expect(isProtectedRoute('/pedidos')).toBe(true);
  });

  it('returns true for /produtos', () => {
    expect(isProtectedRoute('/produtos')).toBe(true);
  });

  it('returns true for /settings', () => {
    expect(isProtectedRoute('/settings')).toBe(true);
  });

  it('returns true for /pagamentos', () => {
    expect(isProtectedRoute('/pagamentos')).toBe(true);
  });

  it('returns true for /analytics', () => {
    expect(isProtectedRoute('/analytics')).toBe(true);
  });

  it('returns true for /suporte', () => {
    expect(isProtectedRoute('/suporte')).toBe(true);
  });

  it('returns true for /bots/novo', () => {
    expect(isProtectedRoute('/bots/novo')).toBe(true);
  });

  it('returns true for /whatsapp-callback', () => {
    expect(isProtectedRoute('/whatsapp-callback')).toBe(true);
  });

  it('returns false for /login', () => {
    expect(isProtectedRoute('/login')).toBe(false);
  });

  it('returns false for /cadastro', () => {
    expect(isProtectedRoute('/cadastro')).toBe(false);
  });

  it('returns false for /', () => {
    expect(isProtectedRoute('/')).toBe(false);
  });

  it('returns false for /esqueci-senha', () => {
    expect(isProtectedRoute('/esqueci-senha')).toBe(false);
  });
});
