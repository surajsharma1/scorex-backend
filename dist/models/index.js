"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.Notification = exports.Overlay = exports.Bracket = exports.Friend = exports.Club = exports.Match = exports.Tournament = exports.Team = exports.Player = exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// ==========================================
// MODEL EXPORTS
// ==========================================
// Importing here registers models with Mongoose in the correct dependency order.
// Previously there were duplicate side-effect imports above the re-exports,
// which caused "Cannot overwrite model once compiled" errors.
var User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return __importDefault(User_1).default; } });
var Player_1 = require("./Player");
Object.defineProperty(exports, "Player", { enumerable: true, get: function () { return __importDefault(Player_1).default; } });
var Team_1 = require("./Team");
Object.defineProperty(exports, "Team", { enumerable: true, get: function () { return __importDefault(Team_1).default; } });
var Tournament_1 = require("./Tournament");
Object.defineProperty(exports, "Tournament", { enumerable: true, get: function () { return __importDefault(Tournament_1).default; } });
var Match_1 = require("./Match");
Object.defineProperty(exports, "Match", { enumerable: true, get: function () { return __importDefault(Match_1).default; } });
var Club_1 = require("./Club");
Object.defineProperty(exports, "Club", { enumerable: true, get: function () { return __importDefault(Club_1).default; } });
var Friend_1 = require("./Friend");
Object.defineProperty(exports, "Friend", { enumerable: true, get: function () { return __importDefault(Friend_1).default; } });
var Bracket_1 = require("./Bracket");
Object.defineProperty(exports, "Bracket", { enumerable: true, get: function () { return __importDefault(Bracket_1).default; } });
var Overlay_1 = require("./Overlay");
Object.defineProperty(exports, "Overlay", { enumerable: true, get: function () { return __importDefault(Overlay_1).default; } });
var Notification_1 = require("./Notification");
Object.defineProperty(exports, "Notification", { enumerable: true, get: function () { return __importDefault(Notification_1).default; } });
var Message_1 = require("./Message");
Object.defineProperty(exports, "Message", { enumerable: true, get: function () { return __importDefault(Message_1).default; } });
// ==========================================
// MONGOOSE CONNECTION EVENTS
// ==========================================
mongoose_1.default.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});
process.on('SIGINT', async () => {
    await mongoose_1.default.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});
//# sourceMappingURL=index.js.map