import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requireAuth, AuthRequest } from './middleware/auth';
import { generatePresignedUploadUrl } from './lib/s3';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import dealRoutes from './routes/deals';
import paymentRoutes from './routes/payments';
import settlementRoutes from './routes/settlements';
import dashboardRoutes from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.post(
  '/api/uploads/presign',
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const { folder, contentType } = req.body;

    if (!contentType) {
      res.status(400).json({ error: 'contentType is required' });
      return;
    }

    const validFolders = ['products', 'receipts'];
    const targetFolder = validFolders.includes(folder) ? folder : 'products';

    try {
      const result = await generatePresignedUploadUrl(
        targetFolder as 'products' | 'receipts',
        contentType
      );
      res.json(result);
    } catch (error) {
      console.error('Presign error:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Variant server running on port ${PORT}`);
});

export default app;
