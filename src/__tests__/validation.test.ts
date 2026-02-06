import {
  registerSchema,
  loginSchema,
  createTournamentSchema,
  createTeamSchema,
  createMatchSchema,
  validateRequest,
} from '../utils/validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid username', () => {
      const invalidData = {
        username: 'ab', // too short
        email: 'test@example.com',
        password: 'password123',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject short password', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // too short
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('createTournamentSchema', () => {
    it('should validate valid tournament data', () => {
      const validData = {
        name: 'Test Tournament',
        description: 'A test tournament',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        maxTeams: 8,
        entryFee: 10,
      };

      expect(() => createTournamentSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        name: 'Test Tournament',
        startDate: 'invalid-date',
        endDate: '2024-01-02',
        maxTeams: 8,
      };

      expect(() => createTournamentSchema.parse(invalidData)).toThrow();
    });

    it('should reject too few teams', () => {
      const invalidData = {
        name: 'Test Tournament',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        maxTeams: 1, // too few
      };

      expect(() => createTournamentSchema.parse(invalidData)).toThrow();
    });
  });

  describe('createTeamSchema', () => {
    it('should validate valid team data', () => {
      const validData = {
        name: 'Test Team',
        captain: 'captain-id',
        players: ['player1', 'player2'],
      };

      expect(() => createTeamSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty team name', () => {
      const invalidData = {
        name: '',
        captain: 'captain-id',
        players: ['player1'],
      };

      expect(() => createTeamSchema.parse(invalidData)).toThrow();
    });

    it('should reject no players', () => {
      const invalidData = {
        name: 'Test Team',
        captain: 'captain-id',
        players: [], // no players
      };

      expect(() => createTeamSchema.parse(invalidData)).toThrow();
    });
  });

  describe('createMatchSchema', () => {
    it('should validate valid match data', () => {
      const validData = {
        tournamentId: 'tournament-id',
        team1Id: 'team1-id',
        team2Id: 'team2-id',
        scheduledDate: '2024-01-01',
        venue: 'Test Venue',
      };

      expect(() => createMatchSchema.parse(validData)).not.toThrow();
    });

    it('should reject missing tournament ID', () => {
      const invalidData = {
        tournamentId: '',
        team1Id: 'team1-id',
        team2Id: 'team2-id',
        scheduledDate: '2024-01-01',
      };

      expect(() => createMatchSchema.parse(invalidData)).toThrow();
    });
  });

  describe('validateRequest middleware', () => {
    it('should call next for valid data', () => {
      const middleware = validateRequest(registerSchema);
      const req = { body: { username: 'test', email: 'test@example.com', password: 'password' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for invalid data', () => {
      const middleware = validateRequest(registerSchema);
      const req = { body: { username: 'ab', email: 'invalid', password: 'pass' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          errors: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
