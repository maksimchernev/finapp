import assert from "node:assert/strict";
import test from "node:test";
import { updateUserBank, type BankPrisma } from "../../../src/services/bank.service";

type FakeBank = {
  id: string;
  userId: string;
  name: string;
  normalizedName: string;
  keywords: string[];
};

function createFakePrisma(banks: FakeBank[]) {
  const calls: Array<{ method: string; args: unknown }> = [];
  const prisma = {
    bank: {
      findFirst: async (args: { where: { id: string; userId: string }; select?: { id: true } }) => {
        calls.push({ method: "findFirst", args });
        const bank = banks.find((item) => item.id === args.where.id && item.userId === args.where.userId);
        if (!bank) return null;
        return args.select ? { id: bank.id } : bank;
      },
      update: async (args: { where: { id: string }; data: Partial<FakeBank> }) => {
        calls.push({ method: "update", args });
        const bank = banks.find((item) => item.id === args.where.id);
        if (!bank) throw new Error("Bank not found");
        Object.assign(bank, args.data);
        return bank;
      },
    },
  };

  return { calls, prisma: prisma as unknown as BankPrisma };
}

test("updating a bank normalizes name and keywords for current user", async () => {
  const { calls, prisma } = createFakePrisma([
    {
      id: "bank-a",
      userId: "user-a",
      name: "Old Bank",
      normalizedName: "old bank",
      keywords: ["old bank"],
    },
  ]);

  const bank = await updateUserBank(prisma, "user-a", "bank-a", {
    keywords: ["  Ozon Bank  ", "ozon bank", " 0zon банк "],
    name: "  Ozon   Банк  ",
  });

  assert.equal(bank?.name, "Ozon Банк");
  assert.deepEqual(bank?.keywords, ["ozon bank", "0zon банк"]);
  assert.deepEqual(calls[1], {
    method: "update",
    args: {
      where: { id: "bank-a" },
      data: {
        keywords: ["ozon bank", "0zon банк"],
        name: "Ozon Банк",
        normalizedName: "ozon банк",
      },
    },
  });
});

test("updating another user's bank is rejected before mutation", async () => {
  const { calls, prisma } = createFakePrisma([
    {
      id: "bank-a",
      userId: "user-a",
      name: "Bank",
      normalizedName: "bank",
      keywords: [],
    },
  ]);

  const bank = await updateUserBank(prisma, "user-b", "bank-a", {
    keywords: ["bank"],
    name: "New Bank",
  });

  assert.equal(bank, null);
  assert.equal(calls.some((call) => call.method === "update"), false);
  assert.deepEqual(calls[0], {
    method: "findFirst",
    args: {
      where: { id: "bank-a", userId: "user-b" },
      select: { id: true },
    },
  });
});
