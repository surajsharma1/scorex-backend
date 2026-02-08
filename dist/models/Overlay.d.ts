export interface IOverlay extends Document {
    name: string;
    tournament: mongoose.Types.ObjectId;
    template: string;
    config: any;
    elements: any[];
    publicId: string;
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: any;
export default _default;
//# sourceMappingURL=Overlay.d.ts.map