/**
 * Models Index
 * Central export point for all Mongoose models
 * Following PROJECT_ALGORITHM.md specifications
 * 
 * Model Registration Order is critical to prevent
 * "Schema hasn't been registered for model" errors
 */

import mongoose from 'mongoose';

// Import all models - Order matters!
import User from './User';
import Player from './Player';
import Team from './Team';
import Tournament from './Tournament';
import Match from './Match';
import Club from './Club';
import Friend from './Friend';
import Bracket from './Bracket';
import Overlay from './Overlay';
import Notification from './Notification';
import Message from './Message';

// ==========================================
// MODEL EXPORTS
// ==========================================

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

// User Types
export type { IUser } from './User';

// Player Types
export type { IPlayer } from './Player';

// Team Types
export type { ITeam } from './Team';

// Tournament Types
export type { ITournament, TournamentType, TournamentStatus, TournamentFormat } from './Tournament';

// Match Types
export type { IMatch, OutType, ExtraType, MatchStatus, MatchFormat, IBatsman, IBowler, IExtras, IInnings } from './Match';

// Club Types
export type { IClub } from './Club';

// Friend Types
export type { IFriend } from './Friend';

// Bracket Types
export type { IBracket } from './Bracket';

// Overlay Types
export type { IOverlay } from './Overlay';

// Notification Types
export type { INotification } from './Notification';

// Message Types
export type { IMessage } from './Message';

// ==========================================
// MONGOOSE CONNECTION EVENTS
// ==========================================

// Handle connection events for debugging
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

export default {
  User,
  Player,
  Team,
  Tournament,
  Match,
  Club,
  Friend,
  Bracket,
  Overlay,
  Notification,
  Message
};

