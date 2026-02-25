import mongoose, { Document } from 'mongoose';
export interface ITournament extends Document {
    name: string;
    description?: string;
    format: string;
    startDate: Date;
    endDate?: Date;
    status: 'upcoming' | 'ongoing' | 'completed';
    teams: mongoose.Types.ObjectId[];
    organizer: mongoose.Types.ObjectId;
    matches: mongoose.Types.ObjectId[];
    isLive: boolean;
    liveMatchUrl?: string;
    deleted: boolean;
    deletedAt?: Date;
}
declare const _default: mongoose.Model<ITournament, {}, {}, {}, mongoose.Document<unknown, {}, ITournament> & ITournament & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Tournament.d.ts.map