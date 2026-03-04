import mongoose, { Document, Types } from 'mongoose';
export type TournamentType = 'Round Robin' | 'Knockout' | 'Groups + Knockout' | 'Double Elimination' | 'League' | 'Custom';
export type LocationType = 'Indoor' | 'Outdoor' | 'Street' | 'Stadium';
export interface ITournament extends Document {
    name: string;
    organizer: string;
    startDate: Date;
    endDate: Date;
    location: string;
    locationType: LocationType;
    type: TournamentType;
    teams: Types.ObjectId[];
    matches: Types.ObjectId[];
    status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITournament, {}, {}, {}, mongoose.Document<unknown, {}, ITournament> & ITournament & {
    _id: Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Tournament.d.ts.map