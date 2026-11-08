import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { contactRouter } from "./routes/contact.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp({ contactRepository, rateLimitMax = 5 }) {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY) app.set("trust proxy", 1);
  app.use(helmet());

  app.use(
    "/api/contact",
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitMax,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "TOO_MANY_REQUESTS" },
    })
  );

  app.use(express.json({ limit: "10kb" }));
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/contact", contactRouter(contactRepository));
  app.use((req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  app.use(errorHandler);
  return app;
}
