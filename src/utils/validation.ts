import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email is too long'), // RFC 5321 limit
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/, 'Password must contain at least one alphabet, one number, and one special character'),
  fullName: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be less than 100 characters')
      .optional()
  ),
  dob: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().optional()
  ),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Tournament validation schemas
export const createTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(100, 'Tournament name must be less than 100 characters'),
  organizer: z.string().min(1, 'Organizer is required').max(100, 'Organizer name must be less than 100 characters'),
  startDate: z.string().refine((date: string) => !isNaN(Date.parse(date)), 'Invalid start date format'),
  endDate: z.string().refine((date: string) => !isNaN(Date.parse(date)), 'Invalid end date format'),
  location: z.string().min(1, 'Location is required').max(200, 'Location must be less than 200 characters'),
  locationType: z.enum(['Indoor', 'Outdoor', 'Street', 'Stadium'], 'Invalid location type'),
  type: z.enum(['Round Robin', 'Knockout', 'Groups + Knockout', 'Double Elimination', 'League', 'Custom'], 'Invalid tournament type'),
});

export const updateTournamentSchema = createTournamentSchema.partial();

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
  color: z.string().min(1, 'Color is required'),
  tournament: z.string().min(1, 'Tournament is required'),
});

export const updateTeamSchema = createTeamSchema.partial();

// Player validation schemas
export const addPlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required').max(100, 'Player name must be less than 100 characters'),
  role: z.enum(['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'], 'Invalid role'),
  jerseyNumber: z.string().min(1, 'Jersey number is required'),
  userId: z.string().optional(),
});

export const addPlayerByUsernameSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  role: z.enum(['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'], 'Invalid role').optional(),
  jerseyNumber: z.string().optional(),
});

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
