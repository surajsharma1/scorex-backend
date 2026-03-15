import { Document, Model } from 'mongoose';
export declare enum UserRole {
    ADMIN = "admin",
    ORGANIZER = "organizer",
    VIEWER = "viewer"
}
export declare enum MembershipLevel {
    FREE = 0,
    PREMIUM = 1,
    ENTERPRISE = 2
}
export interface IUser extends Document {
    username: string;
    email: string;
    password?: string;
    googleId?: string;
    githubId?: string;
    fullName?: string;
    role: UserRole;
    membershipLevel: 0 | 1 | 2;
    membershipStartedAt?: Date;
    membershipExpiresAt?: Date;
    membershipTimeline: Array<{
        level: number;
        status: string;
        startedAt: Date;
        endedAt?: Date;
        notes?: string;
        paymentId?: string;
    }>;
    paymentHistory: Array<{
        amount: number;
        currency: string;
        level: string;
        duration: string;
        paymentIntentId: string;
        status: string;
        date: Date;
    }>;
    avatar?: string;
    verified: boolean;
    lastLogin: Date;
    preferences: {
        notifications: boolean;
        darkMode: boolean;
        language: string;
    };
    comparePassword(candidatePassword: string): Promise<boolean>;
    isMembershipActive(): boolean;
    hasPermission(permission: string): boolean;
}
declare const User: Model<IUser>;
export default User;
//# sourceMappingURL=User.d.ts.map