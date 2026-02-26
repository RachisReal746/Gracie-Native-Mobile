require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const journalRoutes = require('./routes/journalRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow embedding in B12 website
}));

const allowedOrigins = [
  'https://www.anchoredbygrace.online',
  'https://anchoredbygrace.online',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now during beta
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from website folder
app.use(express.static('../website'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journal', journalRoutes);

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '../website' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Gracie API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Gracie Server Started`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🚀 Also accessible at http://192.168.0.2:${PORT}`); console.log(`🚀 Also accessible at http://192.168.1.82:${PORT}`);
  console.log(`📁 Serving website from: ${__dirname}/../website`);
  console.log(`🔗 Supabase connected to: ${process.env.SUPABASE_URL}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`📧 Email service ready: ${process.env.SMTP_FROM_EMAIL}\n`);
});
