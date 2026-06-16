// CIPS 10C Supplier Evaluation + ESG + KPI data

export const suppliers = [
  {
    id: 's1',
    name: 'AgroTrade KZ',
    country: 'KZ', flag: '🇰🇿', city: 'Алматы',
    verified: true, trustScore: 91,
    since: '2021-03-10',
    totalDeals: 47, successDeals: 45,
    categories: ['Агро / Зерновые', 'Агро / Продукты'],
    cips10c: {
      competence: 90, capacity: 85, commitment: 92,
      control: 88, cash: 80, consistency: 94,
      cost: 78, compatibility: 86, compliance: 95, culture: 82,
    },
    esg: {
      environmental: 72, social: 80, governance: 88,
      co2certified: true, laborCompliant: true, diversityScore: 65,
    },
    kpi: {
      onTimeDelivery: 96, qualityScore: 94, responseTime: 4,
      disputeRate: 2, avgLeadDays: 8,
    },
    antiFraud: {
      registryVerified: true, addressVerified: true,
      bankVerified: true, taxVerified: true,
      redFlags: [], riskLevel: 'low',
    },
    rfiResponses: 12, activeContracts: 3,
  },
  {
    id: 's2',
    name: 'TechSupply RU',
    country: 'RU', flag: '🇷🇺', city: 'Москва',
    verified: true, trustScore: 78,
    since: '2022-07-15',
    totalDeals: 23, successDeals: 18,
    categories: ['IT / Электроника', 'Оборудование'],
    cips10c: {
      competence: 82, capacity: 70, commitment: 75,
      control: 68, cash: 60, consistency: 72,
      cost: 88, compatibility: 74, compliance: 70, culture: 65,
    },
    esg: {
      environmental: 45, social: 60, governance: 70,
      co2certified: false, laborCompliant: true, diversityScore: 40,
    },
    kpi: {
      onTimeDelivery: 78, qualityScore: 82, responseTime: 12,
      disputeRate: 8, avgLeadDays: 18,
    },
    antiFraud: {
      registryVerified: true, addressVerified: true,
      bankVerified: false, taxVerified: true,
      redFlags: ['Банковские данные не верифицированы', '5 из 23 сделок с задержкой'], riskLevel: 'medium',
    },
    rfiResponses: 5, activeContracts: 1,
  },
  {
    id: 's3',
    name: 'BuildMat UZ',
    country: 'UZ', flag: '🇺🇿', city: 'Ташкент',
    verified: true, trustScore: 96,
    since: '2020-01-20',
    categories: ['Стройматериалы', 'Металлы'],
    totalDeals: 89, successDeals: 87,
    cips10c: {
      competence: 95, capacity: 92, commitment: 97,
      control: 94, cash: 88, consistency: 96,
      cost: 85, compatibility: 90, compliance: 98, culture: 92,
    },
    esg: {
      environmental: 85, social: 90, governance: 92,
      co2certified: true, laborCompliant: true, diversityScore: 80,
    },
    kpi: {
      onTimeDelivery: 98, qualityScore: 97, responseTime: 2,
      disputeRate: 1, avgLeadDays: 3,
    },
    antiFraud: {
      registryVerified: true, addressVerified: true,
      bankVerified: true, taxVerified: true,
      redFlags: [], riskLevel: 'low',
    },
    rfiResponses: 28, activeContracts: 7,
  },
];

