import mongoose from 'mongoose';

// ==========================================
// MODEL EXPORTS
// ==========================================
// Importing here registers models with Mongoose in the correct dependency order.
// Previously there were duplicate side-effect imports above the re-exports,
// which caused "Cannot overwrite model once compiled" errors.

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

// ==========================================
// TYPE EXPORTS
// ==========================================

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

// ==========================================
// MONGOOSE CONNECTION EVENTS
// ==========================================

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});