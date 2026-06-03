// generate-token.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';

// Вставьте userId который скопировали из Prisma Studio
const userId = 'cmpcd4eoj00006cl0ovaym0lo'; // ← ЗАМЕНИТЕ НА СВОЙ ID

const payload = {
  userId: userId,
  email: 'test@example.com'
};

// SECRET из .env
console.log({w: process.env.JWT_SECRET});

const SECRET = process.env.JWT_SECRET ?? ''; 

const token = jwt.sign(payload, SECRET, { 
  expiresIn: '7d' 
});

console.log('\n✅ JWT Token создан!\n');
console.log('Скопируйте этот токен в Postman:\n');
console.log(token);
console.log('\n');