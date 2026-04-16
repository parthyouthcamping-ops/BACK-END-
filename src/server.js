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

// Enable CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes('vercel.app') || origin.includes('railway.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true); 
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
});
app.use('/api', limiter);

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/inquiry', inquiryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.2', timestamp: new Date().toISOString() });
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

    // 2. Import Trips with unique slugs and required description
    const tripsData = [
       { 
         title: "Manali Kasol Amritsar", 
         slug: "manali-kasol-amritsar-backpacking", 
         location: "Manali", 
         duration: "9 Days", 
         price: 11999, 
         category: "adventure", 
         status: "published", 
         description: "A thrilling journey through the Himalayas." 
       },
       { 
         title: "Winter Spiti Trip", 
         slug: "winter-spiti-road-trip", 
         location: "Spiti", 
         duration: "10 Days", 
         price: 19999, 
         category: "road-trip", 
         status: "published", 
         description: "An epic winter expedition in the Spiti Valley." 
       }
    ];

    for (const t of tripsData) {
      await Trip.findOneAndUpdate({ slug: t.slug }, t, { upsert: true });
    }

    res.json({ success: true, message: 'Production data seeded successfully v2.0.2' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
