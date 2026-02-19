"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// Public route - anyone can search users
router.get('/search', userController_1.searchUsers);
// Protected routes - require authentication
router.use(auth_1.protect);
// Stats endpoint - returns user statistics
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const adminUsers = await User_1.default.countDocuments({ role: 'admin' });
        const organizerUsers = await User_1.default.countDocuments({ role: 'organizer' });
        res.json({ totalUsers, adminUsers, organizerUsers });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Notification preferences
router.get('/notifications/preferences', userController_1.getNotificationPreferences);
router.put('/notifications/preferences', userController_1.updateNotificationPreferences);
// Profile management
router.get('/profile', userController_1.getProfile);
router.put('/profile', userController_1.updateProfile);
exports.default = router;
//# sourceMappingURL=users.js.map