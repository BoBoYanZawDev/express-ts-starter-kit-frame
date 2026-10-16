import { createTask, updateTask, deleteTask } from "../../../controllers/admin/TaskController";
import { createRouter } from "../../createRouter";

const router = createRouter();
router.post("/", createTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
export default router;
