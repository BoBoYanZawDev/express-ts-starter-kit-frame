import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";

export type TaskArgs = { title: string; completed?: boolean };

export const createOneTask = async (taskData: TaskArgs) => {
  return prisma.task.create({ data: {
    title: taskData.title,
    completed: taskData.completed ?? false,
  } });
};

export const getTaskById = async (id: string) => {
  return prisma.task.findUnique({ where: { id } });
};

export const getTasksList = async (options: Prisma.TaskFindManyArgs) => {
  return prisma.task.findMany(options);
};

export const updateOneTask = async (id: string, taskData: Partial<TaskArgs>) => {
  return prisma.task.update({ where: { id }, data: {
    ...(taskData.title !== undefined ? { title: taskData.title } : {}),
    ...(taskData.completed !== undefined ? { completed: taskData.completed } : {}),
  } });
};

export const deleteOneTask = async (id: string) => {
  return prisma.task.delete({ where: { id } });
};
