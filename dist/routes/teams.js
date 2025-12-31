"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
router.route('/')
    .get(auth_1.protect, teamController_1.getTeams)
    .post(auth_1.protect, upload.single('logo'), teamController_1.createTeam);
router.route('/:id')
    .put(auth_1.protect, upload.single('logo'), teamController_1.updateTeam)
    .delete(auth_1.protect, teamController_1.deleteTeam);
router.post('/:id/players', auth_1.protect, upload.single('image'), teamController_1.addPlayer);
exports.default = router;
//# sourceMappingURL=teams.js.map