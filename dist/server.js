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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const auth_1 = __importDefault(require("./routes/auth"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const teams_1 = __importDefault(require("./routes/teams"));
const brackets_1 = __importDefault(require("./routes/brackets"));
const overlays_1 = __importDefault(require("./routes/overlays"));
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
console.log('Starting server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
const app = (0, express_1.default)();
// Connect to database
try {
    (0, database_1.default)();
    console.log('Database connection initialized');
}
catch (error) {
    console.error('Database connection failed:', error);
}
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
console.log('CORS configured for:', process.env.FRONTEND_URL);
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static files with caching
app.use('/uploads', express_1.default.static('uploads', {
    maxAge: '1d', // Cache for 1 day
}));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/tournaments', tournaments_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/brackets', brackets_1.default);
app.use('/api/overlays', overlays_1.default);
// Overlay serving route
app.get('/overlay/:id', async (req, res) => {
    try {
        const { serveOverlay } = await Promise.resolve().then(() => __importStar(require('./controllers/overlayController'))); // Named import
        await serveOverlay(req, res);
    }
    catch (error) {
        console.error('Overlay route error:', error);
        res.status(500).json({ message: 'Error serving overlay' });
    }
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mongodb: !!process.env.MONGODB_URI
    });
});
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Export for Vercel
exports.default = app;
// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
//# sourceMappingURL=server.js.map