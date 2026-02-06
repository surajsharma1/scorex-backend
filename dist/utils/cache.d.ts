declare class CacheService {
    private client;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    getJSON<T>(key: string): Promise<T | null>;
    setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    getTournamentKey(id: string): string;
    getTournamentsListKey(): string;
    getTournamentStatsKey(): string;
}
export declare const cacheService: CacheService;
export default cacheService;
//# sourceMappingURL=cache.d.ts.map