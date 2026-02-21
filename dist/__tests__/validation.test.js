"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Validation utility tests
const validation_1 = require("../utils/validation");
describe('Validation Schemas', () => {
    describe('registerSchema', () => {
        it('should validate a correct registration object', () => {
            const validData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Password1!',
                fullName: 'Test User',
            };
            const result = validation_1.registerSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should reject invalid email', () => {
            const invalidData = {
                username: 'testuser',
                email: 'invalid-email',
                password: 'Password1!',
            };
            const result = validation_1.registerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path).toContain('email');
            }
        });
        it('should reject short username', () => {
            const invalidData = {
                username: 'ab',
                email: 'test@example.com',
                password: 'Password1!',
            };
            const result = validation_1.registerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path).toContain('username');
            }
        });
        it('should reject weak password', () => {
            const invalidData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'weak',
            };
            const result = validation_1.registerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
        it('should reject username with special characters', () => {
            const invalidData = {
                username: 'test@user',
                email: 'test@example.com',
                password: 'Password1!',
            };
            const result = validation_1.registerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
    describe('loginSchema', () => {
        it('should validate a correct login object', () => {
            const validData = {
                email: 'test@example.com',
                password: 'password123',
            };
            const result = validation_1.loginSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should reject invalid email', () => {
            const invalidData = {
                email: 'not-an-email',
                password: 'password123',
            };
            const result = validation_1.loginSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
        it('should reject empty password', () => {
            const invalidData = {
                email: 'test@example.com',
                password: '',
            };
            const result = validation_1.loginSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
    describe('createTournamentSchema', () => {
        it('should validate a correct tournament object', () => {
            const validData = {
                name: 'Summer Cup 2024',
                description: 'Annual summer cricket tournament',
                format: 'T20',
                startDate: '2024-06-01',
                numberOfTeams: 8,
                status: 'upcoming',
            };
            const result = validation_1.createTournamentSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should reject tournament with less than 2 teams', () => {
            const invalidData = {
                name: 'Small Tournament',
                format: 'T20',
                startDate: '2024-06-01',
                numberOfTeams: 1,
            };
            const result = validation_1.createTournamentSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
        it('should reject tournament with invalid date', () => {
            const invalidData = {
                name: 'Test Tournament',
                format: 'T20',
                startDate: 'not-a-date',
                numberOfTeams: 4,
            };
            const result = validation_1.createTournamentSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
        it('should reject empty tournament name', () => {
            const invalidData = {
                name: '',
                format: 'T20',
                startDate: '2024-06-01',
                numberOfTeams: 4,
            };
            const result = validation_1.createTournamentSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
    describe('createTeamSchema', () => {
        it('should validate a correct team object', () => {
            const validData = {
                name: 'Mumbai Indians',
                color: 'Blue',
                tournament: '64f5a8b2c9e1d0001a000001',
            };
            const result = validation_1.createTeamSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should reject team without name', () => {
            const invalidData = {
                name: '',
                color: 'Blue',
                tournament: '64f5a8b2c9e1d0001a000001',
            };
            const result = validation_1.createTeamSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
        it('should reject team without color', () => {
            const invalidData = {
                name: 'Test Team',
                color: '',
                tournament: '64f5a8b2c9e1d0001a000001',
            };
            const result = validation_1.createTeamSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
    describe('addPlayerSchema', () => {
        it('should validate a correct player object', () => {
            const validData = {
                name: 'Virat Kohli',
                role: 'Batsman',
                jerseyNumber: '18',
            };
            const result = validation_1.addPlayerSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should reject player with invalid role', () => {
            const invalidData = {
                name: 'Test Player',
                role: 'InvalidRole',
                jerseyNumber: '10',
            };
            const result = validation_1.addPlayerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
        it('should reject player without name', () => {
            const invalidData = {
                name: '',
                role: 'Batsman',
                jerseyNumber: '10',
            };
            const result = validation_1.addPlayerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
    describe('createMatchSchema', () => {
        it('should validate a correct match object', () => {
            const validData = {
                tournamentId: '64f5a8b2c9e1d0001a000001',
                team1Id: '64f5a8b2c9e1d0001a000002',
                team2Id: '64f5a8b2c9e1d0001a000003',
                scheduledDate: '2024-06-15T10:00:00Z',
                venue: 'Wankhede Stadium',
            };
            const result = validation_1.createMatchSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should reject match without team IDs', () => {
            const invalidData = {
                tournamentId: '64f5a8b2c9e1d0001a000001',
                team1Id: '',
                team2Id: '64f5a8b2c9e1d0001a000003',
                scheduledDate: '2024-06-15T10:00:00Z',
            };
            const result = validation_1.createMatchSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
        it('should reject match with invalid date', () => {
            const invalidData = {
                tournamentId: '64f5a8b2c9e1d0001a000001',
                team1Id: '64f5a8b2c9e1d0001a000002',
                team2Id: '64f5a8b2c9e1d0001a000003',
                scheduledDate: 'invalid-date',
            };
            const result = validation_1.createMatchSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
    describe('validateRequest middleware', () => {
        it('should call next for valid request', () => {
            const mockReq = {
                body: {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'Password1!',
                },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const mockNext = jest.fn();
            const middleware = (0, validation_1.validateRequest)(validation_1.registerSchema);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
        it('should return 400 for invalid request', () => {
            const mockReq = {
                body: {
                    username: 'ab',
                    email: 'invalid',
                },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const mockNext = jest.fn();
            const middleware = (0, validation_1.validateRequest)(validation_1.registerSchema);
            middleware(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=validation.test.js.map