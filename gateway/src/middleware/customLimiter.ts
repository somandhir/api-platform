import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

const redisClient = createClient({ url: 'redis://redis:6379' });
redisClient.connect().catch(console.error);

const BUCKET_CAPACITY = 5; // Max 5 tokens
const REFILL_RATE_PER_SECOND = 1; // 1 token added every second

export const tokenBucketLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const key = `token_bucket:${req.ip}`; // Limit based on IP
    const now = Math.floor(Date.now() / 1000);

    const bucket = await redisClient.hGetAll(key);

    let tokens: number;
    let lastRefill: number;

    if (Object.keys(bucket).length === 0) {
        tokens = BUCKET_CAPACITY;
        lastRefill = now;
    } else {
        tokens = parseInt(bucket.tokens!);
        lastRefill = parseInt(bucket.lastRefill!);

        const secondsPassed = now - lastRefill;
        const tokensToAdd = secondsPassed * REFILL_RATE_PER_SECOND;
        
        tokens = Math.min(BUCKET_CAPACITY, tokens + tokensToAdd);
        lastRefill = now;
    }

    if (tokens >= 1) {
        tokens -= 1;
        await redisClient.hSet(key, { tokens: tokens.toString(), lastRefill: lastRefill.toString() });
        
        res.setHeader('X-Custom-Token-Remaining', tokens);
        next();
    } else {
        return res.status(429).json({
            error: "Too Many Requests",
            message: "Custom Token Bucket is empty. Wait for refill!"
        });
    }
};