"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipLevel = exports.UserRole = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["ORGANIZER"] = "organizer";
    UserRole["VIEWER"] = "viewer";
})(UserRole || (exports.UserRole = UserRole = {}));
var MembershipLevel;
(function (MembershipLevel) {
    MembershipLevel[MembershipLevel["FREE"] = 0] = "FREE";
    MembershipLevel[MembershipLevel["PREMIUM"] = 1] = "PREMIUM";
    MembershipLevel[MembershipLevel["ENTERPRISE"] = 2] = "ENTERPRISE";
})(MembershipLevel || (exports.MembershipLevel = MembershipLevel = {}));
const UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    password: { type: String, minlength: 6, select: false },
    googleId: { type: String },
    githubId: { type: String },
    fullName: { type: String, trim: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.VIEWER },
    membershipLevel: {
        type: Number,
        enum: [0, 1, 2],
        default: 0
    },
    membershipStartedAt: { type: Date },
    membershipExpiresAt: { type: Date },
    membershipTimeline: [{
            level: { type: Number, required: true },
            status: { type: String, required: true },
            startedAt: { type: Date, required: true },
            endedAt: { type: Date },
            notes: String,
            paymentId: String
        }],
    paymentHistory: [{
            amount: Number,
            currency: { type: String, default: 'USD' },
            level: String,
            duration: String,
            paymentIntentId: String,
            status: String,
            date: { type: Date, default: Date.now }
        }],
    avatar: { type: String, default: '/default-avatar.png' },
    verified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now },
    preferences: {
        notifications: { type: Boolean, default: true },
        darkMode: { type: Boolean, default: false },
        language: { type: String, default: 'en' }
    }
}, {
    timestamps: true
});
// Password hashing
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 12);
    next();
});
// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password || '');
};
// Check active membership - Updated for flat fields
UserSchema.methods.isMembershipActive = function () {
    return this.membershipLevel > 0 &&
        (!this.membershipExpiresAt || new Date() < new Date(this.membershipExpiresAt));
};
// Permission check
UserSchema.methods.hasPermission = function (permission) {
    const rolePermissions = {
        [UserRole.ADMIN]: ['*'],
        [UserRole.ORGANIZER]: ['tournament:*', 'match:score', 'team:*'],
        [UserRole.VIEWER]: ['read:*']
    };
    return rolePermissions[this.role].some(p => permission === p || p === '*' || permission.startsWith(p.replace('*', '')));
};
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
