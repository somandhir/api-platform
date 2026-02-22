import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'Auth Service is healthy and running!' });
});

app.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'password') {
    const token = jwt.sign(
      { userId: '123', role: 'admin' }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    return res.json({ token });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

app.listen(PORT, () => {
  console.log(`Auth Service on port ${PORT}`);
});