import type { PrismaClient } from "@prisma/client";

export type UserPrisma = Pick<PrismaClient, "user">;

export function buildUserProfileIdentity(userId: string) {
  return { id: userId };
}

export function normalizeProfileName(name: string) {
  return name.trim();
}

export async function updateUserProfile(
  prisma: UserPrisma,
  userId: string,
  data: { name: string },
) {
  return prisma.user.update({
    where: buildUserProfileIdentity(userId),
    data: {
      name: normalizeProfileName(data.name),
    },
  });
}
