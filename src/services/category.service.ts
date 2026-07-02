import { PrismaClient } from "@prisma/client";

export type CategoryPrisma = Pick<PrismaClient, "category" | "transaction">;

export type CategoryInput = {
  nameRu: string;
  type: string;
  icon: string;
  color: string;
  bgColor: string;
  keywords?: string[];
};

export function normalizeCategoryDisplayName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeCategoryKeyword(keyword: string) {
  return keyword.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeCategoryKeywords(keywords: string[] = []) {
  return [...new Set(keywords.map(normalizeCategoryKeyword).filter(Boolean))];
}

export function toUserCategoryName(userId: string, nameRu: string) {
  return `user_${userId}_${normalizeCategoryKeyword(nameRu).replace(/\s+/g, "_")}`;
}

export function listVisibleCategories(
  prisma: CategoryPrisma,
  userId: string,
  type?: string,
) {
  return prisma.category.findMany({
    where: {
      ...(type && { type }),
      OR: [{ isDefault: true }, { userId }],
    },
    orderBy: [{ type: "asc" }, { nameRu: "asc" }],
  });
}

export function getVisibleCategory(
  prisma: CategoryPrisma,
  userId: string,
  categoryId: string,
) {
  return prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isDefault: true }, { userId }],
    },
  });
}

export function userVisibleCategoryExists(
  prisma: CategoryPrisma,
  userId: string,
  categoryId: string | null | undefined,
) {
  if (!categoryId) return Promise.resolve(true);

  return prisma.category
    .count({
      where: {
        id: categoryId,
        OR: [{ isDefault: true }, { userId }],
      },
    })
    .then((count) => count > 0);
}

export function createUserCategory(
  prisma: CategoryPrisma,
  userId: string,
  data: CategoryInput,
) {
  const nameRu = normalizeCategoryDisplayName(data.nameRu);

  return prisma.category.create({
    data: {
      bgColor: data.bgColor,
      color: data.color,
      icon: data.icon,
      isDefault: false,
      keywords: normalizeCategoryKeywords(data.keywords),
      name: toUserCategoryName(userId, nameRu),
      nameRu,
      type: data.type,
      userId,
    },
  });
}

export async function updateUserCategory(
  prisma: CategoryPrisma,
  userId: string,
  categoryId: string,
  data: CategoryInput,
) {
  const existingCategory = await prisma.category.findFirst({
    where: { id: categoryId, userId, isDefault: false },
    select: { id: true },
  });

  if (!existingCategory) return null;

  const nameRu = normalizeCategoryDisplayName(data.nameRu);

  return prisma.category.update({
    where: { id: categoryId },
    data: {
      bgColor: data.bgColor,
      color: data.color,
      icon: data.icon,
      keywords: normalizeCategoryKeywords(data.keywords),
      name: toUserCategoryName(userId, nameRu),
      nameRu,
      type: data.type,
    },
  });
}

export async function deleteUserCategory(
  prisma: CategoryPrisma,
  userId: string,
  categoryId: string,
) {
  const existingCategory = await prisma.category.findFirst({
    where: { id: categoryId, userId, isDefault: false },
    select: { id: true },
  });

  if (!existingCategory) return null;

  return prisma.category.delete({
    where: { id: categoryId },
  });
}
