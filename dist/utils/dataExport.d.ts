import { Response } from 'express';
export declare class DataExportService {
    static exportUsers(res: Response, format?: 'json' | 'csv'): Promise<void>;
    static exportTournaments(res: Response, format?: 'json' | 'csv'): Promise<void>;
    static exportTeams(res: Response, format?: 'json' | 'csv'): Promise<void>;
    private static convertToCSV;
    private static getNestedValue;
}
//# sourceMappingURL=dataExport.d.ts.map