import mongoose from 'mongoose';

// Note: MongoMemoryServer removed due to installation issues
// Tests will use the actual database connection configured in environment

beforeAll(async () => {
  // Connect to the test database if not already connected
  if (mongoose.connection.readyState === 0) {
    const testUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
    if (testUri) {
      await mongoose.connect(testUri);
    }
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
