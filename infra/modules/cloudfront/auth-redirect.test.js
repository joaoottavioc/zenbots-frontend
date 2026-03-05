import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the CloudFront Function source and extract the handler
const source = readFileSync(
  join(__dirname, 'auth-redirect.js'),
  'utf-8'
);

// Evaluate the function in a closure to get a reference to `handler`
// CloudFront Functions export a top-level `function handler(event)`
const handler = new Function(source + '\nreturn handler;')();

function makeEvent(uri, cookies = {}) {
  const cookieObj = {};
  for (const [key, value] of Object.entries(cookies)) {
    cookieObj[key] = { value };
  }
  return {
    request: {
      uri,
      cookies: cookieObj,
    },
  };
}

describe('CloudFront Function: auth-redirect', () => {
  describe('protected routes — dual cookie check', () => {
    it('allows access when both cookies are present', () => {
      const event = makeEvent('/pedidos', {
        zenbots_auth: '1',
        access_token: 'some-jwt-value',
      });
      const result = handler(event);
      // Should return the request (pass-through), not a redirect
      expect(result.uri).toBe('/pedidos.html');
      expect(result.statusCode).toBeUndefined();
    });

    it('redirects when only zenbots_auth is present (no access_token)', () => {
      const event = makeEvent('/pedidos', { zenbots_auth: '1' });
      const result = handler(event);
      expect(result.statusCode).toBe(302);
      expect(result.headers.location.value).toBe(
        '/login?redirect=%2Fpedidos'
      );
    });

    it('redirects when only access_token is present (no zenbots_auth)', () => {
      const event = makeEvent('/pedidos', { access_token: 'some-jwt' });
      const result = handler(event);
      expect(result.statusCode).toBe(302);
      expect(result.headers.location.value).toBe(
        '/login?redirect=%2Fpedidos'
      );
    });

    it('redirects when neither cookie is present', () => {
      const event = makeEvent('/pedidos');
      const result = handler(event);
      expect(result.statusCode).toBe(302);
      expect(result.headers.location.value).toBe(
        '/login?redirect=%2Fpedidos'
      );
    });
  });

  describe('all protected prefixes', () => {
    const prefixes = [
      '/meus-bots',
      '/pedidos',
      '/produtos',
      '/settings',
      '/pagamentos',
      '/analytics',
      '/suporte',
      '/bots',
      '/whatsapp-callback',
    ];

    for (const prefix of prefixes) {
      it(`redirects ${prefix} without cookies`, () => {
        const result = handler(makeEvent(prefix));
        expect(result.statusCode).toBe(302);
      });

      it(`allows ${prefix} with both cookies`, () => {
        const event = makeEvent(prefix, {
          zenbots_auth: '1',
          access_token: 'jwt',
        });
        const result = handler(event);
        expect(result.statusCode).toBeUndefined();
      });
    }
  });

  describe('sub-paths of protected routes', () => {
    it('protects /bots/novo', () => {
      const result = handler(makeEvent('/bots/novo'));
      expect(result.statusCode).toBe(302);
    });

    it('allows /bots/novo with both cookies', () => {
      const event = makeEvent('/bots/novo', {
        zenbots_auth: '1',
        access_token: 'jwt',
      });
      const result = handler(event);
      expect(result.uri).toBe('/bots/novo.html');
    });
  });

  describe('public routes', () => {
    it('allows /login without cookies', () => {
      const result = handler(makeEvent('/login'));
      expect(result.statusCode).toBeUndefined();
      expect(result.uri).toBe('/login.html');
    });

    it('allows /cadastro without cookies', () => {
      const result = handler(makeEvent('/cadastro'));
      expect(result.statusCode).toBeUndefined();
      expect(result.uri).toBe('/cadastro.html');
    });

    it('allows /esqueci-senha without cookies', () => {
      const result = handler(makeEvent('/esqueci-senha'));
      expect(result.statusCode).toBeUndefined();
      expect(result.uri).toBe('/esqueci-senha.html');
    });
  });

  describe('root redirect', () => {
    it('redirects / to /login', () => {
      const result = handler(makeEvent('/'));
      expect(result.statusCode).toBe(302);
      expect(result.headers.location.value).toBe('/login');
    });

    it('redirects empty string to /login', () => {
      const result = handler(makeEvent(''));
      expect(result.statusCode).toBe(302);
      expect(result.headers.location.value).toBe('/login');
    });
  });

  describe('URL rewriting', () => {
    it('appends .html to paths without extension', () => {
      const event = makeEvent('/login');
      const result = handler(event);
      expect(result.uri).toBe('/login.html');
    });

    it('removes trailing slash before appending .html', () => {
      const event = makeEvent('/login/');
      const result = handler(event);
      expect(result.uri).toBe('/login.html');
    });

    it('does not modify paths with file extensions', () => {
      const event = makeEvent('/styles.css');
      const result = handler(event);
      expect(result.uri).toBe('/styles.css');
    });

    it('does not modify paths to static assets', () => {
      const event = makeEvent('/_next/static/chunks/main.js');
      const result = handler(event);
      expect(result.uri).toBe('/_next/static/chunks/main.js');
    });
  });
});
