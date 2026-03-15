import { Document, Types } from 'mongoose';
import { createClient, RedisClientType } from 'redis';
// import { ITournament } from '../models/Tournament';

export class CacheService {
  getTournamentsListKey(): string {
    return 'tournaments:list';
  }

  getTournamentKey(id: string): string {
    return `tournaments:${id}`;
  }

  async getJSON(key: string): Promise<any> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.delete(key);
  }
  private client: RedisClientType | null = null;
  public isConnected: boolean = false;

  async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        console.warn('Redis not configured, running without cache');
        return;
      }

      this.client = createClient({ url: redisUrl });
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
    } catch (error) {
      console.warn('Failed to connect to Redis:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client!.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    const result = await this.client!.get(key);
    return (result as string) ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client!.setEx(key, ttlSeconds, value);
    } else {
      await this.client!.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    await this.client!.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const result = await this.client!.exists(key);
    return result === 1;
  }
}

export const cacheService = new CacheService();
