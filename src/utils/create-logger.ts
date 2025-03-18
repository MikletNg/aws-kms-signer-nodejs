import winston from "winston";

export const createLogger = (service?: string) => {
  const transports: winston.transport[] = [new winston.transports.Console()];
  return winston.createLogger({
    defaultMeta: { service },
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [...transports],
  });
};
