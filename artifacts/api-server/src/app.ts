import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes";
import gamePreviewsRouter from "./lib/game-previews";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Branding drafts carry uploaded logos/backgrounds as base64 data URIs in the
// JSON body — express's 100kb default silently 413s anything past a tiny
// image, so raise it enough to cover a real (if modest) video upload.
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(gamePreviewsRouter);
app.use("/api", router);

export default app;
