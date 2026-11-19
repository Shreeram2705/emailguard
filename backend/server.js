
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import { connectDatabase } from './config/database.js';
import { emailRouter } from './routes/emails.js';
import dashboard from './routes/dashboard.js';
import alerts from './routes/alerts.js';
import dfa from './routes/dfa.js';

const app = express();

const PORT = Number(process.env.PORT) || 4000;

// Trust Render/Vercel proxy headers when deployed
if (process.env.VERCEL || process.env.RENDER) {
    app.set('trust proxy', 1);
}

// ========================================
// CORS CONFIGURATION
// ========================================

const allowedOrigins = new Set(
    [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://emailguard-2x54.vercel.app',
        process.env.CLIENT_ORIGIN
    ].filter(Boolean)
);

app.use(helmet());

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true);
            }

            console.error('[CORS BLOCKED]', origin);
            return callback(new Error('CORS: Origin not allowed'));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    })
);

// ========================================
// REQUEST LOGGING
// ========================================

app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const requestedAt = new Date();

    res.on('finish', () => {
        console.log(
            JSON.stringify({
                method: req.method,
                endpoint: req.originalUrl.split('?')[0],
                requestedAt: requestedAt.toISOString(),
                respondedAt: new Date().toISOString(),
                status: res.statusCode,
                durationMs:
                    Number(process.hrtime.bigint() - start) / 1e6
            })
        );
    });

    next();
});

// ========================================
// BODY PARSING
// ========================================

app.use(express.json({ limit: '128kb' }));

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    if (
        req.is('application/json') &&
        (!req.body ||
            typeof req.body !== 'object' ||
            Array.isArray(req.body))
    ) {
        return res.status(400).json({
            error: 'JSON request body must be an object'
        });
    }

    next();
});

// ========================================
// RATE LIMITING
// ========================================

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 300,
        standardHeaders: true,
        legacyHeaders: false
    })
);

// ========================================
// ROOT ROUTE
// ========================================

app.get('/', (req, res) => {
    res.status(200).json({
        name: 'EmailGuard API',
        status: 'ok',
        health: '/api/health'
    });
});

// ========================================
// DATABASE CONNECTION HELPER
// ========================================

let databaseConnectionPromise = null;

async function ensureDatabaseConnection() {
    if (mongoose.connection.readyState === 1) {
        return true;
    }

    if (!process.env.MONGODB_URI) {
        console.error('[DATABASE] MONGODB_URI is not configured');
        return false;
    }

    if (!databaseConnectionPromise) {
        databaseConnectionPromise = connectDatabase()
            .then(() => true)
            .catch((err) => {
                console.error(
                    '[DATABASE ERROR]',
                    err.message
                );
                return false;
            })
            .finally(() => {
                databaseConnectionPromise = null;
            });
    }

    return databaseConnectionPromise;
}

// ========================================
// HEALTH CHECK
// ========================================

app.get('/api/health', async (req, res) => {
    await ensureDatabaseConnection();

    res.status(200).json({
        status: 'ok',
        database:
            mongoose.connection.readyState === 1
                ? 'connected'
                : 'disconnected',
        time: new Date().toISOString()
    });
});

// ========================================
// DATABASE CHECK BEFORE API REQUESTS
// ========================================

app.use('/api', async (req, res, next) => {
    await ensureDatabaseConnection();
    next();
});

// ========================================
// API ROUTES
// ========================================

app.use('/api/emails', emailRouter);
app.use('/api/dashboard', dashboard);
app.use('/api/alerts', alerts);
app.use('/api/dfa', dfa);

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
    res.status(404).json({
        error: 'API route not found',
        path: req.originalUrl
    });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err.message);

    if (err.message === 'CORS: Origin not allowed') {
        return res.status(403).json({
            error: 'Origin not allowed by CORS policy'
        });
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'Invalid JSON request body'
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Invalid request data'
        });
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({
            error:
                err.code === 'LIMIT_FILE_SIZE'
                    ? 'File exceeds 1 MB limit'
                    : 'Invalid file upload'
        });
    }

    const status = err.status || err.statusCode || 500;

    res.status(status).json({
        error:
            status < 500
                ? err.message
                : 'Request could not be completed'
    });
});

// ========================================
// START SERVER
// ========================================

if (process.env.NODE_ENV !== 'test') {
    if (!process.env.VERCEL) {
        app.listen(PORT, '0.0.0.0', () => {
            console.log('====================================');
            console.log('EmailGuard API Started Successfully');
            console.log(`Port: ${PORT}`);
            console.log(`Health: http://localhost:${PORT}/api/health`);
            console.log('====================================');
        });
    }

    // Start database connection
    ensureDatabaseConnection();
}

export default app;
