// Input sanitization utilities
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/[&<>"'/]/g, (s) => HTML_ESCAPE_MAP[s]);
}

export function sanitizeText(text, maxLength = 1000) {
  if (typeof text !== 'string') return '';
  
  // Remove any HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '');
  
  // Escape remaining HTML entities
  const escaped = escapeHtml(withoutHtml);
  
  // Trim and limit length
  return escaped.trim().slice(0, maxLength);
}

export function sanitizeMessage(content) {
  return sanitizeText(content, 2000); // Max 2000 chars for messages
}

export function sanitizeStoryText(content) {
  return sanitizeText(content, 500); // Max 500 chars for story text
}

export function sanitizeName(name) {
  return sanitizeText(name, 100); // Max 100 chars for names
}