import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const createTournamentSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    maxTeams: z.ZodNumber;
    entryFee: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateTournamentSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    maxTeams: z.ZodOptional<z.ZodNumber>;
    entryFee: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const createTeamSchema: z.ZodObject<{
    name: z.ZodString;
    captain: z.ZodString;
    players: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const updateTeamSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    captain: z.ZodOptional<z.ZodString>;
    players: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const createMatchSchema: z.ZodObject<{
    tournamentId: z.ZodString;
    team1Id: z.ZodString;
    team2Id: z.ZodString;
    scheduledDate: z.ZodString;
    venue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateMatchSchema: z.ZodObject<{
    tournamentId: z.ZodOptional<z.ZodString>;
    team1Id: z.ZodOptional<z.ZodString>;
    team2Id: z.ZodOptional<z.ZodString>;
    scheduledDate: z.ZodOptional<z.ZodString>;
    venue: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    score: z.ZodOptional<z.ZodObject<{
        team1: z.ZodNumber;
        team2: z.ZodNumber;
    }, z.core.$strip>>;
    status: z.ZodOptional<z.ZodEnum<{
        completed: "completed";
        scheduled: "scheduled";
        in_progress: "in_progress";
        cancelled: "cancelled";
    }>>;
}, z.core.$strip>;
export declare const validateRequest: (schema: z.ZodSchema) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=validation.d.ts.map