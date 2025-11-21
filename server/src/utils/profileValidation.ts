import { ValidationError } from './errors';

export class ProfileValidator {
  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }
  }

  /**
   * Validate name length and format
   */
  static validateName(name: string): void {
    if (name.length === 0) {
      throw new ValidationError('Name cannot be empty');
    }

    if (name.length > 100) {
      throw new ValidationError('Name must not exceed 100 characters');
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
      throw new ValidationError('Name contains invalid characters');
    }
  }

  /**
   * Validate theme preference
   */
  static validateTheme(theme: string): void {
    const validThemes = ['light', 'dark', 'system'];
    if (!validThemes.includes(theme)) {
      throw new ValidationError(`Theme must be one of: ${validThemes.join(', ')}`);
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: Express.Multer.File): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      throw new ValidationError('File size must not exceed 5MB');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError('File must be a valid image (JPEG, PNG, GIF, or WebP)');
    }
  }

  /**
   * Validate notification preferences
   */
  static validateNotificationPreferences(prefs: any): void {
    const validKeys = ['email', 'push', 'ideaUpdates', 'marketing', 'weeklyDigest'];

    for (const key of Object.keys(prefs)) {
      if (!validKeys.includes(key)) {
        throw new ValidationError(`Invalid notification preference key: ${key}`);
      }

      if (typeof prefs[key] !== 'boolean') {
        throw new ValidationError(`Notification preference ${key} must be a boolean`);
      }
    }
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Validate timezone
   */
  static validateTimezone(timezone: string): void {
    // Basic validation - in production, use a library like moment-timezone
    const timezoneRegex = /^[A-Z][a-z]+\/[A-Z][a-z]+$/;
    if (!timezoneRegex.test(timezone)) {
      throw new ValidationError('Invalid timezone format');
    }
  }

  /**
   * Validate language code
   */
  static validateLanguage(language: string): void {
    const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it', 'nl', 'ru', 'ja', 'ko', 'zh'];
    if (!validLanguages.includes(language)) {
      throw new ValidationError(`Language must be one of: ${validLanguages.join(', ')}`);
    }
  }
}