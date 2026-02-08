"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
iimport;
mongoose, { Document, Schema };
from;
'mongoose';
const overlaySchema = new Schema({
    name: { type: String, required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament' },
    template: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
    elements: [{ type: Schema.Types.Mixed }],
    publicId: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
exports.default = mongoose.model('Overlay', overlaySchema);
//# sourceMappingURL=Overlay.js.map