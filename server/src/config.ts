import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  dbPath: process.env.DB_PATH ?? path.resolve(process.cwd(), "data/pixelpanic.sqlite"),
  clientDistPath: path.resolve(process.cwd(), "..", "client", "dist"),
};
