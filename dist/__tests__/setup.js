"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Note: MongoMemoryServer removed due to installation issues
// Tests will use the actual database connection configured in environment
beforeAll(async () => {
    // Connect to the test database if not already connected
    if (mongoose_1.default.connection.readyState === 0) {
        const testUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
        if (testUri) {
            await mongoose_1.default.connect(testUri);
        }
    }
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
});
beforeEach(async () => {
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});
//# sourceMappingURL=setup.js.map