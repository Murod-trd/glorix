// Прежде здесь было: const accountType = localStorage.getItem(...) на module
// scope, из-за чего currentUser вычислялся один раз при первой загрузке и не
// обновлялся при смене аккаунта без window.location.reload(). Теперь компоненты
// получают текущий тип аккаунта реактивно через useAccountType() (см.
// src/context/AccountContext.jsx) и сами выбирают нужного пользователя через
// getCurrentUser(accountType) — закрывает аудит-пункт 🟠#6.

// Закрывает аудит-пункт 🟡#17 — раньше все три демо-аккаунта были
// узбекскими компаниями, хотя платформа заявлена как продукт для всего
// региона СНГ (см. MASTER_PROJECT_CONTEXT.md). Теперь три аккаунта
// представляют три разные страны региона — это и более честная
// демонстрация позиционирования платформы, и более убедительный пример
// для потенциальных партнёров/инвесторов не из Узбекистана.
const users = {
  buyer: {
    id: 'u1', name: 'Tashkent Agro LLC', country: 'UZ', flag: '🇺🇿', logoDataUrl: null,
    role: 'buyer', roleLabel: 'Покупатель',
    trustScore: 87, totalDeals: 23, successDeals: 20, verified: true,
    joined: '2024-03-15',
  },
  seller: {
    id: 'u2', name: 'KazSteel Trading', country: 'KZ', flag: '🇰🇿', logoDataUrl: null,
    role: 'seller', roleLabel: 'Продавец',
    trustScore: 91, totalDeals: 45, successDeals: 43, verified: true,
    joined: '2023-08-01',
  },
  both: {
    id: 'u3', name: 'Sibmetall Group', country: 'RU', flag: '🇷🇺', logoDataUrl: null,
    role: 'both', roleLabel: 'Покупатель + Продавец',
    trustScore: 96, totalDeals: 89, successDeals: 87, verified: true,
    joined: '2022-11-10',
  },
};

export function getCurrentUser(accountType) {
  return users[accountType] || users.buyer;
}

export { users };

export const tenders = [
  {
    id: 't1', title: 'Поставка пшеницы 3-го класса',
    category: 'Агро / Зерновые', status: 'active',
    deadline: '2025-08-15',
    budget: { min: 85000, max: 120000, currency: 'USD' },
    quantity: '500 тонн',
    specs: [
      { param: 'Класс', value: '3-й класс ГОСТ' },
      { param: 'Влажность', value: 'не более 14%' },
      { param: 'Протеин', value: 'не менее 12%' },
      { param: 'Клейковина', value: 'не менее 23%' },
      { param: 'Упаковка', value: 'биг-бэги по 1 тонне' },
    ],
    incoterms: 'CIF', destination: 'Ташкент, UZ', offers: 7,
    deadlines: {
      d1: { label: 'Тех. требования покупателя', date: '2025-07-20', done: true },
      d2: { label: 'Оферты продавцов', date: '2025-07-28', done: true },
      d3: { label: 'Согласование спецификаций', date: '2025-08-03', done: false },
      d4: { label: 'Финальные цены + доставка', date: '2025-08-10', done: false },
      d5: { label: 'Результат тендера', date: '2025-08-15', done: false },
    },
    deposit: { rate: 10, amount: 10000 }, buyerCountry: 'UZ', buyerId: 'u1', createdAt: '2025-07-18',
  },
  {
    id: 't2', title: 'Закупка промышленных холодильных установок',
    category: 'Оборудование / Холодильное', status: 'agreement',
    deadline: '2025-08-30',
    budget: { min: 240000, max: 320000, currency: 'USD' },
    quantity: '12 единиц',
    specs: [
      { param: 'Тип', value: 'Промышленный чиллер' },
      { param: 'Мощность', value: 'от 200 кВт' },
      { param: 'Хладагент', value: 'R134a или аналог' },
      { param: 'Напряжение', value: '380V / 50Hz' },
      { param: 'Сертификат', value: 'CE обязателен' },
    ],
    incoterms: 'DAP', destination: 'Алматы, KZ', offers: 4,
    deadlines: {
      d1: { label: 'Тех. требования покупателя', date: '2025-07-25', done: true },
      d2: { label: 'Оферты продавцов', date: '2025-08-05', done: true },
      d3: { label: 'Согласование спецификаций', date: '2025-08-12', done: true },
      d4: { label: 'Финальные цены + доставка', date: '2025-08-22', done: false },
      d5: { label: 'Результат тендера', date: '2025-08-30', done: false },
    },
    // buyerId сознательно не указан — единственный KZ демо-аккаунт это
    // продавец (KazSteel Trading, u2), который не может владеть тендером
    // по бизнес-правилам (см. DECISIONS.md, Decision 13). Тендер остаётся
    // полностью анонимным для всех ролей.
    deposit: { rate: 7.5, amount: 21000 }, buyerCountry: 'KZ', createdAt: '2025-07-22',
  },
  {
    id: 't3', title: 'Поставка ноутбуков для корпоративного парка',
    category: 'IT / Электроника', status: 'completed',
    deadline: '2025-07-01',
    budget: { min: 180000, max: 210000, currency: 'USD' },
    quantity: '300 штук',
    specs: [
      { param: 'Процессор', value: 'Intel Core i7 или выше' },
      { param: 'RAM', value: 'минимум 16 GB DDR5' },
      { param: 'Накопитель', value: 'SSD 512 GB минимум' },
      { param: 'Экран', value: '15.6" FHD IPS' },
      { param: 'ОС', value: 'Windows 11 Pro' },
    ],
    incoterms: 'DDP', destination: 'Москва, RU', offers: 11,
    deadlines: {
      d1: { label: 'Тех. требования покупателя', date: '2025-06-05', done: true },
      d2: { label: 'Оферты продавцов', date: '2025-06-12', done: true },
      d3: { label: 'Согласование спецификаций', date: '2025-06-18', done: true },
      d4: { label: 'Финальные цены + доставка', date: '2025-06-25', done: true },
      d5: { label: 'Результат тендера', date: '2025-07-01', done: true },
    },
    deposit: { rate: 8.5, amount: 17850 },
    winner: { country: 'CN', flag: '🇨🇳', totalCost: 196400, deliveryCost: 4200 },
    buyerCountry: 'RU', buyerId: 'u3', createdAt: '2025-06-01',
  },
];

