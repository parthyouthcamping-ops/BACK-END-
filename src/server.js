console.log('--- BACKEND STARTING UP ---');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
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
const seoRoutes = require('./routes/seoRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Connect to database
connectDB();

const app = express();

// Use compression
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));

// Static Files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  maxAge: '1d',
  immutable: true
}));
app.use('/', seoRoutes);

// Enable CORS
// ...
app.use(cors({
  origin: true,
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
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
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
app.use('/api/upload', uploadRoutes);

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
      { 
        title: 'Home', 
        slug: 'home', 
        status: 'published', 
        isSystem: true, 
        sections: [{ id: 'hero-1', type: 'hero', data: { title: 'Adventure Awaits' } }],
        seo: {
          metaTitle: 'Master the Outdoors | Adventure Tours in India',
          metaDescription: 'Discover incredible adventures with YouthCamping. From Spiti Valley to Manali, we curate trips that inspire.',
          focusKeyword: 'Adventure Tours India'
        }
      },
      { 
        title: 'Tours', 
        slug: 'tour-packages', 
        status: 'published', 
        isSystem: true, 
        sections: [{ id: 'grid-1', type: 'trip-grid', data: {} }],
        seo: {
          metaTitle: 'Explore All Tour Packages | YouthCamping',
          metaDescription: 'Browse our full collection of adventure trips, road trips, and trekking expeditions.',
          focusKeyword: 'Tour Packages India'
        }
      }
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
         description: "A thrilling journey through the Himalayas. Explore the culture of Amritsar and the serenity of Kasol.",
         seo: {
           metaTitle: 'Manali Kasol Amritsar Trip | 9 Days Backpacking Adventure',
           metaDescription: 'Join our backpacking trip to Manali, Kasol, and Amritsar. Experience the perfect blend of culture and mountains.',
           focusKeyword: 'Manali Kasol Trip'
         }
       },
       { 
         title: "Winter Spiti Trip", 
         slug: "winter-spiti-road-trip", 
         location: "Spiti", 
         duration: "10 Days", 
         price: 19999, 
         category: "road-trip", 
         status: "published", 
         description: "An epic winter expedition in the Spiti Valley. Experience the white desert like never before.",
         seo: {
           metaTitle: 'Winter Spiti Road Trip | 10 Days White Desert Adventure',
           metaDescription: 'Explore Spiti Valley in winter. Witness frozen lakes, remote monasteries, and pristine snow landscapes.',
           focusKeyword: 'Winter Spiti Trip'
         }
       }
    ];

    for (const t of tripsData) {
      await Trip.findOneAndUpdate({ slug: t.slug }, t, { upsert: true });
    }

    // 3. Create Sample Booking (optional but helpful for testing)
    const Booking = require('./models/Booking');
    const firstTrip = await Trip.findOne({ slug: 'manali-kasol-amritsar-backpacking' });
    if (firstTrip) {
      await Booking.findOneAndUpdate(
        { email: 'guest@example.com' },
        {
          userName: 'Guest User',
          email: 'guest@example.com',
          phone: '1234567890',
          tripId: firstTrip._id,
          totalAmount: firstTrip.price,
          status: 'pending'
        },
        { upsert: true }
      );
    }

    res.json({ success: true, message: 'Production data seeded successfully v2.0.3' });
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
