import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    username: string;
    email: string;
    password?: string;
    role: 'viewer' | 'organizer' | 'admin';
    membershipLevel: 0 | 1 | 2;
    membershipExpiresAt?: Date;
    otp?: string;
    otpExpires?: Date;
    isVerified: boolean;
    googleId?: string;
    githubId?: string;
    fullName?: string;
    dob?: Date;
    friends: mongoose.Types.ObjectId[];
    profilePicture?: string;
    bio?: string;
    notificationPreferences?: {
        email: boolean;
        push: boolean;
        sms: boolean;
        tournamentUpdates: boolean;
        matchResults: boolean;
        systemAnnouncements: boolean;
    };
    paymentHistory?: {
        amount: number;
        currency: string;
        level: string;
        duration: string;
        paymentIntentId: string;
        status: string;
        date: Date;
    };
    deleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser> & IUser & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map