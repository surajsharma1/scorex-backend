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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const OverlaySchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    template: { type: String, required: true, default: 'modern' },
    publicId: { type: String, required: true, unique: true },
    config: {
        type: Map,
        of: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    elements: { type: Array, default: [] },
    tournament: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tournament' },
    match: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Match' },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    // Membership tracking fields
    requiredMembershipLevel: {
        type: Number,
        default: 1,
        enum: [0, 1, 2]
    }, // Minimum membership required to access (1 = Basic, 2 = Premium)
    membershipAtCreation: {
        type: Number,
        default: 0,
        enum: [0, 1, 2]
    }, // Membership level when overlay was created
    // URL expiry tracking - 24 hours from creation/regeneration
    urlExpiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // Default: 24 hours from now
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('Overlay', OverlaySchema);
//# sourceMappingURL=Overlay.js.map