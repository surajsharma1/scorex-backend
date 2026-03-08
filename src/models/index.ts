/**
 * Model Index - Ensures all Mongoose models are registered in correct order
 * This file must be imported before any model operations
 */

import User from './User';
import Player from './Player';
import Team from './Team';
import Tournament from './Tournament';
import Match from './Match';
import Club from './Club';
import Bracket from './Bracket';
import Overlay from './Overlay';
import Notification from './Notification';
import Friend from './Friend';

// Re-export all models for easy import
export {
  User,
  Player,
  Team,
  Tournament,
  Match,
  Club,
  Bracket,
  Overlay,
  Notification,
  Friend
};

// Log model registration for debugging
console.log('[Models] All models registered:', {
  User: !!User,
  Player: !!Player,
  Team: !!Team,
  Tournament: !!Tournament,
  Match: !!Match,
  Club: !!Club,
  Bracket: !!Bracket,
  Overlay: !!Overlay,
  Notification: !!Notification,
  Friend: !!Friend
});

