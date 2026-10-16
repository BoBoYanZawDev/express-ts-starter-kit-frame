import { getTask, getTasksByPagination } from "../../../controllers/api/TaskController";
import { createRouter } from "../../createRouter";

const router = createRouter();
router.get("/", getTasksByPagination);
router.get("/:id", getTask);
export default router;
