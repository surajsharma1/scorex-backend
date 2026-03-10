"use strict";
/**
 * User Model
 * Complete user authentication and profile management
 * Following PROJECT_ALGORITHM.md specifications
 */
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
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// ==========================================
// SCHEMA
// ==========================================
const UserSchema = new mongoose_1.Schema({
    // Core Authentication
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Never return password in queries by default
    },
    // Role Management
    role: {
        type: String,
        enum: ['viewer', 'organizer', 'admin'],
        default: 'viewer'
    },
    // Membership System
    membershipLevel: {
        type: Number,
        default: 0,
        enum: [0, 1, 2],
        validate: {
            validator: function (value) {
                return [0, 1, 2].includes(value);
            },
            message: 'Membership level must be 0 (Free), 1 (Basic), or 2 (Premium)'
        }
    },
    membershipExpiresAt: { type: Date },
    membershipStartedAt: { type: Date },
    // Membership Timeline
    membershipTimeline: [{
            level: { type: Number, required: true },
            status: {
                type: String,
                enum: ['active', 'expired', 'upgraded', 'downgraded', 'cancelled'],
                default: 'active'
            },
            startedAt: { type: Date, default: Date.now },
            endedAt: { type: Date },
            paymentId: { type: String },
            notes: { type: String }
        }],
    // Verification Fields
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    // Social Login
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    // Profile Info
    fullName: { type: String, trim: true },
    dob: { type: Date },
    friends: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    profilePicture: { type: String },
    bio: { type: String, maxlength: 500 },
    // Notification Preferences
    notificationPreferences: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        tournamentUpdates: { type: Boolean, default: true },
        matchResults: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: true },
    },
    // Payment History
    paymentHistory: [{
            amount: { type: Number },
            currency: { type: String, default: 'USD' },
            level: { type: String },
            duration: { type: String },
            paymentIntentId: { type: String },
            status: { type: String },
            date: { type: Date, default: Date.now }
        }],
    // Soft Delete
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// ==========================================
// INDEXES
// ==========================================
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ githubId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ membershipLevel: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ deleted: 1 });
// ==========================================
// VIRTUALS
// ==========================================
// Virtual for time remaining in membership
UserSchema.virtual('membershipTimeRemaining').get(function () {
    if (!this.membershipExpiresAt)
        return null;
    const now = new Date();
    const diff = this.membershipExpiresAt.getTime() - now.getTime();
    if (diff <= 0)
        return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    return { days, months, milliseconds: diff };
});
// Virtual for friend count
UserSchema.virtual('friendCount').get(function () {
    return this.friends ? this.friends.length : 0;
});
// ==========================================
// PRE-SAVE HOOKS
// ==========================================
// Hash password before saving
UserSchema.pre('save', async function (next) {
    // Only hash if password is modified and exists
    if (!this.isModified('password') || !this.password)
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12); // Increased salt rounds for security
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Normalize email before saving
UserSchema.pre('save', function (next) {
    if (this.isModified('email') && this.email) {
        this.email = this.email.toLowerCase().trim();
    }
    if (this.isModified('username') && this.username) {
        this.username = this.username.trim();
    }
    next();
});
// ==========================================
// METHODS
// ==========================================
// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Check if membership is active
UserSchema.methods.isMembershipActive = function () {
    if (!this.membershipExpiresAt)
        return false;
    return new Date() < this.membershipExpiresAt;
};
// Check if user can access premium features
UserSchema.methods.canAccessPremium = function () {
    return this.isMembershipActive() && this.membershipLevel >= 2;
};
// Check if user can access basic features
UserSchema.methods.canAccessBasic = function () {
    return this.isMembershipActive() && this.membershipLevel >= 1;
};
// Add payment to history
UserSchema.methods.addPayment = function (payment) {
    if (!this.paymentHistory) {
        this.paymentHistory = [];
    }
    this.paymentHistory.push({
        amount: payment.amount,
        currency: payment.currency || 'USD',
        level: payment.level,
        duration: payment.duration,
        paymentIntentId: payment.paymentIntentId,
        status: payment.status,
        date: new Date()
    });
};
// Update membership
UserSchema.methods.updateMembership = function (level, durationMonths) {
    const now = new Date();
    const newEndDate = new Date(now);
    newEndDate.setMonth(newEndDate.getMonth() + durationMonths);
    // Add to timeline
    if (!this.membershipTimeline) {
        this.membershipTimeline = [];
    }
    // End current membership if exists
    if (this.membershipExpiresAt && this.membershipExpiresAt > now) {
        const currentLevel = this.membershipLevel;
        this.membershipTimeline.push({
            level: currentLevel,
            status: level > currentLevel ? 'upgraded' : level < currentLevel ? 'downgraded' : 'cancelled',
            startedAt: this.membershipStartedAt || now,
            endedAt: now
        });
    }
    // Set new membership
    this.membershipLevel = level;
    this.membershipStartedAt = now;
    this.membershipExpiresAt = newEndDate;
    this.membershipTimeline.push({
        level,
        status: 'active',
        startedAt: now,
        paymentId: `MEM-${Date.now()}`
    });
};
// Soft delete
UserSchema.methods.softDelete = function () {
    this.deleted = true;
    this.deletedAt = new Date();
    // Clear sensitive data
    this.password = undefined;
    this.otp = undefined;
    this.otpExpires = undefined;
};
// ==========================================
// STATIC METHODS
// ==========================================
// Find by email
UserSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};
// Find active users
UserSchema.statics.findActive = function () {
    return this.find({ deleted: false });
};
// Find users by role
UserSchema.statics.findByRole = function (role) {
    return this.find({ role, deleted: false });
};
// Get users with expiring membership
UserSchema.statics.getExpiringMembership = function (days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        membershipExpiresAt: { $lte: futureDate, $gt: new Date() },
        deleted: false
    });
};
// ==========================================
// EXPORT
// ==========================================
exports.default = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map