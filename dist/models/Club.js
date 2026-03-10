"use strict";
/**
 * Club Model
 * Club management system
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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// ==========================================
// MAIN SCHEMA
// ==========================================
const ClubSchema = new mongoose_1.Schema({
    // Basic Info
    name: {
        type: String,
        required: [true, 'Club name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    logo: { type: String },
    banner: { type: String },
    // Owner & Management
    owner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Club owner is required']
    },
    viceLeaders: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    // Members
    members: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    memberRoles: {
        type: Map,
        of: String,
        default: new Map()
    },
    // Join Configuration
    type: {
        type: String,
        enum: ['public', 'initiation_required'],
        default: 'public'
    },
    joinRequests: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    // Location
    location: { type: String },
    // Status
    isActive: { type: Boolean, default: true },
    // Statistics
    memberCount: { type: Number, default: 0 },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// ==========================================
// INDEXES
// ==========================================
ClubSchema.index({ name: 'text' });
ClubSchema.index({ owner: 1 });
ClubSchema.index({ members: 1 });
ClubSchema.index({ type: 1 });
ClubSchema.index({ isActive: 1 });
// ==========================================
// VIRTUALS
// ==========================================
// Virtual for isPublic - derived from type field
ClubSchema.virtual('isPublic').get(function () {
    return this.type === 'public';
});
ClubSchema.virtual('isPublic').set(function (value) {
    this.type = value ? 'public' : 'initiation_required';
});
// ==========================================
// METHODS
// ==========================================
// Add member
ClubSchema.methods.addMember = async function (userId) {
    if (!this.members.includes(userId)) {
        this.members.push(userId);
        this.memberCount = this.members.length;
        await this.save();
    }
};
// Remove member
ClubSchema.methods.removeMember = async function (userId) {
    this.members = this.members.filter(m => m.toString() !== userId.toString());
    this.memberRoles.delete(userId.toString());
    this.memberCount = this.members.length;
    await this.save();
};
// Join club
ClubSchema.methods.join = async function (userId) {
    if (this.members.includes(userId)) {
        throw new Error('Already a member');
    }
    if (this.type === 'initiation_required') {
        if (!this.joinRequests.includes(userId)) {
            this.joinRequests.push(userId);
            await this.save();
        }
        throw new Error('Join request sent for approval');
    }
    await this.addMember(userId);
};
// Leave club
ClubSchema.methods.leave = async function (userId) {
    if (this.owner.toString() === userId.toString()) {
        throw new Error('Owner cannot leave club. Transfer ownership first.');
    }
    await this.removeMember(userId);
};
// Approve join request
ClubSchema.methods.approveJoinRequest = async function (userId) {
    this.joinRequests = this.joinRequests.filter(r => r.toString() !== userId.toString());
    await this.addMember(userId);
};
// ==========================================
// STATIC METHODS
// ==========================================
ClubSchema.statics.getPublic = function () {
    return this.find({ type: 'public', isActive: true })
        .populate('owner', 'username email');
};
ClubSchema.statics.getUserClubs = function (userId) {
    return this.find({
        members: userId,
        isActive: true
    });
};
// ==========================================
// EXPORT
// ==========================================
exports.default = mongoose_1.default.model('Club', ClubSchema);
//# sourceMappingURL=Club.js.map