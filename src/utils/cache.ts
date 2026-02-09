import { createClient, RedisClientType } from 'redis';

export class CacheService {
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
    return await this.client!.get(key);
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
