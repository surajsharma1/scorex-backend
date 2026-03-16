"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messageController_1 = require("../controllers/messageController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All message routes require authentication
router.use(auth_1.protect);
// Get all conversations
router.get('/conversations', messageController_1.getConversations);
// Get messages with a specific user
router.get('/:userId', messageController_1.getMessages);
// Send a message
router.post('/', messageController_1.sendMessage);
// Mark conversation as read
router.put('/:conversationId/read', messageController_1.markAsRead);
// Delete a message
router.delete('/:messageId', messageController_1.deleteMessage);
exports.default = router;
