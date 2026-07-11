import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/download/detox-app.apk", (_req, res) => {
  const file = path.join(import.meta.dirname, "..", "static", "detox-app.apk");
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", "attachment; filename=detox-app.apk");
  res.sendFile(file);
});

app.get("/download/detox-mobile.tar.gz", (_req, res) => {
  const file = path.join(import.meta.dirname, "..", "static", "detox-mobile.tar.gz");
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=detox-mobile.tar.gz");
  res.sendFile(file);
});

app.get("/download/detox-build.tar.gz", (_req, res) => {
  const file = path.join(import.meta.dirname, "..", "static", "detox-build.tar.gz");
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=detox-build.tar.gz");
  res.sendFile(file);
});

app.get("/download/android.tar.gz", (_req, res) => {
  const file = path.join(import.meta.dirname, "..", "static", "android.tar.gz");
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=android.tar.gz");
  res.sendFile(file);
});

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

export default app;
