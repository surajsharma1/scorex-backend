"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.updateMatchSchema = exports.createMatchSchema = exports.addPlayerByUsernameSchema = exports.addPlayerSchema = exports.updateTeamSchema = exports.createTeamSchema = exports.updateTournamentSchema = exports.createTournamentSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// User validation schemas
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be less than 50 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: zod_1.z.string()
        .email('Invalid email format')
        .max(254, 'Email is too long'), // RFC 5321 limit
    password: zod_1.z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters')
        .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/, 'Password must contain at least one alphabet, one number, and one special character'),
    fullName: zod_1.z.preprocess((val) => (val === '' ? undefined : val), zod_1.z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must be less than 100 characters')
        .optional()),
    dob: zod_1.z.preprocess((val) => (val === '' ? undefined : val), zod_1.z.string().optional()),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// Tournament validation schemas
exports.createTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Tournament name is required').max(100, 'Tournament name must be less than 100 characters'),
    description: zod_1.z.string().max(500, 'Description must be less than 500 characters').optional(),
    format: zod_1.z.string().min(1, 'Format is required'),
    startDate: zod_1.z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
    numberOfTeams: zod_1.z.number().int().min(2, 'Must allow at least 2 teams').max(100, 'Cannot exceed 100 teams'),
    status: zod_1.z.enum(['upcoming', 'active', 'completed']).optional(),
    liveMatchUrl: zod_1.z.string().url('Invalid URL format').optional(),
});
exports.updateTournamentSchema = exports.createTournamentSchema.partial();
// Team validation schemas
exports.createTeamSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
    color: zod_1.z.string().min(1, 'Color is required'),
    tournament: zod_1.z.string().min(1, 'Tournament is required'),
});
exports.updateTeamSchema = exports.createTeamSchema.partial();
// Player validation schemas
exports.addPlayerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Player name is required').max(100, 'Player name must be less than 100 characters'),
    role: zod_1.z.enum(['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'], 'Invalid role'),
    jerseyNumber: zod_1.z.string().min(1, 'Jersey number is required'),
    userId: zod_1.z.string().optional(),
});
exports.addPlayerByUsernameSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    role: zod_1.z.enum(['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'], 'Invalid role').optional(),
    jerseyNumber: zod_1.z.string().optional(),
});
// Match validation schemas
exports.createMatchSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1, 'Tournament ID is required'),
    team1Id: zod_1.z.string().min(1, 'Team 1 ID is required'),
    team2Id: zod_1.z.string().min(1, 'Team 2 ID is required'),
    scheduledDate: zod_1.z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
    venue: zod_1.z.string().max(200, 'Venue must be less than 200 characters').optional(),
});
exports.updateMatchSchema = exports.createMatchSchema.partial().extend({
    score: zod_1.z.object({
        team1: zod_1.z.number().int().min(0),
        team2: zod_1.z.number().int().min(0),
    }).optional(),
    status: zod_1.z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
});
// Validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            });
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map