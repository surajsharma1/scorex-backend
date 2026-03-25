"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const friendController_1 = require("../controllers/friendController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All friend routes require authentication
router.use(auth_1.protect);
// Search users (must be before /:friendId to avoid collision)
router.get('/search', friendController_1.searchUsers);
// Get online friends
router.get('/online', friendController_1.getOnlineFriends);
// Get pending friend requests (incoming + outgoing)
router.get('/requests', friendController_1.getFriendRequests);
// Get user's accepted friends list
router.get('/', friendController_1.getFriends);
// Send friend request
router.post('/:userId/request', friendController_1.sendFriendRequest);
// Accept friend request — support both PUT and POST (frontend uses PUT)
router.put('/request/:id/accept', friendController_1.acceptFriendRequest);
router.post('/requests/:id/accept', friendController_1.acceptFriendRequest);
// Reject friend request — support both DELETE and POST
router.delete('/request/:id/reject', friendController_1.rejectFriendRequest);
router.post('/requests/:id/reject', friendController_1.rejectFriendRequest);
// Remove friend
router.delete('/:friendId', friendController_1.removeFriend);
exports.default = router;
