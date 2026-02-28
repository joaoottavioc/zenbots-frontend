import { describe, it, expect } from "vitest";
import { isAllowedOrigin } from "./connect-whatsapp-button";

describe("isAllowedOrigin", () => {
  const selfOrigin = "https://myapp.example.com";

  it("allows self origin", () => {
    expect(isAllowedOrigin(selfOrigin, selfOrigin)).toBe(true);
  });

  it("allows https://www.facebook.com", () => {
    expect(isAllowedOrigin("https://www.facebook.com", selfOrigin)).toBe(true);
  });

  it("allows https://facebook.com", () => {
    expect(isAllowedOrigin("https://facebook.com", selfOrigin)).toBe(true);
  });

  it("allows https://m.facebook.com", () => {
    expect(isAllowedOrigin("https://m.facebook.com", selfOrigin)).toBe(true);
  });

  it("allows https://web.facebook.com", () => {
    expect(isAllowedOrigin("https://web.facebook.com", selfOrigin)).toBe(true);
  });

  it("rejects http://facebook.com (not https)", () => {
    expect(isAllowedOrigin("http://facebook.com", selfOrigin)).toBe(false);
  });

  it("rejects https://evil-facebook.com", () => {
    expect(isAllowedOrigin("https://evil-facebook.com", selfOrigin)).toBe(false);
  });

  it("rejects https://facebook.com.evil.com", () => {
    expect(isAllowedOrigin("https://facebook.com.evil.com", selfOrigin)).toBe(false);
  });

  it("rejects https://notfacebook.com", () => {
    expect(isAllowedOrigin("https://notfacebook.com", selfOrigin)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isAllowedOrigin("", selfOrigin)).toBe(false);
  });

  it("rejects random non-URL string", () => {
    expect(isAllowedOrigin("not-a-url", selfOrigin)).toBe(false);
  });

  it("rejects javascript: protocol", () => {
    expect(isAllowedOrigin("javascript:alert(1)", selfOrigin)).toBe(false);
  });
});
