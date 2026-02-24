import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { publishToQueue } from '../utils/mq';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now(); // Start timer

  // Use the 'finish' event so we log AFTER the response is sent
  res.on('finish', () => {
    const duration = Date.now() - start; // Calculate duration
    const { method, originalUrl } = req;
    const { statusCode } = res;

    const limiterStatus = statusCode === 429 ? 'BLOCKED' : 'ALLOWED';
    const cacheStatus = res.getHeader('X-Cache') || 'NONE';

    const logMessage = `${method} ${originalUrl} | Status: ${statusCode} | Time: ${duration}ms | Result: ${limiterStatus} | CacheStatus: ${cacheStatus}`;

    // Publish audit log to RabbitMQ
    publishToQueue({
      event: 'HTTP_REQUEST',
      method,
      path: originalUrl,
      status: statusCode,
      duration,
      result: limiterStatus,
      cacheStatus,
      timestamp: new Date()
    });

    if (statusCode >= 400) {
      logger.error(logMessage);
    } else {
      logger.info(logMessage);
    }
  });

  next();
};