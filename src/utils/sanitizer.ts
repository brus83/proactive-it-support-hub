
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input']
  });
};

export const sanitizeText = (text: string): string => {
  return text.replace(/[<>]/g, '').trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sanitizeSearchQuery = (query: string): string => {
  return query
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .replace(/[<>]/g, '')    // Remove HTML brackets
    .trim()
    .substring(0, 100);      // Limit length
};
