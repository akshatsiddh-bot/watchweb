const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");

const env = require("./config/env");
const logger = require("./config/logger");
const connectDB = require("./config/db");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const watchRoutes = require("./routes/watchRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow the dashboard's origin and requests with no origin (e.g. the
      // extension's background service worker, curl, server-to-server).
      if (!origin || origin === env.CLIENT_URL) {
        return callback(null, true);
      }
      // Chrome extensions send an origin like chrome-extension://<id>
      if (
        env.EXTENSION_ID &&
        origin === `chrome-extension://${env.EXTENSION_ID}`
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(
  pinoHttp({
    logger,

    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
        };
      },

      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },

    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },

    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },

    customErrorMessage(req, res, err) {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
  }),
);

// Global rate limiter as defense-in-depth; auth routes have a stricter limiter on top.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() }),
);

app.use("/api/auth", authRoutes);
app.use("/api", watchRoutes);
app.use("/api/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(env.PORT, () => {
    logger.info(
      `WatchWeb backend listening on port ${env.PORT} [${env.NODE_ENV}]`,
    );
  });
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
}

module.exports = app;
