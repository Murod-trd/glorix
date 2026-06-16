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
