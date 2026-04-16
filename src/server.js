console.log('--- BACKEND STARTING UP ---');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route files
const adminRoutes = require('./routes/adminRoutes');
const tripRoutes = require('./routes/tripRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const pageRoutes = require('./routes/pageRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));

// Set security headers
// app.use(helmet());

// Enable CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8080',
  'https://youthcamping-admin.vercel.app', // Add your admin domain here
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app') || origin.includes('railway.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/inquiry', inquiryRoutes); // Alias for singular endpoint consistency
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// @desc    Full system seed (Pages + Trips)
// @route   GET /api/dev/seed
app.get('/api/dev/seed', async (req, res) => {
  try {
    const Page = require('./models/Page');
    const Trip = require('./models/Trip');

    // 1. Create System Pages
    const pages = [
      { title: 'Home', slug: 'home', status: 'published', isSystem: true, sections: [{ id: 'hero-1', type: 'hero', data: { title: 'Adventure Awaits' } }] },
      { title: 'Tours', slug: 'tours', status: 'published', isSystem: true, sections: [{ id: 'grid-1', type: 'trip-grid', data: {} }] }
    ];

    for (const p of pages) {
      await Page.findOneAndUpdate({ slug: p.slug }, p, { upsert: true });
    }

    // 2. Import Trips
    const tripsData = [
       { title: "Manali Kasol Amritsar", location: "Manali", duration: "9 Days", price: 11999, category: "adventure", status: "published" },
       { title: "Winter Spiti Trip", location: "Spiti", duration: "10 Days", price: 19999, category: "road-trip", status: "published" }
    ];

    for (const t of tripsData) {
      await Trip.findOneAndUpdate({ title: t.title }, t, { upsert: true });
    }

    res.json({ success: true, message: 'Production data seeded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
