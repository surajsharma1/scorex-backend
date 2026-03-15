"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.addBallSchema = exports.createMatchSchema = exports.createTournamentSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
exports.createTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    type: zod_1.z.enum(['round_robin', 'knockout', 'league']),
    format: zod_1.z.enum(['T10', 'T20', 'ODI', 'Test']),
    startDate: zod_1.z.string().datetime(),
    venue: zod_1.z.string().min(1)
});
exports.createMatchSchema = zod_1.z.object({
    tournamentId: zod_1.z.string(),
    team1: zod_1.z.string(),
    team2: zod_1.z.string(),
    date: zod_1.z.string().datetime(),
    venue: zod_1.z.string()
});
exports.addBallSchema = zod_1.z.object({
    runs: zod_1.z.number().min(0).max(6).optional(),
    wicket: zod_1.z.boolean().optional(),
    wide: zod_1.z.boolean().optional(),
    noBall: zod_1.z.boolean().optional()
});
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                params: req.params,
                query: req.query
            });
            next();
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error
            });
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map