export const stats = {
  activeTenders: 1240, countries: 18, totalVolume: '4.2B', avgTrustScore: 81,
};

export const aiAnalysis = {
  tenderId: 't1',
  offers: [
    { id: 'o1', country: 'KZ', flag: '🇰🇿', productPrice: 98000, deliveryCost: 3200, totalCost: 101200, deliveryDays: 12, trustScore: 91, incoterms: 'CIF', aiNote: 'Оптимальное соотношение цены и надёжности', recommended: true },
    { id: 'o2', country: 'RU', flag: '🇷🇺', productPrice: 94500, deliveryCost: 7100, totalCost: 101600, deliveryDays: 18, trustScore: 78, incoterms: 'FOB', aiNote: 'Низкая цена товара, но высокая доставка', recommended: false },
    { id: 'o3', country: 'UA', flag: '🇺🇦', productPrice: 103000, deliveryCost: 1800, totalCost: 104800, deliveryDays: 8, trustScore: 95, incoterms: 'DAP', aiNote: 'Самая быстрая доставка, высокий рейтинг', recommended: false },
  ],
};

export const depositRates = [
  { range: 'До $10 000', min: 0, max: 10000, rateMin: 15, rateMax: 15, color: '#FF4D4D' },
  { range: '$10 000 – $50 000', min: 10000, max: 50000, rateMin: 10, rateMax: 15, color: '#F5A623' },
  { range: '$50 000 – $1 000 000', min: 50000, max: 1000000, rateMin: 5, rateMax: 10, color: '#00D4AA' },
  { range: 'Выше $1 000 000', min: 1000000, max: Infinity, rateMin: 0.5, rateMax: 5, color: '#63B3ED' },
];

export function calcDeposit(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return { rate: 0, deposit: 0 };
  if (n <= 10000) return { rate: 15, deposit: n * 0.15 };
  if (n <= 50000) {
    const rate = 15 - (15 - 10) * ((n - 10000) / (50000 - 10000));
    return { rate: +rate.toFixed(2), deposit: +(n * rate / 100).toFixed(0) };
  }
  if (n <= 1000000) {
    const rate = 10 - (10 - 5) * ((n - 50000) / (1000000 - 50000));
    return { rate: +rate.toFixed(2), deposit: +(n * rate / 100).toFixed(0) };
  }
  const rate = Math.max(0.5, 5 - (5 - 0.5) * Math.min(1, (n - 1000000) / 9000000));
  return { rate: +rate.toFixed(2), deposit: +(n * rate / 100).toFixed(0) };
}
