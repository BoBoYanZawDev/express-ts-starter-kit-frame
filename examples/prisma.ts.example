import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    user: {
      fullName: {
        needs: {
          firstName: true,
          lastName: true,
        },
        compute(user) {
          return (user.firstName ?? "") + " " + (user.lastName ?? "");
        },
      },
      image: {
        needs: {
          image: true,
        },
        compute(user) {
          if (user.image) {
            return "/optimize_img/" + user?.image.split(".")[0] + ".webp";
          }
          return null;
        },
      },
    },
    post: {
      image: {
        needs: {
          image: true,
        },
        compute(post) {
          return "/optimize_img/" + post?.image.split(".")[0] + ".webp";
        },
      },
      updatedAt: {
        needs: {
          updatedAt: true,
        },
        compute(post) {
          return post.updatedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        },
      },
    },
    image: {
      path: {
        needs: { path: true },
        compute(image) {
          return "/optimize_img/" + image.path.split(".")[0] + ".webp";
        },
      },
    },
  },
});

export { prisma };
