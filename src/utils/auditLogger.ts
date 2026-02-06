import fs from 'fs';
import path from 'path';

export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

class AuditLogger {
  private logFilePath: string;

  constructor() {
    this.logFilePath = path.join(__dirname, '../../logs/audit.log');
    this.ensureLogDirectoryExists();
  }

  private ensureLogDirectoryExists() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(entry: AuditLogEntry) {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  logUserAction(userId: string, action: string, resource: string, resourceId?: string, details?: any, ipAddress?: string, userAgent?: string) {
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

  logSystemAction(action: string, resource: string, resourceId?: string, details?: any) {
    this.log({
      timestamp: new Date(),
      action,
      resource,
      resourceId,
      details,
    });
  }
}

export default new AuditLogger();
