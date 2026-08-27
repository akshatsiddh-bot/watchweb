const pino = require("pino");
const env = require("./env");

const isProduction = env.NODE_ENV === "production";

const logger = pino(
  {
    level: env.NODE_ENV === "test" ? "silent" : process.env.LOG_LEVEL || "info",

    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "passwordHash",
        "token",
        "jwt",
        "*.password",
        "*.passwordHash",
        "*.token",
        "*.content",
        "*.normalizedContent",
      ],
      censor: "[REDACTED]",
    },

    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },

  isProduction
    ? undefined
    : require("pino-pretty")({
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
        messageFormat: "{msg}",
      }),
);

module.exports = logger;
