"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.protectAdmin = exports.protectOrganizer = exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ message: 'Not authorized, no token' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.default.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({ message: 'Not authorized, user not found' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
exports.protect = protect;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: 'User role not authorized' });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
const protectOrganizer = (req, res, next) => {
    if (req.user && (req.user.role === 'organizer' || req.user.role === 'admin')) {
        next();
    }
    else {
        res.status(403).json({ message: 'User role not authorized' });
    }
};
exports.protectOrganizer = protectOrganizer;
exports.protectAdmin = [exports.protect, (0, exports.authorize)('admin')]; // For admins
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const userRole = req.user.role;
        const permissions = {
            'viewer': ['read:tournaments', 'read:teams', 'read:matches'],
            'organizer': ['read:tournaments', 'read:teams', 'read:matches', 'create:tournaments', 'create:teams', 'create:matches', 'update:own_tournaments', 'update:own_teams'],
            'admin': ['read:tournaments', 'read:teams', 'read:matches', 'create:tournaments', 'create:teams', 'create:matches', 'update:tournaments', 'update:teams', 'update:matches', 'delete:tournaments', 'delete:teams', 'delete:matches', 'manage:users']
        };
        if (!permissions[userRole]?.includes(permission)) {
            res.status(403).json({ message: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
//# sourceMappingURL=auth.js.map