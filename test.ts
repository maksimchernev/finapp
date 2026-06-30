import "dotenv/config";
import jwt from "jsonwebtoken";

// Вставьте userId который скопировали из Prisma Studio
const userId = "cmquo2lve0000uofl6unnpa0t"; // ← ЗАМЕНИТЕ НА СВОЙ ID

const payload = {
  userId: userId,
  email: "test@example.com",
};

const SECRET = process.env.JWT_SECRET ?? "";

if (!SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Add it to .env or pass it before running this script.",
  );
}

const token = jwt.sign(payload, SECRET, {
  expiresIn: "7d",
});

console.log("\n✅ JWT Token создан!\n");
console.log("Скопируйте этот токен в Postman:\n");
console.log(token);
console.log("\n");
