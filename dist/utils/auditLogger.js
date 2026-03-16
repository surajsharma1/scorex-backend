"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class AuditLogger {
    constructor() {
        this.logFilePath = path_1.default.join(__dirname, '../../logs/audit.log');
        this.ensureLogDirectoryExists();
    }
    ensureLogDirectoryExists() {
        const logDir = path_1.default.dirname(this.logFilePath);
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
    }
    log(entry) {
        const logEntry = {
            ...entry,
            timestamp: entry.timestamp.toISOString(),
        };
        const logLine = JSON.stringify(logEntry) + '\n';
        try {
            fs_1.default.appendFileSync(this.logFilePath, logLine);
        }
        catch (error) {
            console.error('Failed to write audit log:', error);
        }
    }
    logUserAction(userId, action, resource, resourceId, details, ipAddress, userAgent) {
        this.log({
            timestamp: new Date(),
            userId,
            action,
            resource,
            resourceId,
            details,
            ipAddress,
            userAgent,
        });
    }
    logSystemAction(action, resource, resourceId, details) {
        this.log({
            timestamp: new Date(),
            action,
            resource,
            resourceId,
            details,
        });
    }
}
exports.default = new AuditLogger();
