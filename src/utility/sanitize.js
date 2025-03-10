import logger from './logger.js';

/**
 * Sanitizes user input to prevent injection attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  
  try {
    // Convert HTML entities
    const escaped = input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
      
    // Remove potential script tags and other risky patterns
    return escaped
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:/gi, '')
      // Add more dangerous patterns
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/url\s*\(/gi, 'url(')
      .trim();
  } catch (error) {
    logger.error('Error sanitizing input:', { error: error.message });
    return '';
  }
}

// Add a new function for different sanitization needs
export function sanitizeFileName(input) {
  if (!input || typeof input !== 'string') return '';
  
  try {
    // Remove any path traversal attempts and limit to safe characters
    return input
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .trim();
  } catch (error) {
    logger.error('Error sanitizing filename:', { error: error.message });
    return '';
  }
}