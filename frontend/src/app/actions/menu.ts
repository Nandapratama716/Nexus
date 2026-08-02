"use server";

import { menus as MenuType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function getMenus() {
  const menus = await prisma.menus.findMany({
    orderBy: { created_at: "desc" },
  });

  // Convert Decimal to string/number for serialization
  return menus.map((menu: MenuType) => ({
    ...menu,
    price: menu.price ? Number(menu.price.toString()) : 0,
    stock_qty: menu.stock_qty ?? 0,
    tags: menu.tags ? (typeof menu.tags === "string" ? JSON.parse(menu.tags) : menu.tags) : [],
  }));
}

export async function createMenu(data: {
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  stock_qty: number;
}) {
  const id = `menu-${Date.now()}`;
  const now = new Date();
  const isAvailable = data.stock_qty > 0;

  // 1. Save directly to Postgres via Prisma
  await prisma.menus.create({
    data: {
      id,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      tags: JSON.stringify(data.tags),
      stock_qty: data.stock_qty,
      is_available: isAvailable,
      created_at: now,
      updated_at: now,
    },
  });

  // 2. Notify Go Core Service API if running to publish Redis Stream event
  try {
    const coreUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    await fetch(`${coreUrl}/menus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        tags: data.tags,
        stock_qty: data.stock_qty,
        is_available: isAvailable,
      }),
    });
  } catch (err) {
    console.warn("Could not reach Go Core API to emit Redis Stream event:", err);
  }

  revalidatePath("/dashboard/menu");
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
