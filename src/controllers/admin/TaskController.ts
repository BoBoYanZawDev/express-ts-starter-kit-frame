import type { Request, Response } from "express";
import { body, matchedData, param } from "express-validator";
import { createOneTask, getTaskById, updateOneTask, deleteOneTask, type TaskArgs } from "../../services/taskServices";
import { checkModelIfExist, checkValidationErrors } from "../../utils/check";

// Build fresh validation chains for each controller.
const taskBodyRules = (partial = false) => {
  const title = body("title");
  if (partial) title.optional();
  return [
    body().isObject({ strict: true }).withMessage("Body must be a JSON object.").bail()
      .custom((value: Record<string, unknown>) => {
        const keys = Object.keys(value);
        if (keys.some((key) => !["title", "completed"].includes(key))) {
          throw new Error("Only title and completed are accepted.");
        }
        if (partial && keys.length === 0) throw new Error("Provide title or completed.");
        return true;
      }),
    title.isString().withMessage("Title must be a string.").bail()
      .trim().isLength({ min: 1, max: 200 }).withMessage("Title must contain 1 to 200 characters."),
    body("completed").optional().isBoolean({ strict: true }).withMessage("Completed must be a boolean."),
  ];
};

export const createTask = [
  ...taskBodyRules(),
  async (req: Request, res: Response) => {
    checkValidationErrors(req);
    const taskData = matchedData<TaskArgs>(req, { locations: ["body"] });
    const task = await createOneTask(taskData);
    res.location(`/api/v1/user/tasks/${task.id}`);
    res.status(201).json({ message: "Task created successfully.", task });
  },
];

export const updateTask = [
  param("id", "Task id must be a valid UUID.").isUUID(4),
  ...taskBodyRules(true),
  async (req: Request, res: Response) => {
    checkValidationErrors(req);
    const { id } = matchedData<{ id: string }>(req, { locations: ["params"] });
    const existingTask = await getTaskById(id);
    checkModelIfExist(existingTask, "Task not found.");
    const taskData = matchedData<Partial<TaskArgs>>(req, { locations: ["body"] });
    const task = await updateOneTask(id, taskData);
    res.status(200).json({ message: "Task updated successfully.", task });
  },
];

export const deleteTask = [
  param("id", "Task id must be a valid UUID.").isUUID(4),
  async (req: Request, res: Response) => {
    checkValidationErrors(req);
    const { id } = matchedData<{ id: string }>(req);
    const task = await getTaskById(id);
    checkModelIfExist(task, "Task not found.");
    await deleteOneTask(id);
    res.status(200).json({ message: "Task deleted successfully." });
  },
];
