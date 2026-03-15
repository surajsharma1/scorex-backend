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
interface IUser extends Document {
    username: string;
    email: string;
    password?: string;
    googleId?: string;
    githubId?: string;
    role: UserRole;
    membership: {
        level: MembershipLevel;
        expires: Date;
        paymentId?: string;
    };
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