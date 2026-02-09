import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be less than 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Tournament validation schemas
export const createTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(100, 'Tournament name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  startDate: z.string().refine((date: string) => !isNaN(Date.parse(date)), 'Invalid date format'),
  endDate: z.string().refine((date: string) => !isNaN(Date.parse(date)), 'Invalid date format'),
  maxTeams: z.number().int().min(2, 'Must allow at least 2 teams').max(100, 'Cannot exceed 100 teams'),
  entryFee: z.number().min(0, 'Entry fee cannot be negative').optional(),
});

export const updateTournamentSchema = createTournamentSchema.partial();

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
  color: z.string().min(1, 'Color is required'),
  tournament: z.string().min(1, 'Tournament is required'),
});

export const updateTeamSchema = createTeamSchema.partial();

// Match validation schemas
export const createMatchSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  team1Id: z.string().min(1, 'Team 1 ID is required'),
  team2Id: z.string().min(1, 'Team 2 ID is required'),
  scheduledDate: z.string().refine((date: string) => !isNaN(Date.parse(date)), 'Invalid date format'),
  venue: z.string().max(200, 'Venue must be less than 200 characters').optional(),
});

export const updateMatchSchema = createMatchSchema.partial().extend({
  score: z.object({
    team1: z.number().int().min(0),
    team2: z.number().int().min(0),
  }).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
});

// Validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
  };
};
