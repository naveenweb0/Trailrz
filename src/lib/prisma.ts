import { PrismaClient } from "@prisma/client";

const createPrismaClient = () => {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          let attempts = 0;
          while (attempts < 3) {
            try {
              return await query(args);
            } catch (err: any) {
              attempts++;
              const isTransient =
                err.message?.includes("Can't reach database server") ||
                err.message?.includes("connection pool") ||
                err.message?.includes("Connection closed") ||
                err.message?.includes("Closed") ||
                err.code === "P1001" ||
                err.code === "P1002" ||
                err.code === "P1017" ||
                err.code === "P2024";
              if (!isTransient || attempts >= 3 || err.message?.includes("Transaction")) throw err;
              await new Promise((resolve) => setTimeout(resolve, 250 * attempts));
            }
          }
        },
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
