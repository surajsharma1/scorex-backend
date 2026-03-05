import mongoose from 'mongoose';
declare const connectDB: () => Promise<void>;
export default connectDB;
export declare const getDbStatus: () => {
    status: string;
    readyState: mongoose.ConnectionStates;
};
//# sourceMappingURL=database.d.ts.map