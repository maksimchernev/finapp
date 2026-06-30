import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  // Expenses
  {
    name: 'groceries',
    nameRu: 'Продукты',
    icon: 'shopping-cart',
    color: '#D85A30',
    bgColor: '#FAECE7',
    type: 'expense',
    keywords: ['mercadona', 'carrefour', 'lidl', 'dia', 'aldi', 'супермаркет', 'магазин', 'продукты'],
    isDefault: true,
  },
  {
    name: 'transport',
    nameRu: 'Транспорт',
    icon: 'bus',
    color: '#D4537E',
    bgColor: '#FBEAF0',
    type: 'expense',
    keywords: ['metro', 'taxi', 'uber', 'cabify', 'bolt', 'renfe', 'транспорт', 'такси', 'метро'],
    isDefault: true,
  },
  {
    name: 'cafe_restaurants',
    nameRu: 'Кафе и рестораны',
    icon: 'coffee',
    color: '#1D9E75',
    bgColor: '#E1F5EE',
    type: 'expense',
    keywords: ['cafe', 'restaurant', 'bar', 'starbucks', 'mcdonalds', 'pizza', 'кафе', 'ресторан', 'бар', 'фастфуд', 'пицца', 'еда'],
    isDefault: true,
  },
  {
    name: 'entertainment',
    nameRu: 'Развлечения',
    icon: 'movie',
    color: '#7F77DD',
    bgColor: '#EEEDFE',
    type: 'expense',
    keywords: ['cinema', 'netflix', 'spotify', 'game', 'steam', 'кино', 'развлечения', 'игры'],
    isDefault: true,
  },
  {
    name: 'healthcare',
    nameRu: 'Здоровье',
    icon: 'heartbeat',
    color: '#E24B4A',
    bgColor: '#FBEAEA',
    type: 'expense',
    keywords: ['pharmacy', 'hospital', 'doctor', 'аптека', 'врач', 'больница'],
    isDefault: true,
  },
  {
    name: 'shopping',
    nameRu: 'Покупки',
    icon: 'shopping-bag',
    color: '#BA7517',
    bgColor: '#FAEEDA',
    type: 'expense',
    keywords: ['zara', 'h&m', 'amazon', 'ebay', 'магазин', 'покупки', 'одежда'],
    isDefault: true,
  },
  {
    name: 'utilities',
    nameRu: 'Коммунальные услуги',
    icon: 'bolt',
    color: '#378ADD',
    bgColor: '#E6F1FB',
    type: 'expense',
    keywords: ['electricity', 'water', 'gas', 'internet', 'комуналка', 'электричество', 'вода'],
    isDefault: true,
  },
  {
    name: 'loans',
    nameRu: 'Кредиты',
    icon: 'credit-card',
    color: '#8B5E34',
    bgColor: '#F3E8DA',
    type: 'expense',
    keywords: ['погашение кредита', 'платеж по кредиту', 'ипотека', 'заём', 'займ', 'loan'],
    isDefault: true,
  },
  {
    name: 'other_expense',
    nameRu: 'Прочие расходы',
    icon: 'dots',
    color: '#5F5E5A',
    bgColor: '#F1EFE8',
    type: 'expense',
    keywords: [],
    isDefault: true,
  },
  
  // Income
  {
    name: 'salary',
    nameRu: 'Зарплата',
    icon: 'cash',
    color: '#639922',
    bgColor: '#EAF3DE',
    type: 'income',
    keywords: ['salary', 'payroll', 'wage', 'зарплата', 'оклад'],
    isDefault: true,
  },
  {
    name: 'freelance',
    nameRu: 'Фриланс',
    icon: 'briefcase',
    color: '#378ADD',
    bgColor: '#E6F1FB',
    type: 'income',
    keywords: ['freelance', 'upwork', 'fiverr', 'фриланс', 'проект'],
    isDefault: true,
  },
  {
    name: 'cashback',
    nameRu: 'Кешбэк',
    icon: 'receipt-refund',
    color: '#1D9E75',
    bgColor: '#E1F5EE',
    type: 'income',
    keywords: ['cashback', 'кешбэк', 'кэшбэк', 'кэшбек', 'кешбек', 'возврат за покупку'],
    isDefault: true,
  },
  {
    name: 'interest',
    nameRu: 'Проценты',
    icon: 'percentage',
    color: '#2E7DD7',
    bgColor: '#E6F1FB',
    type: 'income',
    keywords: ['проценты', 'проценты на остаток', 'ежедневный доход', 'interest'],
    isDefault: true,
  },
  {
    name: 'other_income',
    nameRu: 'Прочие доходы',
    icon: 'plus',
    color: '#1D9E75',
    bgColor: '#E1F5EE',
    type: 'income',
    keywords: [],
    isDefault: true,
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      create: category,
      update: category,
    });
  }

  console.log(`✅ Upserted ${categories.length} categories`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
