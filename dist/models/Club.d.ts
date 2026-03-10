/**
 * Club Model
 * Club management system
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export interface IClub extends Document {
    name: string;
    description?: string;
    logo?: string;
    banner?: string;
    owner: mongoose.Types.ObjectId;
    viceLeaders: mongoose.Types.ObjectId[];
    members: mongoose.Types.ObjectId[];
    memberRoles: Map<string, 'owner' | 'vice-leader' | 'member'>;
    type: 'public' | 'initiation_required';
    isPublic: boolean;
    joinRequests: mongoose.Types.ObjectId[];
    location?: string;
    isActive: boolean;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
    addMember(userId: mongoose.Types.ObjectId): Promise<void>;
    removeMember(userId: mongoose.Types.ObjectId): Promise<void>;
    join(userId: mongoose.Types.ObjectId): Promise<void>;
    leave(userId: mongoose.Types.ObjectId): Promise<void>;
    approveJoinRequest(userId: mongoose.Types.ObjectId): Promise<void>;
}
declare const _default: mongoose.Model<IClub, {}, {}, {}, mongoose.Document<unknown, {}, IClub> & IClub & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Club.d.ts.map