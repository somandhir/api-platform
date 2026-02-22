import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Get token from "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ message: 'No token provided. Access denied.' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // We inject the userId into the headers so the next service knows who this is
    req.headers['x-user-id'] = decoded.userId;
    
    next(); // Move to the proxy
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};