export const categories = [
  { id: 'all', label: 'Все категории', icon: '◈' },
  { id: 'agro', label: 'Агро / Продукты', icon: '🌾' },
  { id: 'construction', label: 'Стройматериалы', icon: '🏗️' },
  { id: 'electronics', label: 'Электроника', icon: '💻' },
  { id: 'chemicals', label: 'Химикаты', icon: '🧪' },
  { id: 'textile', label: 'Текстиль', icon: '🧵' },
  { id: 'metals', label: 'Металлы', icon: '⚙️' },
  { id: 'packaging', label: 'Упаковка', icon: '📦' },
  { id: 'equipment', label: 'Оборудование', icon: '🔧' },
];

export const products = [
  {
    id: 'p1',
    title: 'Цемент М400 (мешки 50 кг)',
    category: 'construction',
    seller: { id: 's1', name: 'UzBuild LLC', country: 'UZ', flag: '🇺🇿', city: 'Ташкент', trustScore: 94, verified: true, totalDeals: 89 },
    price: 6.5, currency: 'USD', unit: 'мешок', minOrder: 100, maxOrder: 50000,
    stock: 12000, stockAuto: false,
    photoId: 'cement',
    specs: [
      { group: 'Основные', items: [
        { p: 'Марка', v: 'М400 (CEM I 32.5)' },
        { p: 'Вес мешка', v: '50 кг ± 0.5 кг' },
        { p: 'Стандарт', v: 'ГОСТ 31108-2016' },
        { p: 'Производитель', v: 'Кувасайцемент, UZ' },
      ]},
      { group: 'Технические', items: [
        { p: 'Прочность на сжатие 28 дней', v: '≥ 40 МПа' },
        { p: 'Начало схватывания', v: '≥ 60 мин' },
        { p: 'Конец схватывания', v: '≤ 420 мин' },
        { p: 'Тонкость помола', v: '≤ 12% остаток на сите 0.08 мм' },
        { p: 'Содержание SO₃', v: '≤ 3.5%' },
      ]},
      { group: 'Упаковка и хранение', items: [
        { p: 'Тип упаковки', v: 'Бумажный мешок 4-слойный' },
        { p: 'Паллет', v: '40 мешков = 2 тонны' },
        { p: 'Срок хранения', v: '6 месяцев от даты производства' },
        { p: 'Условия хранения', v: 'Сухое место, влажность ≤ 70%' },
      ]},
    ],
    certifications: ['ГОСТ 31108-2016', 'ISO 9001:2015', 'CE Mark'],
    deliveryDays: { min: 1, max: 3 },
    incoterms: ['EXW', 'DAP', 'DDP'],
    sanctions: false,
    rating: 4.8, reviews: 34,
    reviewsList: [
      { company: 'Строй Альянс KZ', rating: 5, text: 'Отличное качество, поставка точно в срок. Работаем уже 2 года.', date: '2025-07-01' },
      { company: 'ГСК Ташкент', rating: 5, text: 'Сертификаты в порядке, цемент соответствует ГОСТ.', date: '2025-06-15' },
      { company: 'МегаСтрой RU', rating: 4, text: 'Хорошее соотношение цена/качество. Рекомендуем.', date: '2025-05-20' },
    ],
    aiCheck: { sanctionsOk: true, specsVerified: true, qualityRisk: 'low' },
    tags: ['Быстрая доставка', 'Сертифицировано', 'Оптом'],
  },
  {
    id: 'p2',
    title: 'Хлопковая пряжа Ne 30/1 — 100% хлопок',
    category: 'textile',
    seller: { id: 's2', name: 'FerganaTex', country: 'UZ', flag: '🇺🇿', city: 'Фергана', trustScore: 88, verified: true, totalDeals: 45 },
    price: 2.8, currency: 'USD', unit: 'кг', minOrder: 500, maxOrder: 100000,
    stock: 45000, stockAuto: false,
    photoId: 'cottonYarn',
    specs: [
      { group: 'Основные', items: [
        { p: 'Номер пряжи', v: 'Ne 30/1' },
        { p: 'Состав', v: '100% хлопок (Узбекистан)' },
        { p: 'Кручение', v: 'S / Z по запросу' },
        { p: 'Вес кипы', v: '~200 кг' },
      ]},
      { group: 'Технические', items: [
        { p: 'Прочность на разрыв', v: '≥ 14 сН/текс' },
        { p: 'Коэффициент вариации по прочности', v: '≤ 9%' },
        { p: 'Удлинение при разрыве', v: '5–7%' },
        { p: 'Влажность', v: '≤ 8.5%' },
        { p: 'Примеси', v: '≤ 0.1%' },
      ]},
      { group: 'Упаковка', items: [
        { p: 'Упаковка', v: 'Прессованные кипы в ПЭ плёнке' },
        { p: 'Маркировка', v: 'Бирка с партией, датой, кодом' },
      ]},
    ],
    certifications: ['OEKO-TEX Standard 100', 'ISO 9001', 'GOTS'],
    deliveryDays: { min: 3, max: 7 },
    incoterms: ['FOB', 'CIF', 'DAP'],
    sanctions: false,
    rating: 4.6, reviews: 18,
    reviewsList: [
      { company: 'TextilePro TR', rating: 5, text: 'Качество стабильное, OEKO-TEX подтверждён. Берём регулярно.', date: '2025-07-05' },
      { company: 'FabricHub DE', rating: 4, text: 'Хорошая пряжа, небольшие отклонения по цвету партий.', date: '2025-06-01' },
    ],
    aiCheck: { sanctionsOk: true, specsVerified: true, qualityRisk: 'low' },
    tags: ['Органик', 'Экспорт', 'OEKO-TEX'],
  },
  {
    id: 'p3',
    title: 'Подсолнечное масло рафинированное (IBC 1000л)',
    category: 'agro',
    seller: { id: 's3', name: 'KazOil Export', country: 'KZ', flag: '🇰🇿', city: 'Алматы', trustScore: 91, verified: true, totalDeals: 112 },
    price: 1.05, currency: 'USD', unit: 'литр', minOrder: 1000, maxOrder: 500000,
    stock: 800000, stockAuto: true,
    photoId: 'sunflowerOil',
    specs: [
      { group: 'Основные', items: [
        { p: 'Тип', v: 'Рафинированное дезодорированное' },
        { p: 'Сырьё', v: 'Подсолнечник (Казахстан)' },
        { p: 'Упаковка', v: 'IBC 1000 л / Флекситанк 24 000 л' },
        { p: 'Стандарт', v: 'ГОСТ 1129-2013' },
      ]},
      { group: 'Физико-химические', items: [
        { p: 'Кислотное число', v: '≤ 0.3 мг KOH/г' },
        { p: 'Перекисное число', v: '≤ 5 ммоль/кг' },
        { p: 'Цветное число', v: '≤ 6 мг йода' },
        { p: 'Влага и летучие', v: '≤ 0.1%' },
        { p: 'Температура вспышки', v: '≥ 234°C' },
      ]},
      { group: 'Условия', items: [
        { p: 'Срок хранения', v: '18 месяцев' },
        { p: 'Температура хранения', v: '+5°C до +25°C' },
        { p: 'Влажность', v: '≤ 75%' },
      ]},
    ],
    certifications: ['ГОСТ 1129-2013', 'Халяль', 'ISO 22000', 'Kosher по запросу'],
    deliveryDays: { min: 5, max: 10 },
    incoterms: ['CIF', 'FOB', 'DAP', 'CFR'],
    sanctions: false,
    rating: 4.9, reviews: 52,
    reviewsList: [
      { company: 'FoodTrade AZ', rating: 5, text: 'Всегда в срок, сертификаты Халяль актуальны. Партнёры на 3 года.', date: '2025-07-10' },
      { company: 'Масло-Экспорт RU', rating: 5, text: 'Лучшая цена среди проверенных поставщиков СНГ.', date: '2025-06-20' },
    ],
    aiCheck: { sanctionsOk: true, specsVerified: true, qualityRisk: 'low' },
    tags: ['Халяль', 'ISO 22000', 'Флекситанк'],
  },
  {
    id: 'p4',
    title: 'Арматура А500С ф12 мм — прутки 12 м',
    category: 'metals',
    seller: { id: 'u3', name: 'Sibmetall Group', country: 'RU', flag: '🇷🇺', city: 'Новосибирск', trustScore: 91, verified: true, totalDeals: 203 },
    price: 680, currency: 'USD', unit: 'тонна', minOrder: 5, maxOrder: 5000,
    stock: 850, stockAuto: false,
    photoId: 'rebar',
    specs: [
      { group: 'Основные', items: [
        { p: 'Марка стали', v: 'А500С (B500B EN)' },
        { p: 'Диаметр', v: '12 мм' },
        { p: 'Длина прутка', v: '12 м ± 25 мм' },
        { p: 'Производитель', v: 'Узметкомбинат, Бекабад UZ' },
      ]},
      { group: 'Механические свойства', items: [
        { p: 'Предел текучести', v: '≥ 500 МПа' },
        { p: 'Предел прочности', v: '≥ 550 МПа' },
        { p: 'Относительное удлинение', v: '≥ 14%' },
        { p: 'Изгиб (d=4a)', v: 'Без трещин' },
        { p: 'Вес метра', v: '0.888 кг/м' },
      ]},
      { group: 'Стандарты', items: [
        { p: 'ГОСТ', v: '52544-2006' },
        { p: 'EN стандарт', v: 'EN 10080 / B500B' },
        { p: 'Сертификат качества', v: 'Предоставляется на каждую партию' },
      ]},
    ],
    certifications: ['ГОСТ 52544-2006', 'EN 10080', 'ISO 9001'],
    deliveryDays: { min: 1, max: 4 },
    incoterms: ['EXW', 'DAP', 'CFR'],
    sanctions: false,
    rating: 4.7, reviews: 67,
    reviewsList: [
      { company: 'СтройГрупп KZ', rating: 5, text: 'Металл высшего качества. Сертификаты приходят вместе с партией.', date: '2025-07-08' },
      { company: 'Монолит TJ', rating: 5, text: 'Работаем 4 года. Ни разу не подвели по качеству.', date: '2025-06-25' },
    ],
    aiCheck: { sanctionsOk: true, specsVerified: true, qualityRisk: 'low' },
    tags: ['Завод-производитель', 'Сертификат на партию', 'EN стандарт'],
  },
  {
    id: 'p5',
    title: 'Полиэтиленовая плёнка упаковочная LDPE 100 мкм',
    category: 'packaging',
    seller: { id: 's5', name: 'KazPack', country: 'KZ', flag: '🇰🇿', city: 'Шымкент', trustScore: 83, verified: true, totalDeals: 38 },
    price: 1.9, currency: 'USD', unit: 'кг', minOrder: 200, maxOrder: 50000,
    stock: 15000, stockAuto: true,
    photoId: 'ldpeFilm',
    specs: [
      { group: 'Основные', items: [
        { p: 'Материал', v: 'LDPE (полиэтилен низкого давления)' },
        { p: 'Толщина', v: '100 мкм ± 5 мкм' },
        { p: 'Ширина рукава', v: '1500 мм / по заказу' },
        { p: 'Цвет', v: 'Прозрачный / белый молочный' },
      ]},
      { group: 'Физические свойства', items: [
        { p: 'Прочность на разрыв', v: '≥ 18 МПа (продольное)' },
        { p: 'Относительное удлинение', v: '≥ 300%' },
        { p: 'Морозостойкость', v: 'до -40°C' },
        { p: 'Паропроницаемость', v: '≤ 2 г/м²·сутки' },
      ]},
      { group: 'Упаковка', items: [
        { p: 'Намотка', v: 'Рулон на картонной втулке' },
        { p: 'Вес рулона', v: '~25 кг' },
      ]},
    ],
    certifications: ['ГОСТ 10354-82', 'Пищевой контакт RU/KZ'],
    deliveryDays: { min: 2, max: 5 },
    incoterms: ['EXW', 'DAP'],
    sanctions: false,
    rating: 4.5, reviews: 15,
    reviewsList: [
      { company: 'УпакПро UZ', rating: 4, text: 'Качество стабильное, доставка в срок.', date: '2025-06-10' },
    ],
    aiCheck: { sanctionsOk: true, specsVerified: true, qualityRisk: 'low' },
    tags: ['Пищевой контакт', 'По размеру заказа'],
  },
  {
    id: 'p6',
    title: 'Промышленный насос центробежный — серия CNP',
    category: 'equipment',
    seller: { id: 's6', name: 'TechEquip AZ', country: 'AZ', flag: '🇦🇿', city: 'Баку', trustScore: 87, verified: true, totalDeals: 29 },
    price: 1850, currency: 'USD', unit: 'штука', minOrder: 1, maxOrder: 100,
    stock: 24, stockAuto: false,
    photoId: 'pump',
    specs: [
      { group: 'Основные', items: [
        { p: 'Тип', v: 'Центробежный одноступенчатый' },
        { p: 'Серия', v: 'CNP-65-200' },
        { p: 'Подача', v: '50 м³/ч' },
        { p: 'Напор', v: '50 м вод. ст.' },
      ]},
      { group: 'Электрические', items: [
        { p: 'Мощность двигателя', v: '11 кВт' },
        { p: 'Напряжение', v: '380 В / 50 Гц / 3-фаза' },
        { p: 'КПД насоса', v: '≥ 72%' },
        { p: 'Класс защиты', v: 'IP54' },
      ]},
      { group: 'Материалы', items: [
        { p: 'Корпус', v: 'Чугун GG-25' },
        { p: 'Рабочее колесо', v: 'Нержавеющая сталь 304' },
        { p: 'Уплотнение', v: 'Механическое торцевое' },
        { p: 'Рабочая среда', v: 'Чистая вода, химически нейтральные жидкости' },
      ]},
    ],
    certifications: ['CE Mark', 'ISO 9001', 'EAC'],
    deliveryDays: { min: 7, max: 14 },
    incoterms: ['DAP', 'DDP', 'EXW'],
    sanctions: false,
    rating: 4.6, reviews: 11,
    reviewsList: [
      { company: 'ПромВода RU', rating: 5, text: 'Насос работает отлично, документация полная включая EAC.', date: '2025-05-15' },
    ],
    aiCheck: { sanctionsOk: true, specsVerified: true, qualityRisk: 'low' },
    tags: ['CE', 'EAC', 'Пром. применение'],
  },
  {
    id: 'p7',
    title: 'Пшеница мягкая 3-го класса (насыпью)',
    category: 'agro',
    seller: {
      id: 's7',
      name: 'AgroTrade KZ',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Костанай',
      trustScore: 94,
      verified: true,
      totalDeals: 156
    },
    price: 218,
    currency: 'USD',
    unit: 'тонна',
    minOrder: 50,
    maxOrder: 5000,
    stock: 8500,
    stockAuto: false,
    photoId: 'wheat',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Класс',
            v: '3-й класс'
          },
          {
            p: 'Влажность',
            v: '≤ 14%'
          },
          {
            p: 'Клейковина',
            v: '≥ 23%'
          },
          {
            p: 'Натура',
            v: '≥ 750 г/л'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ Р 52554-2006',
      'ISO 9001'
    ],
    deliveryDays: {
      min: 5,
      max: 12
    },
    incoterms: [
      'FOB',
      'CPT',
      'DAP'
    ],
    sanctions: false,
    rating: 4.7,
    reviews: 28,
    reviewsList: [
      {
        company: 'ЕвроМилл RU',
        rating: 5,
        text: 'Стабильное качество поставок уже третий сезон.',
        date: '2025-06-10'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Экспорт',
      'Сертифицировано',
      'Оптом'
    ]
  },
  {
    id: 'p8',
    title: 'Рис длиннозёрный шлифованный, мешки 25 кг',
    category: 'agro',
    seller: {
      id: 's8',
      name: 'UzRice Export',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Хорезм',
      trustScore: 89,
      verified: true,
      totalDeals: 67
    },
    price: 780,
    currency: 'USD',
    unit: 'тонна',
    minOrder: 20,
    maxOrder: 2000,
    stock: 3200,
    stockAuto: false,
    photoId: 'rice',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Сорт',
            v: 'Длиннозёрный'
          },
          {
            p: 'Влажность',
            v: '≤ 14%'
          },
          {
            p: 'Дробление',
            v: '≤ 5%'
          },
          {
            p: 'Упаковка',
            v: 'Мешок 25 кг'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 6292-93',
      'HACCP'
    ],
    deliveryDays: {
      min: 7,
      max: 15
    },
    incoterms: [
      'FOB',
      'CIF'
    ],
    sanctions: false,
    rating: 4.5,
    reviews: 19,
    reviewsList: [
      {
        company: 'АзияФуд KZ',
        rating: 4,
        text: 'Качество хорошее, упаковка плотная.',
        date: '2025-04-22'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Продовольствие',
      'HACCP'
    ]
  },
  {
    id: 'p9',
    title: 'Специи и пряности — набор для пищевой промышленности',
    category: 'agro',
    seller: {
      id: 's9',
      name: 'SpiceWay LLC',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Самарканд',
      trustScore: 85,
      verified: true,
      totalDeals: 41
    },
    price: 12.5,
    currency: 'USD',
    unit: 'кг',
    minOrder: 50,
    maxOrder: 5000,
    stock: 1800,
    stockAuto: false,
    photoId: 'spices',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Состав',
            v: 'Зира, кориандр, паприка'
          },
          {
            p: 'Влажность',
            v: '≤ 10%'
          },
          {
            p: 'Упаковка',
            v: 'Вакуумная, 1 кг'
          }
        ]
      }
    ],
    certifications: [
      'ISO 22000'
    ],
    deliveryDays: {
      min: 5,
      max: 10
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.6,
    reviews: 15,
    reviewsList: [
      {
        company: 'ВостокПродукт RU',
        rating: 5,
        text: 'Аромат и качество на высоком уровне.',
        date: '2025-03-18'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Продовольствие',
      'Сертифицировано'
    ]
  },
  {
    id: 'p10',
    title: 'Кирпич керамический рядовой М150',
    category: 'construction',
    seller: {
      id: 's10',
      name: 'UzBuild LLC',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Ташкент',
      trustScore: 94,
      verified: true,
      totalDeals: 89
    },
    price: 0.28,
    currency: 'USD',
    unit: 'шт',
    minOrder: 5000,
    maxOrder: 500000,
    stock: 320000,
    stockAuto: false,
    photoId: 'brick',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Марка',
            v: 'М150'
          },
          {
            p: 'Размер',
            v: '250×120×65 мм'
          },
          {
            p: 'Морозостойкость',
            v: 'F50'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 530-2012'
    ],
    deliveryDays: {
      min: 3,
      max: 7
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.7,
    reviews: 22,
    reviewsList: [
      {
        company: 'СтройМир KZ',
        rating: 5,
        text: 'Кирпич ровный, без брака.',
        date: '2025-05-30'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Стройматериалы',
      'ГОСТ'
    ]
  },
  {
    id: 'p11',
    title: 'Металлочерепица Монтеррей, 0.45 мм, RAL по каталогу',
    category: 'construction',
    seller: {
      id: 's11',
      name: 'RoofTech KZ',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Шымкент',
      trustScore: 90,
      verified: true,
      totalDeals: 73
    },
    price: 9.8,
    currency: 'USD',
    unit: 'м²',
    minOrder: 100,
    maxOrder: 20000,
    stock: 14500,
    stockAuto: false,
    photoId: 'metalRoof',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Толщина металла',
            v: '0.45 мм'
          },
          {
            p: 'Покрытие',
            v: 'Полиэстер'
          },
          {
            p: 'Гарантия',
            v: '15 лет'
          }
        ]
      }
    ],
    certifications: [
      'EN 10169',
      'ISO 9001'
    ],
    deliveryDays: {
      min: 5,
      max: 10
    },
    incoterms: [
      'DAP',
      'DDP'
    ],
    sanctions: false,
    rating: 4.8,
    reviews: 31,
    reviewsList: [
      {
        company: 'КровляПро RU',
        rating: 5,
        text: 'Точная геометрия листов, цвет соответствует каталогу.',
        date: '2025-06-02'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Сертифицировано',
      'Гарантия 15 лет'
    ]
  },
  {
    id: 'p12',
    title: 'Керамическая плитка напольная 60×60 см',
    category: 'construction',
    seller: {
      id: 's12',
      name: 'TileMaster UZ',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Навои',
      trustScore: 87,
      verified: true,
      totalDeals: 38
    },
    price: 7.2,
    currency: 'USD',
    unit: 'м²',
    minOrder: 200,
    maxOrder: 30000,
    stock: 9800,
    stockAuto: false,
    photoId: 'ceramicTile',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Размер',
            v: '600×600 мм'
          },
          {
            p: 'Класс износостойкости',
            v: 'PEI IV'
          },
          {
            p: 'Водопоглощение',
            v: '≤ 0.5%'
          }
        ]
      }
    ],
    certifications: [
      'ISO 13006',
      'CE Mark'
    ],
    deliveryDays: {
      min: 7,
      max: 14
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.5,
    reviews: 17,
    reviewsList: [
      {
        company: 'ИнтерьерСтиль KZ',
        rating: 4,
        text: 'Хорошее качество, упаковка надёжная.',
        date: '2025-04-11'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'CE',
      'Износостойкая'
    ]
  },
  {
    id: 'p13',
    title: 'Ноутбуки офисные 15.6" — партия от 50 шт',
    category: 'electronics',
    seller: {
      id: 's13',
      name: 'TechEquip AZ',
      country: 'AZ',
      flag: '🇦🇿',
      city: 'Баку',
      trustScore: 87,
      verified: true,
      totalDeals: 29
    },
    price: 420,
    currency: 'USD',
    unit: 'шт',
    minOrder: 50,
    maxOrder: 2000,
    stock: 1200,
    stockAuto: false,
    photoId: 'laptop',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Экран',
            v: '15.6" FHD'
          },
          {
            p: 'ОЗУ',
            v: '8 ГБ'
          },
          {
            p: 'Накопитель',
            v: '256 ГБ SSD'
          }
        ]
      }
    ],
    certifications: [
      'CE',
      'RoHS'
    ],
    deliveryDays: {
      min: 10,
      max: 20
    },
    incoterms: [
      'DAP',
      'DDP'
    ],
    sanctions: false,
    rating: 4.4,
    reviews: 12,
    reviewsList: [
      {
        company: 'ОфисТех RU',
        rating: 4,
        text: 'Партия пришла в срок, брака не обнаружено.',
        date: '2025-05-08'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Оптом',
      'CE/RoHS'
    ]
  },
  {
    id: 'p14',
    title: 'Смартфоны Android, базовая комплектация — опт',
    category: 'electronics',
    seller: {
      id: 's14',
      name: 'MobileTrade KZ',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Алматы',
      trustScore: 83,
      verified: true,
      totalDeals: 21
    },
    price: 95,
    currency: 'USD',
    unit: 'шт',
    minOrder: 100,
    maxOrder: 10000,
    stock: 4500,
    stockAuto: false,
    photoId: 'smartphone',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Экран',
            v: '6.5" IPS'
          },
          {
            p: 'ОЗУ/Память',
            v: '4/64 ГБ'
          },
          {
            p: 'Батарея',
            v: '5000 мАч'
          }
        ]
      }
    ],
    certifications: [
      'CE',
      'RoHS',
      'EAC'
    ],
    deliveryDays: {
      min: 12,
      max: 25
    },
    incoterms: [
      'DAP',
      'CIF'
    ],
    sanctions: false,
    rating: 4.2,
    reviews: 9,
    reviewsList: [
      {
        company: 'СвязьМаркет UZ',
        rating: 4,
        text: 'Соответствует заявленным характеристикам.',
        date: '2025-03-29'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'EAC',
      'Опт'
    ]
  },
  {
    id: 'p15',
    title: 'Кабельная продукция ВВГ-нг(А)-LS — бухты',
    category: 'electronics',
    seller: {
      id: 's15',
      name: 'ElectroSnab RU',
      country: 'RU',
      flag: '🇷🇺',
      city: 'Екатеринбург',
      trustScore: 91,
      verified: true,
      totalDeals: 64
    },
    price: 1.85,
    currency: 'USD',
    unit: 'м',
    minOrder: 500,
    maxOrder: 100000,
    stock: 65000,
    stockAuto: false,
    photoId: 'cable',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Сечение',
            v: '3×2.5 мм²'
          },
          {
            p: 'Изоляция',
            v: 'Не поддерживает горение'
          },
          {
            p: 'Стандарт',
            v: 'ГОСТ 31996-2012'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 31996-2012',
      'EAC'
    ],
    deliveryDays: {
      min: 5,
      max: 10
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.7,
    reviews: 26,
    reviewsList: [
      {
        company: 'ЭлектроСтрой KZ',
        rating: 5,
        text: 'Качество кабеля проверено, маркировка чёткая.',
        date: '2025-05-20'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'EAC',
      'Негорючий'
    ]
  },
  {
    id: 'p16',
    title: 'Блоки питания промышленные 24В, импульсные',
    category: 'electronics',
    seller: {
      id: 's16',
      name: 'PowerTech UZ',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Ташкент',
      trustScore: 86,
      verified: true,
      totalDeals: 33
    },
    price: 18,
    currency: 'USD',
    unit: 'шт',
    minOrder: 50,
    maxOrder: 5000,
    stock: 2100,
    stockAuto: false,
    photoId: 'powerSupply',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Выходное напряжение',
            v: '24В DC'
          },
          {
            p: 'Мощность',
            v: '150 Вт'
          },
          {
            p: 'КПД',
            v: '≥ 88%'
          }
        ]
      }
    ],
    certifications: [
      'CE',
      'RoHS'
    ],
    deliveryDays: {
      min: 7,
      max: 14
    },
    incoterms: [
      'DAP',
      'EXW'
    ],
    sanctions: false,
    rating: 4.5,
    reviews: 14,
    reviewsList: [
      {
        company: 'АвтоматикаПро RU',
        rating: 4,
        text: 'Стабильная работа, нет нареканий за полгода эксплуатации.',
        date: '2025-04-02'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'CE',
      'Промышленное применение'
    ]
  },
  {
    id: 'p17',
    title: 'Полипропилен гранулированный PP-H, марка 21030',
    category: 'chemicals',
    seller: {
      id: 's17',
      name: 'ChemProm KZ',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Атырау',
      trustScore: 92,
      verified: true,
      totalDeals: 58
    },
    price: 1150,
    currency: 'USD',
    unit: 'тонна',
    minOrder: 5,
    maxOrder: 500,
    stock: 1800,
    stockAuto: false,
    photoId: 'polypropylene',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Марка',
            v: 'PP-H 21030'
          },
          {
            p: 'ПТР',
            v: '3 г/10мин'
          },
          {
            p: 'Плотность',
            v: '0.905 г/см³'
          }
        ]
      }
    ],
    certifications: [
      'ISO 9001',
      'REACH'
    ],
    deliveryDays: {
      min: 10,
      max: 20
    },
    incoterms: [
      'FOB',
      'CIF'
    ],
    sanctions: false,
    rating: 4.6,
    reviews: 21,
    reviewsList: [
      {
        company: 'ПластикИндустрия RU',
        rating: 5,
        text: 'Гранулы однородные, стабильный показатель ПТР.',
        date: '2025-06-05'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'REACH',
      'Промышленное сырьё'
    ]
  },
  {
    id: 'p18',
    title: 'Краска фасадная акриловая, вёдра 20 кг',
    category: 'chemicals',
    seller: {
      id: 's18',
      name: 'ColorTech UZ',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Ташкент',
      trustScore: 84,
      verified: true,
      totalDeals: 27
    },
    price: 2.1,
    currency: 'USD',
    unit: 'кг',
    minOrder: 200,
    maxOrder: 20000,
    stock: 8000,
    stockAuto: false,
    photoId: 'paint',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Тип',
            v: 'Акриловая, водно-дисперсионная'
          },
          {
            p: 'Расход',
            v: '1 л / 6-8 м²'
          },
          {
            p: 'Морозостойкость',
            v: 'Да'
          }
        ]
      }
    ],
    certifications: [
      'ISO 9001'
    ],
    deliveryDays: {
      min: 5,
      max: 12
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.4,
    reviews: 13,
    reviewsList: [
      {
        company: 'РемСтрой KZ',
        rating: 4,
        text: 'Хорошая укрывистость, цвет соответствует образцу.',
        date: '2025-03-15'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Морозостойкая'
    ]
  },
  {
    id: 'p19',
    title: 'Удобрения азотные (карбамид) 46% N, мешки 50 кг',
    category: 'chemicals',
    seller: {
      id: 's19',
      name: 'AgroChem RU',
      country: 'RU',
      flag: '🇷🇺',
      city: 'Тольятти',
      trustScore: 93,
      verified: true,
      totalDeals: 89
    },
    price: 340,
    currency: 'USD',
    unit: 'тонна',
    minOrder: 20,
    maxOrder: 5000,
    stock: 6200,
    stockAuto: false,
    photoId: 'fertilizer',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Состав',
            v: 'Карбамид, N 46%'
          },
          {
            p: 'Влажность',
            v: '≤ 0.3%'
          },
          {
            p: 'Упаковка',
            v: 'Мешок 50 кг'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 2081-2010'
    ],
    deliveryDays: {
      min: 7,
      max: 15
    },
    incoterms: [
      'FOB',
      'CPT'
    ],
    sanctions: false,
    rating: 4.8,
    reviews: 35,
    reviewsList: [
      {
        company: 'АгроСнаб KZ',
        rating: 5,
        text: 'Удобрение качественное, гранулы без слёживания.',
        date: '2025-05-25'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'ГОСТ',
      'Экспорт'
    ]
  },
  {
    id: 'p20',
    title: 'Кислота серная техническая, 92.5%, бочки 200л',
    category: 'chemicals',
    seller: {
      id: 's20',
      name: 'IndustrChem KZ',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Балхаш',
      trustScore: 88,
      verified: true,
      totalDeals: 19
    },
    price: 180,
    currency: 'USD',
    unit: 'тонна',
    minOrder: 5,
    maxOrder: 200,
    stock: 450,
    stockAuto: false,
    photoId: 'acid',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Концентрация',
            v: '92.5%'
          },
          {
            p: 'Тип',
            v: 'Техническая'
          },
          {
            p: 'Тара',
            v: 'Бочка 200л, полиэтилен'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 2184-2013'
    ],
    deliveryDays: {
      min: 10,
      max: 18
    },
    incoterms: [
      'FCA',
      'DAP'
    ],
    sanctions: false,
    rating: 4.3,
    reviews: 8,
    reviewsList: [
      {
        company: 'ХимЗавод UZ',
        rating: 4,
        text: 'Концентрация соответствует паспорту качества.',
        date: '2025-02-20'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'ГОСТ',
      'Опасный груз — особые условия перевозки'
    ]
  },
  {
    id: 'p21',
    title: 'Шёлковая ткань натуральная, 100% шёлк',
    category: 'textile',
    seller: {
      id: 's21',
      name: 'SilkRoad Textile',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Маргилан',
      trustScore: 90,
      verified: true,
      totalDeals: 44
    },
    price: 18,
    currency: 'USD',
    unit: 'м',
    minOrder: 100,
    maxOrder: 10000,
    stock: 3200,
    stockAuto: false,
    photoId: 'silkFabric',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Состав',
            v: '100% натуральный шёлк'
          },
          {
            p: 'Плотность',
            v: '120 г/м²'
          },
          {
            p: 'Ширина',
            v: '140 см'
          }
        ]
      }
    ],
    certifications: [
      'OEKO-TEX'
    ],
    deliveryDays: {
      min: 7,
      max: 14
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.9,
    reviews: 27,
    reviewsList: [
      {
        company: 'ТекстильДом RU',
        rating: 5,
        text: 'Шёлк высочайшего качества, как заявлено.',
        date: '2025-06-12'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'OEKO-TEX',
      'Натуральный'
    ]
  },
  {
    id: 'p22',
    title: 'Готовая одежда — рабочая спецодежда, опт',
    category: 'textile',
    seller: {
      id: 's22',
      name: 'WorkWear KZ',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Караганда',
      trustScore: 82,
      verified: true,
      totalDeals: 31
    },
    price: 12,
    currency: 'USD',
    unit: 'комплект',
    minOrder: 100,
    maxOrder: 10000,
    stock: 5400,
    stockAuto: false,
    photoId: 'clothing',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Состав',
            v: '65% полиэстер, 35% хлопок'
          },
          {
            p: 'Класс защиты',
            v: 'Общетехнический'
          },
          {
            p: 'Размеры',
            v: '44-60'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 12.4.011'
    ],
    deliveryDays: {
      min: 10,
      max: 20
    },
    incoterms: [
      'DAP',
      'EXW'
    ],
    sanctions: false,
    rating: 4.3,
    reviews: 16,
    reviewsList: [
      {
        company: 'ПромСнаб RU',
        rating: 4,
        text: 'Швы крепкие, размеры соответствуют сетке.',
        date: '2025-04-18'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'ГОСТ',
      'Спецодежда'
    ]
  },
  {
    id: 'p23',
    title: 'Синтетическая ткань (полиэстер), рулоны',
    category: 'textile',
    seller: {
      id: 's23',
      name: 'FerganaTex',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Фергана',
      trustScore: 88,
      verified: true,
      totalDeals: 45
    },
    price: 3.4,
    currency: 'USD',
    unit: 'м',
    minOrder: 300,
    maxOrder: 50000,
    stock: 18000,
    stockAuto: false,
    photoId: 'syntheticFabric',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Состав',
            v: '100% полиэстер'
          },
          {
            p: 'Плотность',
            v: '200 г/м²'
          },
          {
            p: 'Ширина',
            v: '150 см'
          }
        ]
      }
    ],
    certifications: [
      'OEKO-TEX'
    ],
    deliveryDays: {
      min: 5,
      max: 10
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.5,
    reviews: 20,
    reviewsList: [
      {
        company: 'ШвейПром KZ',
        rating: 4,
        text: 'Ткань ровная, цвет стабильный по всей партии.',
        date: '2025-03-25'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'OEKO-TEX',
      'Опт'
    ]
  },
  {
    id: 'p24',
    title: 'Лист стальной горячекатаный, 4-10 мм',
    category: 'metals',
    seller: {
      id: 'u3',
      name: 'Sibmetall Group',
      country: 'RU',
      flag: '🇷🇺',
      city: 'Новосибирск',
      trustScore: 91,
      verified: true,
      totalDeals: 203
    },
    price: 680,
    currency: 'USD',
    unit: 'тонна',
    minOrder: 5,
    maxOrder: 1000,
    stock: 2400,
    stockAuto: false,
    photoId: 'steelSheet',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Толщина',
            v: '4-10 мм'
          },
          {
            p: 'Марка стали',
            v: 'Ст3сп'
          },
          {
            p: 'Стандарт',
            v: 'ГОСТ 19903-2015'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 19903-2015'
    ],
    deliveryDays: {
      min: 7,
      max: 15
    },
    incoterms: [
      'FCA',
      'DAP'
    ],
    sanctions: false,
    rating: 4.7,
    reviews: 29,
    reviewsList: [
      {
        company: 'МеталлТорг KZ',
        rating: 5,
        text: 'Лист ровный, толщина соответствует заказу.',
        date: '2025-05-14'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'ГОСТ',
      'Экспорт'
    ]
  },
  {
    id: 'p25',
    title: 'Алюминиевый профиль строительный',
    category: 'metals',
    seller: {
      id: 'u2',
      name: 'KazSteel Trading',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Павлодар',
      trustScore: 86,
      verified: true,
      totalDeals: 22
    },
    price: 2400,
    currency: 'USD',
    unit: 'тонна',
    minOrder: 2,
    maxOrder: 200,
    stock: 380,
    stockAuto: false,
    photoId: 'aluminumProfile',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Сплав',
            v: 'АД31'
          },
          {
            p: 'Покрытие',
            v: 'Анодированное'
          },
          {
            p: 'Длина',
            v: '6 м'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 22233-2001'
    ],
    deliveryDays: {
      min: 10,
      max: 18
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.4,
    reviews: 11,
    reviewsList: [
      {
        company: 'СтройАлюминий RU',
        rating: 4,
        text: 'Геометрия профиля точная, покрытие без дефектов.',
        date: '2025-02-28'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'ГОСТ'
    ]
  },
  {
    id: 'p26',
    title: 'Медная проволока, эмалированная, для обмоток',
    category: 'metals',
    seller: {
      id: 's26',
      name: 'CopperLine RU',
      country: 'RU',
      flag: '🇷🇺',
      city: 'Москва',
      trustScore: 89,
      verified: true,
      totalDeals: 47
    },
    price: 9.8,
    currency: 'USD',
    unit: 'кг',
    minOrder: 100,
    maxOrder: 20000,
    stock: 6800,
    stockAuto: false,
    photoId: 'copperWire',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Диаметр',
            v: '0.5-2.0 мм'
          },
          {
            p: 'Класс изоляции',
            v: '155°C'
          },
          {
            p: 'Стандарт',
            v: 'ГОСТ 21931-76'
          }
        ]
      }
    ],
    certifications: [
      'ГОСТ 21931-76'
    ],
    deliveryDays: {
      min: 7,
      max: 14
    },
    incoterms: [
      'FCA',
      'DAP'
    ],
    sanctions: false,
    rating: 4.8,
    reviews: 24,
    reviewsList: [
      {
        company: 'ЭлектроМотор KZ',
        rating: 5,
        text: 'Изоляция качественная, обрывов провода не было.',
        date: '2025-04-30'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'ГОСТ',
      'Для электродвигателей'
    ]
  },
  {
    id: 'p27',
    title: 'Картонные коробки гофрированные, 3-слойные',
    category: 'packaging',
    seller: {
      id: 's27',
      name: 'KazPack',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Шымкент',
      trustScore: 83,
      verified: true,
      totalDeals: 38
    },
    price: 0.42,
    currency: 'USD',
    unit: 'шт',
    minOrder: 1000,
    maxOrder: 500000,
    stock: 85000,
    stockAuto: false,
    photoId: 'cardboardBox',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Слойность',
            v: '3-слойный гофрокартон'
          },
          {
            p: 'Размер',
            v: 'По спецификации заказчика'
          },
          {
            p: 'Нагрузка',
            v: 'до 25 кг'
          }
        ]
      }
    ],
    certifications: [
      'ISO 9001'
    ],
    deliveryDays: {
      min: 5,
      max: 10
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.5,
    reviews: 18,
    reviewsList: [
      {
        company: 'ЛогистикПак UZ',
        rating: 4,
        text: 'Коробки прочные, заказ по индивидуальным размерам выполнили точно.',
        date: '2025-03-08'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Индивидуальные размеры'
    ]
  },
  {
    id: 'p28',
    title: 'ПЭТ-бутылки для напитков, 0.5л, преформы',
    category: 'packaging',
    seller: {
      id: 's28',
      name: 'PlastPack UZ',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Ангрен',
      trustScore: 81,
      verified: true,
      totalDeals: 15
    },
    price: 0.08,
    currency: 'USD',
    unit: 'шт',
    minOrder: 10000,
    maxOrder: 2000000,
    stock: 450000,
    stockAuto: false,
    photoId: 'petBottle',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Объём',
            v: '0.5 л'
          },
          {
            p: 'Материал',
            v: 'ПЭТ пищевой'
          },
          {
            p: 'Вес преформы',
            v: '18 г'
          }
        ]
      }
    ],
    certifications: [
      'ISO 22000',
      'Food Grade'
    ],
    deliveryDays: {
      min: 5,
      max: 12
    },
    incoterms: [
      'EXW',
      'FCA'
    ],
    sanctions: false,
    rating: 4.2,
    reviews: 7,
    reviewsList: [
      {
        company: 'НапиткиПром KZ',
        rating: 4,
        text: 'Преформы стандартные, проблем при выдуве не было.',
        date: '2025-01-22'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Food Grade',
      'Пищевая упаковка'
    ]
  },
  {
    id: 'p29',
    title: 'Мешки полипропиленовые тканые, 25-50 кг',
    category: 'packaging',
    seller: {
      id: 's29',
      name: 'PolyBag KZ',
      country: 'KZ',
      flag: '🇰🇿',
      city: 'Тараз',
      trustScore: 85,
      verified: true,
      totalDeals: 26
    },
    price: 0.18,
    currency: 'USD',
    unit: 'шт',
    minOrder: 5000,
    maxOrder: 1000000,
    stock: 220000,
    stockAuto: false,
    photoId: 'ppBag',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Материал',
            v: 'Полипропилен тканый'
          },
          {
            p: 'Грузоподъёмность',
            v: 'до 50 кг'
          },
          {
            p: 'Плотность ткани',
            v: '90 г/м²'
          }
        ]
      }
    ],
    certifications: [
      'ISO 9001'
    ],
    deliveryDays: {
      min: 7,
      max: 14
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.4,
    reviews: 12,
    reviewsList: [
      {
        company: 'ЗерноТрейд RU',
        rating: 4,
        text: 'Мешки прочные, швы не расходятся при загрузке.',
        date: '2025-02-14'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'Прочные швы'
    ]
  },
  {
    id: 'p30',
    title: 'Компрессор винтовой промышленный, 7.5 кВт',
    category: 'equipment',
    seller: {
      id: 's30',
      name: 'TechEquip AZ',
      country: 'AZ',
      flag: '🇦🇿',
      city: 'Баку',
      trustScore: 87,
      verified: true,
      totalDeals: 29
    },
    price: 3200,
    currency: 'USD',
    unit: 'шт',
    minOrder: 1,
    maxOrder: 50,
    stock: 18,
    stockAuto: false,
    photoId: 'compressor',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Мощность',
            v: '7.5 кВт'
          },
          {
            p: 'Производительность',
            v: '1.1 м³/мин'
          },
          {
            p: 'Давление',
            v: 'до 10 бар'
          }
        ]
      }
    ],
    certifications: [
      'CE',
      'ISO 9001'
    ],
    deliveryDays: {
      min: 14,
      max: 30
    },
    incoterms: [
      'DAP',
      'DDP'
    ],
    sanctions: false,
    rating: 4.6,
    reviews: 9,
    reviewsList: [
      {
        company: 'ПромСервис KZ',
        rating: 5,
        text: 'Работает тихо, расход электроэнергии заявленный.',
        date: '2025-04-09'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'CE',
      'Промышленное применение'
    ]
  },
  {
    id: 'p31',
    title: 'Станок токарный с ЧПУ, рабочая длина 1000 мм',
    category: 'equipment',
    seller: {
      id: 's31',
      name: 'MachineTrade RU',
      country: 'RU',
      flag: '🇷🇺',
      city: 'Челябинск',
      trustScore: 90,
      verified: true,
      totalDeals: 13
    },
    price: 24500,
    currency: 'USD',
    unit: 'шт',
    minOrder: 1,
    maxOrder: 10,
    stock: 4,
    stockAuto: false,
    photoId: 'lathe',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Рабочая длина',
            v: '1000 мм'
          },
          {
            p: 'Система ЧПУ',
            v: 'Fanuc-compatible'
          },
          {
            p: 'Точность',
            v: '±0.01 мм'
          }
        ]
      }
    ],
    certifications: [
      'CE',
      'EAC'
    ],
    deliveryDays: {
      min: 30,
      max: 60
    },
    incoterms: [
      'DAP',
      'DDP'
    ],
    sanctions: false,
    rating: 4.8,
    reviews: 6,
    reviewsList: [
      {
        company: 'ЗаводДеталь KZ',
        rating: 5,
        text: 'Точность станка соответствует паспорту, наладка прошла без проблем.',
        date: '2025-01-30'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'CE',
      'EAC',
      'С ЧПУ'
    ]
  },
  {
    id: 'p32',
    title: 'Сварочный аппарат инверторный, MMA/TIG',
    category: 'equipment',
    seller: {
      id: 's32',
      name: 'WeldTech UZ',
      country: 'UZ',
      flag: '🇺🇿',
      city: 'Ташкент',
      trustScore: 84,
      verified: true,
      totalDeals: 35
    },
    price: 280,
    currency: 'USD',
    unit: 'шт',
    minOrder: 5,
    maxOrder: 1000,
    stock: 320,
    stockAuto: false,
    photoId: 'weldingMachine',
    specs: [
      {
        group: 'Основные',
        items: [
          {
            p: 'Ток сварки',
            v: '10-200А'
          },
          {
            p: 'Режимы',
            v: 'MMA/TIG'
          },
          {
            p: 'Напряжение питания',
            v: '220В'
          }
        ]
      }
    ],
    certifications: [
      'CE',
      'RoHS'
    ],
    deliveryDays: {
      min: 7,
      max: 14
    },
    incoterms: [
      'EXW',
      'DAP'
    ],
    sanctions: false,
    rating: 4.5,
    reviews: 22,
    reviewsList: [
      {
        company: 'МонтажСтрой KZ',
        rating: 4,
        text: 'Аппарат лёгкий, дуга стабильная на всех режимах.',
        date: '2025-03-20'
      }
    ],
    aiCheck: {
      sanctionsOk: true,
      specsVerified: true,
      qualityRisk: 'low'
    },
    tags: [
      'CE',
      'Компактный'
    ]
  },
];

export function calcMarketplaceFee(amount) {
  if (amount <= 5000) return 1.5;
  if (amount >= 50000) return 0.5;
  return +(1.5 - (1.5 - 0.5) * ((amount - 5000) / (50000 - 5000))).toFixed(2);
}

/**
 * Единый реестр единиц измерения для всего приложения.
 * Используется в DocumentCenter (таблица КП) и Marketplace (форма размещения товара).
 * Добавлять новые единицы только здесь — не дублировать список в двух местах.
 */
export const PRODUCT_UNITS = [
  'кг', 'тонна', 'шт', 'литр', 'л',
  'м', 'м²', 'м³', 'пог.м',
  'мешок', 'упак', 'рулон', 'паллет', 'компл',
];
