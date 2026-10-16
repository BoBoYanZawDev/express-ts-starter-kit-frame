import { createRouter } from "../../createRouter";
import taskRoutes from "./task";

const router = createRouter();
router.use("/tasks", taskRoutes);
export default router;
