import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeText, sanitizeMessage } from '../src/utils/sanitize.js';

describe('Sanitization Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(escapeHtml('Hello & goodbye')).toBe('Hello &amp; goodbye');
      expect(escapeHtml('Safe text')).toBe('Safe text');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(null)).toBe(null);
      expect(escapeHtml(undefined)).toBe(undefined);
      expect(escapeHtml(123)).toBe(123);
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags and escape entities', () => {
      expect(sanitizeText('<p>Hello <b>world</b></p>')).toBe('Hello world');
      expect(sanitizeText('<script>alert("xss")</script>Safe')).toBe('alert(&quot;xss&quot;)Safe');
    });

    it('should limit text length', () => {
      const longText = 'a'.repeat(2000);
      expect(sanitizeText(longText, 100)).toHaveLength(100);
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
    });
  });

  describe('sanitizeMessage', () => {
    it('should sanitize chat messages', () => {
      expect(sanitizeMessage('<script>alert("hack")</script>Hello!')).toBe('alert(&quot;hack&quot;)Hello!');
    });

    it('should limit message length to 2000 chars', () => {
      const longMessage = 'a'.repeat(3000);
      expect(sanitizeMessage(longMessage)).toHaveLength(2000);
    });
  });
});