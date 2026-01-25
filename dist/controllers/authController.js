"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const email_1 = require("../utils/email");
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};
const register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const user = await User_1.default.create({ username, email, password });
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id.toString()),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        console.log('Login attempt:', req.body); // Debug
        const user = await User_1.default.findOne({ email: req.body.email });
        console.log('User found:', !!user); // Debug
        if (user && (await bcryptjs_1.default.compare(req.body.password, user.password))) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id.toString()),
            });
        }
        else {
            console.log('Invalid credentials'); // Debug
            res.status(401).json({ message: 'Invalid credentials' });
        }
    }
    catch (error) {
        console.error('Login error:', error); // Debug
        res.status(500).json({ message: 'Server error' });
    }
};
exports.login = login;
const forgotPassword = async (req, res) => {
    try {
        const user = await User_1.default.findOne({ email: req.body.email });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
        await (0, email_1.sendResetEmail)(user.email, token);
        res.json({ message: 'Reset email sent' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(req.params.token, process.env.JWT_SECRET);
        const user = await User_1.default.findById(decoded.id);
        if (!user) {
            res.status(404).json({ message: 'Invalid token' });
            return;
        }
        user.password = req.body.password;
        await user.save();
        res.json({ message: 'Password reset successful' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=authController.js.map