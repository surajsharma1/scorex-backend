"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest test setup file
const globals_1 = require("@jest/globals");
// Mock mongoose to avoid database connections during tests
globals_1.jest.mock('mongoose', () => ({
    connect: globals_1.jest.fn().mockResolvedValue(true),
    disconnect: globals_1.jest.fn().mockResolvedValue(true),
    model: globals_1.jest.fn().mockReturnValue({}),
    Schema: globals_1.jest.fn().mockImplementation(() => ({
        pre: globals_1.jest.fn(),
        post: globals_1.jest.fn(),
        methods: {},
        statics: {},
        indexes: globals_1.jest.fn().mockReturnValue([]),
    })),
    Models: {},
}));
// Mock config
globals_1.jest.mock('../config/database', () => ({
    connectDB: globals_1.jest.fn().mockResolvedValue(true),
    disconnectDB: globals_1.jest.fn().mockResolvedValue(true),
}));
// Global test timeout
globals_1.jest.setTimeout(10000);
// Cleanup after each test
afterEach(() => {
    globals_1.jest.clearAllMocks();
});
