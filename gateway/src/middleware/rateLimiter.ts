import { createClient } from 'redis';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

const redisClient = createClient({
  url: 'redis://redis:6379' // port from docker 
});

redisClient.connect().catch(console.error);

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  
  message: {
    status: 429,
    message: "Too many requests, please try again later."
  }
});