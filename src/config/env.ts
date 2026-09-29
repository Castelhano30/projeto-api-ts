import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
