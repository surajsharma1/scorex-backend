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
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ['viewer', 'organizer', 'admin'], default: 'viewer' },
    membershipLevel: { type: Number, default: 0, enum: [0, 1, 2] },
    membershipExpiresAt: { type: Date },
    // Verification Fields (Critical for OTP)
    otp: { type: String, select: false }, // Select false means it won't be returned in queries unless requested
    otpExpires: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    // Socials
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    fullName: { type: String },
    dob: { type: Date },
    friends: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    profilePicture: { type: String },
    bio: { type: String },
    notificationPreferences: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        tournamentUpdates: { type: Boolean, default: true },
        matchResults: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: true },
    },
    paymentHistory: [{
            amount: { type: Number },
            currency: { type: String },
            level: { type: String },
            duration: { type: String },
            paymentIntentId: { type: String },
            status: { type: String },
            date: { type: Date, default: Date.now }
        }],
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, { timestamps: true });
// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password)
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (err) {
        next(err);
    }
});
// Method to check password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    // If password is not selected, we cannot compare. 
    // Ensure your controller does .select('+password') if using this method on a query result that hid it.
    if (!this.password)
        return false;
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
exports.default = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map