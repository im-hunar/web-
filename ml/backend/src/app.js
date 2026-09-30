const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const { errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const adminRoutes = require('./routes/admin.routes');
const assessmentRoutes = require('./routes/assessment.routes');
const historyRoutes = require('./routes/history.routes');
const trendsRoutes = require('./routes/trends.routes');
const alertRoutes = require('./routes/alert.routes');
const doctorRoutes = require('./routes/doctor.routes');
const privacyRoutes = require('./routes/privacy.routes');
const reminderRoutes = require('./routes/reminder.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// 1. Security Headers with Helmet
app.use(helmet());

// 2. Explicit CORS Allowlist
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.corsOrigin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: Origin '${origin}' is not in allowlist`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// 3. Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/caregiver', privacyRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'HeartGuard Backend' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 5. Global Error Handler
app.use(errorHandler);

module.exports = app;