export const rfiList = [
  {
    id: 'rfi1',
    title: 'RFI: Поставщики органической пшеницы для долгосрочного контракта',
    status: 'active',
    createdAt: '2025-07-10',
    deadline: '2025-07-25',
    category: 'Агро / Зерновые',
    questions: [
      'Каков ваш годовой объём производства пшеницы?',
      'Наличие органических сертификатов (ISO, GOST)?',
      'Минимальный объём разовой поставки?',
      'Опыт экспортных поставок в СНГ?',
      'ESG политика компании?',
    ],
    responses: 4,
    buyers: 1,
  },
  {
    id: 'rfi2',
    title: 'RFI: Поставщики промышленного холодильного оборудования',
    status: 'closed',
    createdAt: '2025-06-15',
    deadline: '2025-06-30',
    category: 'Оборудование',
    questions: [
      'Производитель или дистрибьютор?',
      'Наличие CE сертификата?',
      'Гарантийное и постгарантийное обслуживание в CНГ?',
      'Референс-лист клиентов в СНГ?',
    ],
    responses: 7,
    buyers: 1,
  },
];

export const kpiHistory = [
  { month: 'Фев 2025', onTime: 95, quality: 92, disputes: 1 },
  { month: 'Мар 2025', onTime: 98, quality: 94, disputes: 0 },
  { month: 'Апр 2025', onTime: 94, quality: 91, disputes: 2 },
  { month: 'Май 2025', onTime: 97, quality: 96, disputes: 1 },
  { month: 'Июн 2025', onTime: 99, quality: 97, disputes: 0 },
  { month: 'Июл 2025', onTime: 96, quality: 95, disputes: 1 },
];

export const antiFraudChecks = [
  { id: 'c1', label: 'Регистрация в госреестре', auto: true },
  { id: 'c2', label: 'Юридический адрес верифицирован', auto: true },
  { id: 'c3', label: 'Банковские реквизиты проверены', auto: true },
  { id: 'c4', label: 'Налоговый статус активен', auto: true },
  { id: 'c5', label: 'Отсутствие в санкционных списках', auto: true },
  { id: 'c6', label: 'История судебных разбирательств', auto: true },
  { id: 'c7', label: 'Проверка бенефициарных владельцев', auto: false },
  { id: 'c8', label: 'ESG декларация подписана', auto: false },
  { id: 'c9', label: 'Anti-Bribery политика принята', auto: false },
  { id: 'c10', label: 'Аудит производства (при необходимости)', auto: false },
];

export const rfiAnswers = {
  rfi1: [
    {
      id: 'a1', anonymous: 'Поставщик #1', country: 'KZ', flag: '🇰🇿',
      answers: ['120,000 тонн в год (пшеница, ячмень)', 'Да: ISO 9001:2015, ГОСТ Р 52554-2006, органический сертификат EAS', '500 тонн минимум', 'Да, 47 экспортных поставок в UZ, RU, AZ за 3 года', 'Политика ESG принята в 2023, отчётность ежегодная'],
      submittedAt: '2025-07-12', trustScore: 91, verified: true,
      aiScore: 88, aiNote: 'Сильный кандидат. Объём, сертификаты и экспортный опыт соответствуют требованиям.',
    },
    {
      id: 'a2', anonymous: 'Поставщик #2', country: 'RU', flag: '🇷🇺',
      answers: ['85,000 тонн в год', 'ISO 9001, ГОСТ. Органического нет.', '1,000 тонн минимум', 'Да, поставки в KZ и BY', 'ESG декларация в разработке'],
      submittedAt: '2025-07-13', trustScore: 78, verified: true,
      aiScore: 64, aiNote: 'Минимальный объём выше запрошенного. Органического сертификата нет. Средний кандидат.',
    },
    {
      id: 'a3', anonymous: 'Поставщик #3', country: 'UZ', flag: '🇺🇿',
      answers: ['35,000 тонн в год', 'ГОСТ Р 52554-2006', '200 тонн минимум', 'Только внутренние поставки пока', 'ESG политики нет'],
      submittedAt: '2025-07-14', trustScore: 82, verified: true,
      aiScore: 52, aiNote: 'Небольшой объём. Нет экспортного опыта. Подходит для небольших локальных закупок.',
    },
    {
      id: 'a4', anonymous: 'Поставщик #4', country: 'UA', flag: '🇺🇦',
      answers: ['210,000 тонн в год', 'ISO 9001, ISO 22000, OEKO-TEX, органический EU', '300 тонн минимум', 'Да, 89 поставок в 12 стран СНГ и Европы', 'ESG отчёт публичный, CO2 сертифицирован'],
      submittedAt: '2025-07-15', trustScore: 94, verified: true,
      aiScore: 96, aiNote: 'Лучший кандидат. Максимальный объём, полный набор сертификатов, сильный ESG профиль.',
    },
  ],
  rfi2: [
    {
      id: 'b1', anonymous: 'Поставщик #1', country: 'DE', flag: '🇩🇪',
      answers: ['Производитель (Германия, завод 1987)', 'CE Mark + EAC + ISO 9001', 'Сервисные центры в UZ, KZ, RU, BY. SLA 48ч', '47 установок в СНГ за 5 лет'],
      submittedAt: '2025-06-18', trustScore: 95, verified: true,
      aiScore: 94, aiNote: 'Производитель с сильной сервисной сетью в СНГ. Топ-кандидат.',
    },
    {
      id: 'b2', anonymous: 'Поставщик #2', country: 'CN', flag: '🇨🇳',
      answers: ['Производитель (Китай)', 'CE Mark', 'Партнёрский сервис в KZ только', '12 установок в KZ'],
      submittedAt: '2025-06-20', trustScore: 71, verified: true,
      aiScore: 58, aiNote: 'Ограниченная сервисная сеть в СНГ. Приемлемо для KZ, рискованно для UZ и RU.',
    },
  ],
};

