"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const redis_1 = require("redis");
class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }
    getTournamentsListKey() {
        return 'tournaments:list';
    }
    getTournamentKey(id) {
        return `tournaments:${id}`;
    }
    async getJSON(key) {
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }
    async setJSON(key, value, ttlSeconds) {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }
    async del(key) {
        await this.delete(key);
    }
    async connect() {
        try {
            const redisUrl = process.env.REDIS_URL;
            if (!redisUrl) {
                console.warn('Redis not configured, running without cache');
                return;
            }
            this.client = (0, redis_1.createClient)({ url: redisUrl });
            this.client.on('error', (err) => console.error('Redis Client Error', err));
            this.client.on('connect', () => {
                this.isConnected = true;
                console.log('Redis connected');
            });
            this.client.on('disconnect', () => {
                this.isConnected = false;
                console.log('Redis disconnected');
            });
            await this.client.connect();
        }
        catch (error) {
            console.warn('Failed to connect to Redis:', error);
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
        }
    }
    async get(key) {
        if (!this.client)
            return null;
        const result = await this.client.get(key);
        return result ?? null;
    }
    async set(key, value, ttlSeconds) {
        if (!this.client)
            return;
        if (ttlSeconds) {
            await this.client.setEx(key, ttlSeconds, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async delete(key) {
        if (!this.client)
            return;
        await this.client.del(key);
    }
    async exists(key) {
        if (!this.client)
            return false;
        const result = await this.client.exists(key);
        return result === 1;
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
//# sourceMappingURL=cache.js.map