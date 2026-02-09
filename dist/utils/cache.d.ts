export declare class CacheService {
    getTournamentsListKey(): string;
    getTournamentKey(id: string): string;
    getJSON(key: string): Promise<any>;
    setJSON(key: string, value: any, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    private client;
    isConnected: boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
export declare const cacheService: CacheService;
//# sourceMappingURL=cache.d.ts.map