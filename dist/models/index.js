"use strict";
/**
 * Models Index
 * Central export point for all Mongoose models
 * Following PROJECT_ALGORITHM.md specifications
 *
 * Model Registration Order is critical to prevent
 * "Schema hasn't been registered for model" errors
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.Notification = exports.Overlay = exports.Bracket = exports.Friend = exports.Club = exports.Match = exports.Tournament = exports.Team = exports.Player = exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Import all models - Order matters!
const User_1 = __importDefault(require("./User"));
const Player_1 = __importDefault(require("./Player"));
const Team_1 = __importDefault(require("./Team"));
const Tournament_1 = __importDefault(require("./Tournament"));
const Match_1 = __importDefault(require("./Match"));
const Club_1 = __importDefault(require("./Club"));
const Friend_1 = __importDefault(require("./Friend"));
const Bracket_1 = __importDefault(require("./Bracket"));
const Overlay_1 = __importDefault(require("./Overlay"));
const Notification_1 = __importDefault(require("./Notification"));
const Message_1 = __importDefault(require("./Message"));
// ==========================================
// MODEL EXPORTS
// ==========================================
var User_2 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return __importDefault(User_2).default; } });
var Player_2 = require("./Player");
Object.defineProperty(exports, "Player", { enumerable: true, get: function () { return __importDefault(Player_2).default; } });
var Team_2 = require("./Team");
Object.defineProperty(exports, "Team", { enumerable: true, get: function () { return __importDefault(Team_2).default; } });
var Tournament_2 = require("./Tournament");
Object.defineProperty(exports, "Tournament", { enumerable: true, get: function () { return __importDefault(Tournament_2).default; } });
var Match_2 = require("./Match");
Object.defineProperty(exports, "Match", { enumerable: true, get: function () { return __importDefault(Match_2).default; } });
var Club_2 = require("./Club");
Object.defineProperty(exports, "Club", { enumerable: true, get: function () { return __importDefault(Club_2).default; } });
var Friend_2 = require("./Friend");
Object.defineProperty(exports, "Friend", { enumerable: true, get: function () { return __importDefault(Friend_2).default; } });
var Bracket_2 = require("./Bracket");
Object.defineProperty(exports, "Bracket", { enumerable: true, get: function () { return __importDefault(Bracket_2).default; } });
var Overlay_2 = require("./Overlay");
Object.defineProperty(exports, "Overlay", { enumerable: true, get: function () { return __importDefault(Overlay_2).default; } });
var Notification_2 = require("./Notification");
Object.defineProperty(exports, "Notification", { enumerable: true, get: function () { return __importDefault(Notification_2).default; } });
var Message_2 = require("./Message");
Object.defineProperty(exports, "Message", { enumerable: true, get: function () { return __importDefault(Message_2).default; } });
// ==========================================
// MONGOOSE CONNECTION EVENTS
// ==========================================
// Handle connection events for debugging
mongoose_1.default.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});
// Handle process termination
process.on('SIGINT', async () => {
    await mongoose_1.default.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});
exports.default = {
    User: User_1.default,
    Player: Player_1.default,
    Team: Team_1.default,
    Tournament: Tournament_1.default,
    Match: Match_1.default,
    Club: Club_1.default,
    Friend: Friend_1.default,
    Bracket: Bracket_1.default,
    Overlay: Overlay_1.default,
    Notification: Notification_1.default,
    Message: Message_1.default
};
//# sourceMappingURL=index.js.map