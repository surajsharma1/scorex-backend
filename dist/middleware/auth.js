"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = async (req, res, next) => {
    // Removed verbose /clubs/my logging to reduce spam
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        console.log('🔐 AUTH: No token found');
        return res.status(401).json({
            success: false,
            message: 'No token, authorization denied'
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // console.log('🔐 AUTH: Token decoded for user ID:', decoded.id); // Disabled verbose logging
        req.user = await User_1.default.findById(decoded.id).select('-password');
        if (!req.user) {
            console.log('🔐 AUTH: User not found for ID:', decoded.id);
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        // console.log('🔐 AUTH: User loaded:', req.user.email, 'Role:', req.user.role); // Disabled verbose logging
        // Check ban status
        if (req.user.isBanned()) {
            const until = req.user.banned.until;
            const reason = req.user.banned.reason || 'No reason provided';
            return res.status(403).json({
                success: false,
                message: `Account banned until ${until.toISOString().split('T')[0]}. Reason: ${reason}`
            });
        }
        next();
    }
    catch (error) {
        console.log('🔐 AUTH: Token verification failed:', error.message);
        res.status(401).json({
            success: false,
            message: 'Token invalid'
        });
    }
};
exports.protect = protect;
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};
exports.isAdmin = isAdmin;
