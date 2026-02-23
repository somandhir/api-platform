import express, { Request, Response } from 'express';

const app = express();
const PORT = 3002;

app.use(express.json());

// Mock Database
const users = [
  { id: '123', name: 'Soman', email: 'soman@example.com', bio: 'Full-stack Learner' },
  { id: '456', name: 'Maira', email: 'maira@example.com', bio: 'AI Collaborator' }
];

app.get('/health', (req, res) => {
  res.json({ service: 'User Service', status: 'Healthy' });
});

app.get('/profile', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'User ID missing. Did you go through the Gateway?' 
    });
  }

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});