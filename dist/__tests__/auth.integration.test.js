"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = __importDefault(require("../server"));
const User_1 = __importDefault(require("../models/User"));
describe('Auth API Integration Tests', () => {
    beforeAll(async () => {
        // Connect to test database if not connected
        if (mongoose_1.default.connection.readyState === 0) {
            await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scorex-test');
        }
    });
    afterAll(async () => {
        // Clean up and close connection
        await User_1.default.deleteMany({});
        await mongoose_1.default.connection.close();
    });
    beforeEach(async () => {
        // Clear users before each test
        await User_1.default.deleteMany({});
    });
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            };
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(201);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('username', 'testuser');
            expect(response.body.user).toHaveProperty('email', 'test@example.com');
            expect(response.body.user).not.toHaveProperty('password');
        });
        it('should return 400 for invalid data', async () => {
            const invalidData = {
                username: 'ab', // too short
                email: 'invalid-email',
                password: '123', // too short
            };
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/auth/register')
                .send(invalidData)
                .expect(400);
            expect(response.body).toHaveProperty('message', 'Validation failed');
            expect(response.body).toHaveProperty('errors');
            expect(Array.isArray(response.body.errors)).toBe(true);
        });
        it('should return 409 for duplicate email', async () => {
            // First register a user
            await User_1.default.create({
                username: 'existinguser',
                email: 'test@example.com',
                password: 'hashedpassword',
            });
            const duplicateData = {
                username: 'newuser',
                email: 'test@example.com', // duplicate
                password: 'password123',
            };
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/auth/register')
                .send(duplicateData)
                .expect(409);
            expect(response.body).toHaveProperty('message');
        });
    });
    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            // Create a test user
            await User_1.default.create({
                username: 'testuser',
                email: 'test@example.com',
                password: '$2a$10$hashedpassword', // pre-hashed password
            });
        });
        it('should login successfully with correct credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            };
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/auth/login')
                .send(loginData)
                .expect(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
        });
        it('should return 401 for incorrect password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/auth/login')
                .send(loginData)
                .expect(401);
            expect(response.body).toHaveProperty('message');
        });
        it('should return 404 for non-existent user', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'password123',
            };
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/auth/login')
                .send(loginData)
                .expect(404);
            expect(response.body).toHaveProperty('message');
        });
    });
});
//# sourceMappingURL=auth.integration.test.js.map