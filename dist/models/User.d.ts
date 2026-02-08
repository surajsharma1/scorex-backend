import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    username: string;
    email: string;
    password?: string;
    role: 'viewer' | 'organizer' | 'admin';
    membership: 'free' | 'premium' | 'pro';
    googleId?: string;
    githubId?: string;
    otp?: string;
    otpExpires?: Date;
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