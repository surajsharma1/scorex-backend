import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodString>>;
    dob: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const createTournamentSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    format: z.ZodString;
    startDate: z.ZodString;
    numberOfTeams: z.ZodNumber;
    status: z.ZodOptional<z.ZodEnum<{
        upcoming: "upcoming";
        active: "active";
        completed: "completed";
    }>>;
    liveMatchUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateTournamentSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    format: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    numberOfTeams: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        upcoming: "upcoming";
        active: "active";
        completed: "completed";
    }>>>;
    liveMatchUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const createTeamSchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodString;
    tournament: z.ZodString;
}, z.core.$strip>;
export declare const updateTeamSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    tournament: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const addPlayerSchema: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodEnum<{
        Batsman: "Batsman";
        Bowler: "Bowler";
        "All-rounder": "All-rounder";
        "Wicket Keeper": "Wicket Keeper";
    }>;
    jerseyNumber: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const addPlayerByUsernameSchema: z.ZodObject<{
    username: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<{
        Batsman: "Batsman";
        Bowler: "Bowler";
        "All-rounder": "All-rounder";
        "Wicket Keeper": "Wicket Keeper";
    }>>;
    jerseyNumber: z.ZodOptional<z.ZodString>;
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