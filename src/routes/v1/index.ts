import { createRouter } from "../createRouter";
import userRoutes from "./api";
import adminRoutes from "./admin";

export const router = createRouter();

router.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    message: "Server is running.",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
router.use("/api/v1/user", userRoutes);
// This is a frame only. Add auth + authorise middleware before deploying admin routes.
router.use("/api/v1/admin", adminRoutes);

export default router;
