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
// Send friend request
router.post('/request', friendController_1.sendFriendRequest);
// Accept friend request
router.put('/request/:requestId/accept', friendController_1.acceptFriendRequest);
// Reject friend request
router.delete('/request/:requestId/reject', friendController_1.rejectFriendRequest);
// Get user's friends
router.get('/', friendController_1.getFriends);
// Get pending friend requests
router.get('/requests', friendController_1.getFriendRequests);
// Remove friend
router.delete('/:friendId', friendController_1.removeFriend);
exports.default = router;
//# sourceMappingURL=friends.js.map