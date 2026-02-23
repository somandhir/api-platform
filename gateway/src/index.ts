import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { apiLimiter } from './middleware/rateLimiter';
import { tokenBucketLimiter } from './middleware/customLimiter';
import { requestLogger } from './middleware/logging';
import { cacheMiddleware } from './middleware/cache';

const app = express();
const PORT = 3000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

// Proxy Configuration for Auth (Public)
const authProxyOptions: Options = {
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
};

// private service
const userProxyOptions: Options = {
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' },
    on: {
        proxyReq: (proxyReq, req, res) => {
            if (req.headers['x-user-id']) {
                proxyReq.setHeader('x-user-id', req.headers['x-user-id'] as string);
            }
        }
    }

};

app.use(requestLogger);

// rate limiting to all requests
app.use(apiLimiter);
// app.use(tokenBucketLimiter); // custom

app.use('/api/auth', cacheMiddleware, createProxyMiddleware(authProxyOptions));
app.use('/api/users', authMiddleware, cacheMiddleware, createProxyMiddleware(userProxyOptions));

app.listen(PORT, () => {
    console.log(`Gateway listening on port ${PORT}`);
});