// Logger utility tests
import logger from '../utils/logger';

describe('Logger Utility', () => {
  describe('logger', () => {
    it('should have required logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages without throwing', () => {
      expect(() => {
        logger.info('Test info message');
      }).not.toThrow();
    });

    it('should log error messages without throwing', () => {
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();
    });

    it('should log warning messages without throwing', () => {
      expect(() => {
        logger.warn('Test warning message');
      }).not.toThrow();
    });

    it('should log debug messages without throwing', () => {
      expect(() => {
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should log with metadata', () => {
      expect(() => {
        logger.info('Test message', { userId: '123', action: 'test' });
      }).not.toThrow();
    });

    it('should log with string message and meta object', () => {
      expect(() => {
        logger.info('User logged in', { userId: 'abc123', timestamp: new Date().toISOString() });
      }).not.toThrow();
    });

    it('should handle error logging with stack trace', () => {
      const error = new Error('Test error');
      expect(() => {
        logger.error('Error occurred', error);
      }).not.toThrow();
    });
  });
});
