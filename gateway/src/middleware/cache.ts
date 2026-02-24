import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { responseInterceptor } from 'http-proxy-middleware';

const redisClient = createClient({ url: 'redis://redis:6379' });
redisClient.connect().catch(console.error);

export const cacheMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const userId = req.headers['x-user-id'] || 'public';
    const key = `cache:${userId}:${req.originalUrl}`;

    try {
        const cachedData = await redisClient.get(key);

        if (cachedData) {
            // SUCCESSFUL HIT
            res.setHeader('X-Cache', 'HIT');
            // We must use res.send/res.json and NOT call next()
            return res.status(200).json(JSON.parse(cachedData));
        }

        // MISS - Attach the key to the request object so the proxy can see it
        res.setHeader('X-Cache', 'MISS');
        (req as any).cacheKey = key; 
        
        next();
    } catch (err) {
        logger.error(`Cache Error: ${err}`);
        next();
    }
};

export const cacheInterceptor = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    const cacheKey = (req as any).cacheKey;
    if (cacheKey && res.statusCode === 200) {
        const response = responseBuffer.toString('utf8');
        await redisClient.setEx(cacheKey, 60, response);
    }
    return responseBuffer;
});