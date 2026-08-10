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
    keywords: [
      'mercadona', 'carrefour', 'lidl', 'dia', 'aldi',
      'supermarket', 'grocery', 'groceries', 'food store', 'convenience store', 'mini market', 'hypermarket',
      'супермаркет', 'магазин', 'продукты',
    ],
    isDefault: true,
  },
  {
    name: 'transport',
    nameRu: 'Транспорт',
    icon: 'bus',
    color: '#D4537E',
    bgColor: '#FBEAF0',
    type: 'expense',
    keywords: [
      'metro', 'taxi', 'uber', 'cabify', 'bolt', 'renfe',
      'carsharing', 'bus', 'train', 'subway', 'underground', 'tram', 'parking', 'transit', 'public transport', 'fuel', 'petrol', 'gas station',
      'каршеринг', 'транспорт', 'такси', 'метро',
    ],
    isDefault: true,
  },
  {
    name: 'cafe_restaurants',
    nameRu: 'Кафе и рестораны',
    icon: 'coffee',
    color: '#1D9E75',
    bgColor: '#E1F5EE',
    type: 'expense',
    keywords: [
      'cafe', 'coffee', 'restaurant', 'bar', 'pub', 'starbucks', 'mcdonalds', 'burger', 'pizza', 'sushi', 'bakery', 'food delivery', 'takeaway', 'fast food',
      'кафе', 'ресторан', 'бар', 'фастфуд', 'пицца', 'еда',
    ],
    isDefault: true,
  },
  {
    name: 'entertainment',
    nameRu: 'Развлечения',
    icon: 'movie',
    color: '#7F77DD',
    bgColor: '#EEEDFE',
    type: 'expense',
    keywords: [
      'cinema', 'movie', 'theatre', 'theater', 'concert', 'ticket', 'tickets', 'netflix', 'spotify', 'game', 'games', 'gaming', 'steam', 'playstation', 'xbox',
      'кино', 'развлечения', 'игры',
    ],
    isDefault: true,
  },
  {
    name: 'healthcare',
    nameRu: 'Здоровье',
    icon: 'heartbeat',
    color: '#E24B4A',
    bgColor: '#FBEAEA',
    type: 'expense',
    keywords: [
      'pharmacy', 'drugstore', 'hospital', 'clinic', 'doctor', 'medical', 'medicine', 'dentist', 'healthcare', 'health',
      'аптека', 'врач', 'больница',
    ],
    isDefault: true,
  },
  {
    name: 'shopping',
    nameRu: 'Покупки',
    icon: 'shopping-bag',
    color: '#BA7517',
    bgColor: '#FAEEDA',
    type: 'expense',
    keywords: [
      'zara', 'h&m', 'amazon', 'ebay', 'marketplace', 'store', 'shop', 'mall', 'retail', 'clothing', 'clothes', 'shoes', 'electronics', 'cosmetics', 'home improvement',
      'магазин', 'покупки', 'одежда',
    ],
    isDefault: true,
  },
  {
    name: 'utilities',
    nameRu: 'Коммунальные услуги',
    icon: 'bolt',
    color: '#378ADD',
    bgColor: '#E6F1FB',
    type: 'expense',
    keywords: [
      'electricity', 'water', 'gas', 'internet', 'utilities', 'utility', 'bill', 'bills', 'mobile', 'telecom', 'phone bill', 'broadband',
      'комуналка', 'коммуналка', 'электричество', 'вода',
    ],
    isDefault: true,
  },
  {
    name: 'loans',
    nameRu: 'Кредиты',
    icon: 'credit-card',
    color: '#8B5E34',
    bgColor: '#F3E8DA',
    type: 'expense',
    keywords: [
      'loan', 'loan payment', 'loan repayment', 'mortgage', 'mortgage payment', 'credit payment', 'debt payment',
      'погашение кредита', 'платеж по кредиту', 'ипотека', 'заём', 'займ',
    ],
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
    keywords: ['salary', 'payroll', 'wage', 'paycheck', 'compensation', 'bonus', 'зарплата', 'оклад', 'премия'],
    isDefault: true,
  },
  {
    name: 'freelance',
    nameRu: 'Фриланс',
    icon: 'briefcase',
    color: '#378ADD',
    bgColor: '#E6F1FB',
    type: 'income',
    keywords: ['freelance', 'upwork', 'fiverr', 'contractor', 'consulting', 'invoice payment', 'payout', 'project payment', 'фриланс', 'проект'],
    isDefault: true,
  },
  {
    name: 'cashback',
    nameRu: 'Кешбэк',
    icon: 'receipt-refund',
    color: '#1D9E75',
    bgColor: '#E1F5EE',
    type: 'income',
    keywords: ['cashback', 'cash back', 'reward', 'rewards', 'rebate', 'refund for purchase', 'кешбэк', 'кэшбэк', 'кэшбек', 'кешбек', 'возврат за покупку'],
    isDefault: true,
  },
  {
    name: 'interest',
    nameRu: 'Проценты',
    icon: 'percentage',
    color: '#2E7DD7',
    bgColor: '#E6F1FB',
    type: 'income',
    keywords: ['interest', 'savings interest', 'deposit interest', 'balance interest', 'interest payment', 'проценты', 'проценты на остаток', 'ежедневный доход'],
    isDefault: true,
  },
  {
    name: 'other_income',
    nameRu: 'Прочие доходы',
    icon: 'plus',
    color: '#1D9E75',
    bgColor: '#E1F5EE',
    type: 'income',
    keywords: ['incoming transfer', 'transfer received', 'reimbursement', 'compensation', 'gift', 'other income'],
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
