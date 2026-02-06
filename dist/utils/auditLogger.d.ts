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
declare class AuditLogger {
    private logFilePath;
    constructor();
    private ensureLogDirectoryExists;
    log(entry: AuditLogEntry): void;
    logUserAction(userId: string, action: string, resource: string, resourceId?: string, details?: any, ipAddress?: string, userAgent?: string): void;
    logSystemAction(action: string, resource: string, resourceId?: string, details?: any): void;
}
declare const _default: AuditLogger;
export default _default;
//# sourceMappingURL=auditLogger.d.ts.map