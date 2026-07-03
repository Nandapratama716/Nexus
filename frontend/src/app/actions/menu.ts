"use server";

import { PrismaClient, menus as MenuType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Initialize Prisma client globally to avoid multiple instances in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getMenus() {
  const menus = await prisma.menus.findMany({
    orderBy: { created_at: "desc" },
  });
  
  // Convert Decimal to string/number for serialization
  return menus.map((menu: MenuType) => ({
    ...menu,
    price: menu.price ? Number(menu.price.toString()) : 0,
    tags: menu.tags ? JSON.parse(menu.tags) : [],
  }));
}

export async function toggleMenuAvailability(id: string, isAvailable: boolean) {
  await prisma.menus.update({
    where: { id },
    data: { is_available: isAvailable, updated_at: new Date() },
  });
  revalidatePath("/dashboard/menu");
}

export async function deleteMenu(id: string) {
  await prisma.menus.delete({
    where: { id },
  });
  revalidatePath("/dashboard/menu");
}
