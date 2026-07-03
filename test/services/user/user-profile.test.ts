import assert from "node:assert/strict";
import test from "node:test";
import { buildUserProfileIdentity, updateUserProfile, type UserPrisma } from "../../../src/services/user.service";

type FakeUser = {
  id: string;
  name: string | null;
};

function createFakePrisma(users: FakeUser[]) {
  const calls: Array<{ method: string; args: unknown }> = [];
  const prisma = {
    user: {
      update: async (args: { where: { id: string }; data: { name: string } }) => {
        calls.push({ method: "update", args });
        const user = users.find((item) => item.id === args.where.id);
        if (!user) throw new Error("User not found");
        user.name = args.data.name;
        return user;
      },
    },
  };

  return { calls, prisma: prisma as unknown as UserPrisma };
}

test("user profile identity is scoped by current user id", () => {
  assert.deepEqual(buildUserProfileIdentity("user-a"), { id: "user-a" });
});

test("updating user profile trims name and updates current user", async () => {
  const { calls, prisma } = createFakePrisma([{ id: "user-a", name: "Old" }]);

  const user = await updateUserProfile(prisma, "user-a", { name: "  New Name  " });

  assert.equal(user.name, "New Name");
  assert.deepEqual(calls[0], {
    method: "update",
    args: {
      where: { id: "user-a" },
      data: { name: "New Name" },
    },
  });
});
