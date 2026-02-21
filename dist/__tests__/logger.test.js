"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Logger utility tests
const logger_1 = __importDefault(require("../utils/logger"));
describe('Logger Utility', () => {
    describe('logger', () => {
        it('should have required logging methods', () => {
            expect(typeof logger_1.default.info).toBe('function');
            expect(typeof logger_1.default.error).toBe('function');
            expect(typeof logger_1.default.warn).toBe('function');
            expect(typeof logger_1.default.debug).toBe('function');
        });
        it('should log info messages without throwing', () => {
            expect(() => {
                logger_1.default.info('Test info message');
            }).not.toThrow();
        });
        it('should log error messages without throwing', () => {
            expect(() => {
                logger_1.default.error('Test error message');
            }).not.toThrow();
        });
        it('should log warning messages without throwing', () => {
            expect(() => {
                logger_1.default.warn('Test warning message');
            }).not.toThrow();
        });
        it('should log debug messages without throwing', () => {
            expect(() => {
                logger_1.default.debug('Test debug message');
            }).not.toThrow();
        });
        it('should log with metadata', () => {
            expect(() => {
                logger_1.default.info('Test message', { userId: '123', action: 'test' });
            }).not.toThrow();
        });
        it('should log with string message and meta object', () => {
            expect(() => {
                logger_1.default.info('User logged in', { userId: 'abc123', timestamp: new Date().toISOString() });
            }).not.toThrow();
        });
        it('should handle error logging with stack trace', () => {
            const error = new Error('Test error');
            expect(() => {
                logger_1.default.error('Error occurred', error);
            }).not.toThrow();
        });
    });
});
//# sourceMappingURL=logger.test.js.map