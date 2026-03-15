import mongoose from 'mongoose';
export declare const getDbStatus: () => {
    status: string;
};
declare const connectDB: () => Promise<typeof mongoose>;
export default connectDB;
//# sourceMappingURL=database.d.ts.map