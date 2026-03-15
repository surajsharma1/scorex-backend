import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username?: string;
    email?: string;
    password?: string;
}, {
    username?: string;
    email?: string;
    password?: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
}, {
    email?: string;
    password?: string;
}>;
export declare const createTournamentSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["round_robin", "knockout", "league"]>;
    format: z.ZodEnum<["T10", "T20", "ODI", "Test"]>;
    startDate: z.ZodString;
    venue: z.ZodString;
}, "strip", z.ZodTypeAny, {
    format?: "T10" | "T20" | "ODI" | "Test";
    type?: "round_robin" | "knockout" | "league";
    name?: string;
    startDate?: string;
    venue?: string;
}, {
    format?: "T10" | "T20" | "ODI" | "Test";
    type?: "round_robin" | "knockout" | "league";
    name?: string;
    startDate?: string;
    venue?: string;
}>;
export declare const createMatchSchema: z.ZodObject<{
    tournamentId: z.ZodString;
    team1: z.ZodString;
    team2: z.ZodString;
    date: z.ZodString;
    venue: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date?: string;
    venue?: string;
    tournamentId?: string;
    team1?: string;
    team2?: string;
}, {
    date?: string;
    venue?: string;
    tournamentId?: string;
    team1?: string;
    team2?: string;
}>;
export declare const addBallSchema: z.ZodObject<{
    runs: z.ZodOptional<z.ZodNumber>;
    wicket: z.ZodOptional<z.ZodBoolean>;
    wide: z.ZodOptional<z.ZodBoolean>;
    noBall: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    runs?: number;
    wicket?: boolean;
    wide?: boolean;
    noBall?: boolean;
}, {
    runs?: number;
    wicket?: boolean;
    wide?: boolean;
    noBall?: boolean;
}>;
export declare const validateRequest: (schema: z.ZodSchema) => (req: any, res: any, next: any) => void;
//# sourceMappingURL=validation.d.ts.map