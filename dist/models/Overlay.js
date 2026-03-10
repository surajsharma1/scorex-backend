"use strict";
/**
 * Overlay Model
 * Broadcast overlay templates
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
const OverlaySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String },
    thumbnail: { type: String },
    html: { type: String, required: true },
    css: { type: String },
    level: { type: Number, enum: [1, 2], default: 1 },
    category: { type: String, default: 'broadcast' },
    isPremium: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    // Additional fields
    template: { type: String },
    publicId: { type: String },
    urlExpiresAt: { type: Date },
    membershipAtCreation: { type: Number, default: 0 },
    requiredMembershipLevel: { type: Number, default: 0 },
    match: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Match' },
    tournament: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tournament' },
    config: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    elements: { type: mongoose_1.Schema.Types.Mixed, default: [] },
}, { timestamps: true });
OverlaySchema.index({ level: 1 });
OverlaySchema.index({ isPremium: 1 });
OverlaySchema.index({ category: 1 });
OverlaySchema.index({ createdBy: 1 });
exports.default = mongoose_1.default.model('Overlay', OverlaySchema);
//# sourceMappingURL=Overlay.js.map