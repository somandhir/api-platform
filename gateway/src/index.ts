import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const services = {
  auth: 'http://localhost:3001',
  users: 'http://localhost:3002',
  orders: 'http://localhost:3003',
};

app.use('/api/auth',createProxyMiddleware({
    target: services.auth,
    changeOrigin: true,
    pathRewrite: {'^/api/auth': ''}
}))

app.use('/api/users', createProxyMiddleware({ 
  target: services.users, 
  changeOrigin: true,
  pathRewrite: { '^/api/users': '' }
}));

app.listen(PORT, () => {
  console.log(`Gateway running at http://localhost:${PORT}`);
});