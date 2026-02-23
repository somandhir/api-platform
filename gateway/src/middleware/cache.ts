import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisClient = createClient({ url: 'redis://redis:6379' });
redisClient.connect().catch(console.error);

export const cacheMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    //  Only cache GET requests
    if (req.method !== 'GET') return next();

    const userId = req.headers['x-user-id'] || 'public';
    const key = `cache:${userId}:${req.originalUrl}`;

    try {
        const cachedData = await redisClient.get(key);

        if (cachedData) {
            // CACHE HIT
            // We manually set the status and send because we're skipping the proxy
            res.setHeader('X-Cache', 'HIT');
            return res.status(200).json(JSON.parse(cachedData));
        }

        // CACHE MISS
        // We need to capture the response from the service to cache it
        res.setHeader('X-Cache', 'MISS');
        const originalJson = res.json;
        res.json = (body: any): any => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                redisClient.setEx(key, 60, JSON.stringify(body));
            }
            return originalJson.call(res, body);
        };

        next();
    } catch (err) {
        logger.error(`Cache Error: ${err}`);
        next();
    }
};