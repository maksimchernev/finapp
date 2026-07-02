import assert from "node:assert/strict";
import test from "node:test";
import {
  createUserCategory,
  deleteUserCategory,
  listVisibleCategories,
  updateUserCategory,
  type CategoryPrisma,
} from "../src/services/category.service";

type FakeCategory = {
  id: string;
  userId: string | null;
  name: string;
  nameRu: string;
  icon: string;
  color: string;
  bgColor: string;
  type: string;
  keywords: string[];
  isDefault: boolean;
};

function createFakePrisma(categories: FakeCategory[]) {
  const calls: Array<{ method: string; args: unknown }> = [];
  const prisma = {
    category: {
      count: async (args: { where: { id?: string; userId?: string | null; isDefault?: boolean } }) => {
        calls.push({ method: "count", args });
        return categories.filter((category) => matchesWhere(category, args.where)).length;
      },
      create: async (args: { data: Omit<FakeCategory, "id"> }) => {
        calls.push({ method: "create", args });
        const category = { id: `category-${categories.length + 1}`, ...args.data };
        categories.push(category);
        return category;
      },
      delete: async (args: { where: { id: string } }) => {
        calls.push({ method: "delete", args });
        const index = categories.findIndex((category) => category.id === args.where.id);
        if (index < 0) throw new Error("Category not found");
        return categories.splice(index, 1)[0];
      },
      findFirst: async (args: { where: { id?: string; userId?: string | null; isDefault?: boolean } }) => {
        calls.push({ method: "findFirst", args });
        return categories.find((category) => matchesWhere(category, args.where)) ?? null;
      },
      findMany: async (args: {
        orderBy?: Array<{ type?: "asc"; nameRu?: "asc" }>;
        where: {
          OR?: Array<{ isDefault?: boolean; userId?: string }>;
          type?: string;
        };
      }) => {
        calls.push({ method: "findMany", args });
        return categories.filter((category) => {
          const typeMatches = args.where.type ? category.type === args.where.type : true;
          const ownerMatches =
            args.where.OR?.some((condition) => {
              if (condition.isDefault !== undefined) return category.isDefault === condition.isDefault;
              if (condition.userId !== undefined) return category.userId === condition.userId;
              return false;
            }) ?? true;
          return typeMatches && ownerMatches;
        });
      },
      update: async (args: { where: { id: string }; data: Partial<FakeCategory> }) => {
        calls.push({ method: "update", args });
        const category = categories.find((item) => item.id === args.where.id);
        if (!category) throw new Error("Category not found");
        Object.assign(category, args.data);
        return category;
      },
    },
  };

  return { calls, prisma: prisma as unknown as CategoryPrisma };
}

test("listing categories returns default categories and categories owned by the current user", async () => {
  const { prisma } = createFakePrisma([
    createCategory({ id: "default-expense", isDefault: true, nameRu: "Продукты", userId: null }),
    createCategory({ id: "user-a-category", isDefault: false, nameRu: "Питомец", userId: "user-a" }),
    createCategory({ id: "user-b-category", isDefault: false, nameRu: "Дача", userId: "user-b" }),
  ]);

  const categories = await listVisibleCategories(prisma, "user-a");

  assert.deepEqual(
    categories.map((category) => category.id),
    ["default-expense", "user-a-category"],
  );
});

test("creating a category stores it as a user-owned non-default category", async () => {
  const { calls, prisma } = createFakePrisma([]);

  const category = await createUserCategory(prisma, "user-a", {
    bgColor: "#E4EEE5",
    color: "#244C38",
    icon: "shopping-cart",
    keywords: ["  Vet  ", "vet", " Корм "],
    nameRu: "  Питомец  ",
    type: "expense",
  });

  assert.equal(category.userId, "user-a");
  assert.equal(category.isDefault, false);
  assert.equal(category.nameRu, "Питомец");
  assert.deepEqual(category.keywords, ["vet", "корм"]);
  assert.deepEqual(calls[0], {
    method: "create",
    args: {
      data: {
        bgColor: "#E4EEE5",
        color: "#244C38",
        icon: "shopping-cart",
        isDefault: false,
        keywords: ["vet", "корм"],
        name: "user_user-a_питомец",
        nameRu: "Питомец",
        type: "expense",
        userId: "user-a",
      },
    },
  });
});

test("updating a default category is rejected before mutation", async () => {
  const { calls, prisma } = createFakePrisma([
    createCategory({ id: "default-expense", isDefault: true, userId: null }),
  ]);

  const category = await updateUserCategory(prisma, "user-a", "default-expense", {
    bgColor: "#E4EEE5",
    color: "#244C38",
    icon: "shopping-cart",
    keywords: ["pets"],
    nameRu: "Питомец",
    type: "expense",
  });

  assert.equal(category, null);
  assert.equal(calls.some((call) => call.method === "update"), false);
});

test("deleting another user's or default category is rejected before mutation", async () => {
  const { calls, prisma } = createFakePrisma([
    createCategory({ id: "default-expense", isDefault: true, userId: null }),
    createCategory({ id: "user-b-category", isDefault: false, userId: "user-b" }),
  ]);

  assert.equal(await deleteUserCategory(prisma, "user-a", "default-expense"), null);
  assert.equal(await deleteUserCategory(prisma, "user-a", "user-b-category"), null);
  assert.equal(calls.some((call) => call.method === "delete"), false);
});

test("deleting the current user's category removes it", async () => {
  const { calls, prisma } = createFakePrisma([
    createCategory({ id: "user-a-category", isDefault: false, userId: "user-a" }),
  ]);

  const category = await deleteUserCategory(prisma, "user-a", "user-a-category");

  assert.equal(category?.id, "user-a-category");
  assert.deepEqual(calls.at(-1), {
    method: "delete",
    args: { where: { id: "user-a-category" } },
  });
});

function createCategory(patch: Partial<FakeCategory>): FakeCategory {
  return {
    bgColor: "#FAECE7",
    color: "#D85A30",
    icon: "shopping-cart",
    id: "category",
    isDefault: true,
    keywords: [],
    name: "groceries",
    nameRu: "Продукты",
    type: "expense",
    userId: null,
    ...patch,
  };
}

function matchesWhere(
  category: FakeCategory,
  where: { id?: string; userId?: string | null; isDefault?: boolean },
) {
  if (where.id !== undefined && category.id !== where.id) return false;
  if (where.userId !== undefined && category.userId !== where.userId) return false;
  if (where.isDefault !== undefined && category.isDefault !== where.isDefault) return false;
  return true;
}