export const communityMessages = [
  {
    id: 'm1', type: 'user', anonymous: 'Компания A', country: 'UZ', flag: '🇺🇿',
    text: 'Коллеги, есть у кого опыт с поставщиками цемента из Турции? Интересует качество и логистика до Ташкента.',
    time: '14:23', likes: 4, replies: 2, category: 'Стройматериалы',
  },
  {
    id: 'm2', type: 'bot', botName: 'ИИ-ассистент GLORIX',
    text: 'По данным платформы: турецкий цемент OYAK и Çimsa хорошо зарекомендовали себя в СНГ. Логистика до Ташкента: ж/д через Туркменистан ~18 дней, автодоставка ~12 дней. Incoterms DAP Ташкент обычно выгоднее CIF при объёмах >500 тонн.',
    time: '14:24', likes: 7, category: 'Стройматериалы',
  },
  {
    id: 'm3', type: 'user', anonymous: 'Компания B', country: 'KZ', flag: '🇰🇿',
    text: 'Работали с турецким цементом 2 года. Качество отличное, но таможня на границе с TM иногда задерживает на 3-5 дней. Рекомендую закладывать буфер в дедлайны.',
    time: '14:31', likes: 5, replies: 0, category: 'Стройматериалы',
  },
  {
    id: 'm4', type: 'user', anonymous: 'Компания C', country: 'AZ', flag: '🇦🇿',
    text: 'Вопрос: кто-то сталкивался с отказом продавца после победы в тендере? Как платформа защищает покупателя?',
    time: '15:10', likes: 3, replies: 1, category: 'Общие вопросы',
  },
  {
    id: 'm5', type: 'bot', botName: 'ИИ-ассистент GLORIX',
    text: 'Защита покупателя при отказе продавца: 1) Депозит продавца (5-15% от суммы) автоматически переходит покупателю как компенсация. 2) Рейтинг доверия продавца снижается. 3) При падении ниже 30% — аккаунт ограничивается. Все условия прописаны в оферте платформы при регистрации.',
    time: '15:11', likes: 9, category: 'Общие вопросы',
  },
  {
    id: 'm6', type: 'user', anonymous: 'Компания D', country: 'RU', flag: '🇷🇺',
    text: 'Подтверждаю — у меня был такой случай. Депозит вернули в течение 24 часов, рейтинг продавца упал с 78% до 61%. Система работает.',
    time: '15:45', likes: 6, replies: 0, category: 'Общие вопросы',
  },
];
