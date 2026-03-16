// Jest test setup file\n// Jest globals available via ts-jest preset


// Mock mongoose to avoid database connections during tests
jest.mock('mongoose', () => ({
  connect: (jest.fn() as any).mockResolvedValue(true),
  disconnect: (jest.fn() as any).mockResolvedValue(true),
  model: jest.fn().mockReturnValue({}),
  Schema: jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    post: jest.fn(),
    methods: {},
    statics: {},
    indexes: jest.fn().mockReturnValue([]),
  })),
  Models: {},
}));

// Mock config
jest.mock('../config/database', () => ({
  connectDB: (jest.fn() as any).mockResolvedValue(true),
  disconnectDB: (jest.fn() as any).mockResolvedValue(true),
}));

// Global test timeout
jest.setTimeout(10000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
