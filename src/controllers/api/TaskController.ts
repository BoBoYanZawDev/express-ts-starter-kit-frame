import type { Request, Response } from "express";
import { matchedData, param, query } from "express-validator";
import { getTaskById, getTasksList } from "../../services/taskServices";
import { checkModelIfExist, checkValidationErrors } from "../../utils/check";

export const getTask = [
  param("id", "Task id must be a valid UUID.").isUUID(4),
  async (req: Request, res: Response) => {
    checkValidationErrors(req);
    const { id } = matchedData<{ id: string }>(req);
    const task = await getTaskById(id);
    checkModelIfExist(task, "Task not found.");
    res.status(200).json({ message: "Task fetched successfully.", task });
  },
];

export const getTasksByPagination = [
  query("page", "Page must be between 1 and 1000000.")
    .optional().isInt({ min: 1, max: 1_000_000 }).toInt(),
  query("limit", "Limit must be between 1 and 100.")
    .optional().isInt({ min: 1, max: 100 }).toInt(),
  async (req: Request, res: Response) => {
    checkValidationErrors(req);
    const { page = 1, limit = 20 } = matchedData<{ page?: number; limit?: number }>(req);
    const tasks = await getTasksList({
      skip: (page - 1) * limit,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const hasNextPage = tasks.length > limit;
    if (hasNextPage) tasks.pop();
    res.status(200).json({
      message: "Tasks fetched successfully.",
      tasks,
      currentPage: page,
      hasNextPage,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
    });
  },
];
