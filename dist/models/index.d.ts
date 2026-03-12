/**
 * Models Index
 * Central export point for all Mongoose models
 * Following PROJECT_ALGORITHM.md specifications
 *
 * Model Registration Order is critical to prevent
 * "Schema hasn't been registered for model" errors
 */
import mongoose from 'mongoose';
export { default as User } from './User';
export { default as Player } from './Player';
export { default as Team } from './Team';
export { default as Tournament } from './Tournament';
export { default as Match } from './Match';
export { default as Club } from './Club';
export { default as Friend } from './Friend';
export { default as Bracket } from './Bracket';
export { default as Overlay } from './Overlay';
export { default as Notification } from './Notification';
export { default as Message } from './Message';
export type { IUser } from './User';
export type { IPlayer } from './Player';
export type { ITeam } from './Team';
export type { ITournament, TournamentType, TournamentStatus, TournamentFormat } from './Tournament';
export type { IMatch, OutType, ExtraType, MatchStatus, MatchFormat, IBatsman, IBowler, IExtras, IInnings } from './Match';
export type { IClub } from './Club';
export type { IFriend } from './Friend';
export type { IBracket } from './Bracket';
export type { IOverlay } from './Overlay';
export type { INotification } from './Notification';
export type { IMessage } from './Message';
declare const _default: {
    User: mongoose.Model<import("./User").IUser, {}, {}, {}, mongoose.Document<unknown, {}, import("./User").IUser> & import("./User").IUser & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Player: mongoose.Model<import("./Player").IPlayer, {}, {}, {}, mongoose.Document<unknown, {}, import("./Player").IPlayer> & import("./Player").IPlayer & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Team: mongoose.Model<import("./Team").ITeam, {}, {}, {}, mongoose.Document<unknown, {}, import("./Team").ITeam> & import("./Team").ITeam & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Tournament: import("./Tournament").ITournamentModel;
    Match: mongoose.Model<import("./Match").IMatch, {}, {}, {}, mongoose.Document<unknown, {}, import("./Match").IMatch> & import("./Match").IMatch & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Club: mongoose.Model<import("./Club").IClub, {}, {}, {}, mongoose.Document<unknown, {}, import("./Club").IClub> & import("./Club").IClub & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Friend: mongoose.Model<import("./Friend").IFriend, {}, {}, {}, mongoose.Document<unknown, {}, import("./Friend").IFriend> & import("./Friend").IFriend & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Bracket: mongoose.Model<import("./Bracket").IBracket, {}, {}, {}, mongoose.Document<unknown, {}, import("./Bracket").IBracket> & import("./Bracket").IBracket & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Overlay: mongoose.Model<import("./Overlay").IOverlay, {}, {}, {}, mongoose.Document<unknown, {}, import("./Overlay").IOverlay> & import("./Overlay").IOverlay & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Notification: mongoose.Model<import("./Notification").INotification, {}, {}, {}, mongoose.Document<unknown, {}, import("./Notification").INotification> & import("./Notification").INotification & {
        _id: mongoose.Types.ObjectId;
    }, any>;
    Message: mongoose.Model<import("./Message").IMessage, {}, {}, {}, mongoose.Document<unknown, {}, import("./Message").IMessage> & import("./Message").IMessage & {
        _id: mongoose.Types.ObjectId;
    }, any>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map