import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const createTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['round_robin', 'knockout', 'league']),
  format: z.enum(['T10', 'T20', 'ODI', 'Test']),
  startDate: z.string().datetime(),
  venue: z.string().min(1)
});

export const createMatchSchema = z.object({
  tournamentId: z.string(),
  team1: z.string(),
  team2: z.string(),
  date: z.string().datetime(),
  venue: z.string()
});

export const addBallSchema = z.object({
  runs: z.number().min(0).max(6).optional(),
  wicket: z.boolean().optional(),
  wide: z.boolean().optional(),
  noBall: z.boolean().optional()
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1).max(50),
  tournament: z.string()
});

export const addPlayerSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(['Batsman', 'Bowler', 'Allrounder', 'Wicketkeeper']),
  jerseyNumber: z.string().min(1).max(3)
});

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query
      });
      next();
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: error 
      });
    }
  };
};

