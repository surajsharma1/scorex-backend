"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const redis_1 = require("redis");
class CacheService {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            console.log('Connected to Redis');
            this.isConnected = true;
        });
        this.client.on('disconnect', () => {
            console.log('Disconnected from Redis');
            this.isConnected = false;
        });
    }
    async connect() {
        if (!this.isConnected) {
            try {
                await this.client.connect();
            }
            catch (error) {
                console.error('Failed to connect to Redis:', error);
            }
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.disconnect();
        }
    }
    async get(key) {
        try {
            if (!this.isConnected)
                await this.connect();
            return await this.client.get(key);
        }
        catch (error) {
            console.error('Redis GET error:', error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            if (!this.isConnected)
                await this.connect();
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, value);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (error) {
            console.error('Redis SET error:', error);
        }
    }
    async del(key) {
        try {
            if (!this.isConnected)
                await this.connect();
            await this.client.del(key);
        }
        catch (error) {
            console.error('Redis DEL error:', error);
        }
    }
    async exists(key) {
        try {
            if (!this.isConnected)
                await this.connect();
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Redis EXISTS error:', error);
            return false;
        }
    }
    // Cache with JSON serialization
    async getJSON(key) {
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }
    async setJSON(key, value, ttlSeconds) {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }
    // Tournament-specific cache methods
    getTournamentKey(id) {
        return `tournament:${id}`;
    }
    getTournamentsListKey() {
        return 'tournaments:list';
    }
    getTournamentStatsKey() {
        return 'tournaments:stats';
    }
}
exports.cacheService = new CacheService();
exports.default = exports.cacheService;
//# sourceMappingURL=cache.js.map