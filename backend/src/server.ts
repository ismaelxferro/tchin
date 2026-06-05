import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.routes";
import courseRoutes from "./routes/course.routes";
import assignmentRoutes from "./routes/assignment.routes";
import submissionRoutes from "./routes/submission.routes";
import messageRoutes from "./routes/message.routes";

const app = express();

const port = process.env.PORT || 3000;

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "T-Chin API is running",
  });
});

app.use("/auth", authRoutes);
app.use("/courses", courseRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/submissions", submissionRoutes);
app.use("/messages", messageRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});