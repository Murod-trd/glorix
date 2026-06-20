/**
 * Поиск кодов ТН ВЭД (HS code) по любому товару — не только по
 * фиксированному списку из 6 позиций.
 *
 * КОНТЕКСТ: раньше `tnved` в DocumentCenter.jsx был статичным списком всего
 * из 6 товаров (пшеница, цемент, арматура, цемент, масло подсолнечное,
 * полиэтилен) с подсказкой «Попробуйте: ...» именно из этих шести слов —
 * платформа находила только то, что было захардкожено, хотя текст рядом
 * заявлял «ИИ найдёт правильный код» для любого товара.
 *
 * ЧТО ЭТО РЕШАЕТ: `hsCodesRaw.json` — полный официальный международный
 * Harmonized System (6-значный уровень, 5613 позиций), источник —
 * датасет datasets/harmonized-system на GitHub, данные из UN Comtrade,
 * лицензия ODC Public Domain Dedication and Licence. Это основа кодов
 * ТН ВЭД во всех странах СНГ (национальные коды ТН ВЭД РФ/КЗ/УЗ и др. —
 * это тот же 6-значный международный HS-код плюс 2-4 дополнительные цифры
 * национальной детализации). Поиск теперь работает по любому товару,
 * присутствующему в этой номенклатуре — то есть практически по любому
 * товару, который в принципе пересекает границу.
 *
 * ВАЖНО ДЛЯ РАЗМЕРА БАНДЛА: датасет — почти 900KB в виде JSON. Он
 * импортируется ДИНАМИЧЕСКИ (import(), не статический import) — грузится
 * только когда пользователь реально открывает вкладку поиска ТН ВЭД, не
 * на каждой загрузке страницы. Статический импорт этого файла раздул бы
 * основной бандл платформы вдвое, что прямо противоречило бы более ранней
 * работе по сокращению размера начальной загрузки (см. CHANGELOG, пункт
 * 🔴#4) — поэтому такой подход не используется.
 *
 * ЧЕСТНАЯ ГРАНИЦА: официальные описания в датасете — на английском (это
 * язык международного стандарта). Платформа не переводит все 5613 записей
 * на русский самостоятельно — машинный/самостоятельный перевод
 * специализированной таможенной терминологии создаёт риск содержательной
 * ошибки, которая может привести к неверной классификации товара. Вместо
 * этого реализован двусторонний поиск:
 *   1) прямой поиск по английскому описанию (если пользователь ввёл
 *      товар на английском или код напрямую);
 *   2) поиск по словарю частых русских терминов → переводит в английские
 *      ключевые слова, по которым уже ищется в официальном датасете.
 * Словарь покрывает наиболее частые товарные группы B2B-торговли в СНГ,
 * но не все 5613 позиций — для редких товаров пользователю показывается
 * прямая ссылка на полный официальный поиск ВТамО/UN Comtrade.
 *
 * Платформа не утверждает, что найденный код — единственно верный для
 * таможенного оформления: финальную классификацию по национальному ТН ВЭД
 * (с учётом 2-4 дополнительных цифр конкретной страны) должен подтвердить
 * декларант/таможенный брокер — это явно показано в UI.
 */

// Частые русские термины → английские ключевые слова для поиска в датасете.
// Список не претендует на полноту всех 5613 позиций — это таргетированный
// словарь самых частых товарных категорий B2B-торговли в регионе СНГ.
const RU_EN_TERMS = {
  // Зерновые, мука
  'пшеница': 'wheat', 'пшеницы': 'wheat', 'мука': 'flour', 'ячмень': 'barley',
  'кукуруза': 'maize corn', 'рис': 'rice', 'соя': 'soya', 'овёс': 'oats', 'овес': 'oats',
  'рожь': 'rye', 'гречка': 'buckwheat', 'просо': 'millet', 'крупа': 'groats',
  // Текстиль, волокна
  'хлопок': 'cotton', 'пряжа': 'yarn', 'ткань': 'fabric textile', 'текстиль': 'textile',
  'шёлк': 'silk', 'шелк': 'silk', 'шерсть': 'wool', 'лён': 'flax', 'лен': 'flax',
  'нить': 'thread yarn', 'трикотаж': 'knitted',
  // Стройматериалы
  'цемент': 'cement', 'арматура': 'iron bars rods reinforcing', 'бетон': 'concrete',
  'кирпич': 'brick', 'стекло': 'glass', 'плитка': 'tile', 'гипс': 'gypsum plaster',
  'известь': 'lime', 'песок': 'sand', 'щебень': 'gravel crushed stone',
  'асфальт': 'asphalt bitumen', 'шифер': 'asbestos slate', 'утеплитель': 'insulation',
  // Нефть, газ, энергоносители
  'масло подсолнечное': 'sunflower oil', 'подсолнечное масло': 'sunflower oil',
  'масло': 'oil', 'нефть': 'petroleum oil crude', 'газ': 'gas', 'бензин': 'petrol gasoline',
  'дизель': 'diesel gas oil', 'мазут': 'fuel oil', 'керосин': 'kerosene', 'битум': 'bitumen',
  // Пластики, химия
  'полиэтилен': 'polyethylene', 'пластик': 'plastic', 'полипропилен': 'polypropylene',
  'пвх': 'pvc vinyl chloride', 'каучук': 'rubber', 'смола': 'resin',
  'химикаты': 'chemical', 'кислота': 'acid', 'краска': 'paint', 'лак': 'varnish lacquer',
  'клей': 'glue adhesive', 'растворитель': 'solvent', 'спирт': 'alcohol spirit',
  'удобрения': 'fertiliser fertilizer', 'удобрение': 'fertiliser',
  // Металлы
  'сталь': 'steel iron', 'железо': 'iron', 'алюминий': 'aluminium aluminum',
  'медь': 'copper', 'металл': 'metal', 'прокат': 'rolled steel', 'олово': 'tin',
  'цинк': 'zinc', 'свинец': 'lead', 'никель': 'nickel', 'титан': 'titanium',
  'золото': 'gold', 'серебро': 'silver', 'провод': 'wire', 'кабель': 'cable wire',
  'труба': 'pipe tube', 'лист стальной': 'steel sheet plate', 'уголь': 'coal',
  // Продовольствие
  'сахар': 'sugar', 'мясо': 'meat', 'молоко': 'milk', 'яйца': 'eggs', 'сыр': 'cheese',
  'фрукты': 'fruit', 'овощи': 'vegetables', 'орехи': 'nuts', 'бананы': 'bananas',
  'банан': 'bananas', 'яблоки': 'apples', 'апельсины': 'oranges', 'виноград': 'grapes',
  'картофель': 'potatoes', 'томаты': 'tomatoes', 'помидоры': 'tomatoes', 'лук': 'onions',
  'чеснок': 'garlic', 'кофе': 'coffee', 'чай': 'tea', 'какао': 'cocoa',
  'специи': 'spices', 'консервы': 'preserved canned', 'напитки': 'beverages',
  'вино': 'wine', 'пиво': 'beer', 'соки': 'juices', 'рыба': 'fish', 'морепродукты': 'seafood',
  'мёд': 'honey', 'мед': 'honey', 'мука пшеничная': 'wheat flour',
  // Бумага, упаковка
  'бумага': 'paper', 'картон': 'paperboard cardboard', 'упаковка': 'packing packaging',
  'тетрапак': 'carton packaging', 'плёнка': 'film plastic', 'пленка': 'film plastic',
  // Машины, оборудование
  'оборудование': 'machinery apparatus equipment', 'станок': 'machine tool',
  'насос': 'pumps', 'двигатель': 'engine motor', 'компрессор': 'compressor',
  'генератор': 'generator', 'трактор': 'tractor', 'экскаватор': 'excavator',
  'подшипник': 'bearing', 'редуктор': 'gearbox', 'вентилятор': 'fan ventilator',
  'кондиционер': 'air conditioner', 'холодильник': 'refrigerator',
  // Электроника
  'электроника': 'electronic', 'компьютер': 'computer data processing',
  'ноутбук': 'portable computer laptop', 'телефон': 'telephone',
  'смартфон': 'telephone cellular', 'планшет': 'tablet computer',
  'монитор': 'monitor display', 'принтер': 'printer', 'батарея': 'battery accumulator',
  'аккумулятор': 'battery accumulator', 'процессор': 'processor circuit',
  'микросхема': 'integrated circuit', 'плата': 'printed circuit board',
  'телевизор': 'television receiver',
  // Транспорт
  'автомобиль': 'motor cars vehicles', 'машина': 'motor vehicle', 'грузовик': 'lorry truck',
  'автобус': 'bus motor vehicle', 'мотоцикл': 'motorcycle', 'велосипед': 'bicycle',
  'запчасти': 'parts accessories vehicles', 'шины': 'tyres tires', 'резина': 'rubber',
  'шасси': 'chassis', 'кузов': 'bodies vehicles', 'самолёт': 'aircraft', 'самолет': 'aircraft',
  'судно': 'vessel ship', 'корабль': 'vessel ship',
  // Дерево
  'древесина': 'wood timber', 'лес': 'wood timber', 'фанера': 'plywood',
  'доска': 'board wood plank', 'брус': 'wood beam', 'паркет': 'parquet flooring',
  // Кожа, текстильные изделия
  'кожа': 'leather', 'обувь': 'footwear shoes', 'одежда': 'clothing apparel garment',
  'сумка': 'handbag travel goods', 'перчатки': 'gloves',
  // Минералы и стекловолокно
  'стекловолокно': 'fibreglass glass fibre', 'мрамор': 'marble', 'гранит': 'granite',
  // Бытовое
  'мебель': 'furniture', 'игрушки': 'toys', 'посуда': 'tableware kitchenware',
  'косметика': 'cosmetic beauty', 'мыло': 'soap', 'парфюм': 'perfume',
  'игры': 'games toys', 'спортивный инвентарь': 'sports equipment articles',
  // Прочее общее
  'медикаменты': 'medicament pharmaceutical', 'лекарства': 'medicament pharmaceutical',
  'вакцина': 'vaccine', 'витамины': 'vitamins', 'инструменты': 'tools hand',
  'оружие': 'arms weapons', 'часы': 'clocks watches', 'ювелирные изделия': 'jewellery',
};

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

let cachedData = null;

async function loadDataset() {
  if (cachedData) return cachedData;
  const mod = await import('./hsCodesRaw.json');
  cachedData = mod.default;
  return cachedData;
}

/**
 * Ищет коды ТН ВЭД по запросу — названию товара (на русском или
 * английском) или прямому коду. Асинхронная: датасет (~900KB) подгружается
 * по требованию при первом вызове, дальше берётся из памяти.
 *
 * @returns {Promise<Array<{code, description, section}>>} до 20 совпадений
 */
export async function searchHsCodes(query) {
  const q = normalize(query);
  if (q.length < 2) return [];

  const hsCodesRaw = await loadDataset();

  // Прямой поиск по коду (цифры)
  if (/^\d+$/.test(q)) {
    return hsCodesRaw.filter(r => r.code.startsWith(q)).slice(0, 20);
  }

  // Собираем поисковые термины: сам запрос + перевод из словаря (если есть
  // прямое совпадение ключа словаря внутри запроса)
  const terms = [q];
  for (const [ru, en] of Object.entries(RU_EN_TERMS)) {
    if (q.includes(ru)) {
      terms.push(...en.split(' '));
    }
  }

  const uniqueTerms = [...new Set(terms)];

  const matches = hsCodesRaw.filter(r => {
    const desc = r.description.toLowerCase();
    return uniqueTerms.some(t => {
      if (t.length < 3) return false;
      // Совпадение по началу слова (граница перед термином). Для коротких
      // терминов (3-4 символа) дополнительно требуем границу и после
      // термина — иначе "tin" совпадает в начале "tinctorius"/"tinted",
      // "car" совпадает в начале "carcasses". Более длинные термины
      // (5+ символов) такой риск почти не несут, им оставляем только
      // левую границу — это ловит множественное число и словоформы
      // ("pump" внутри "Pumps", "fertilis" внутри "Fertilisers").
      const pattern = t.length <= 4
        ? `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
        : `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
      const re = new RegExp(pattern, 'i');
      return re.test(desc);
    });
  });

  return matches.slice(0, 20);
}

/**
 * Возвращает true, если запрос совпал с известным словарным термином —
 * используется в UI, чтобы отличить «нашли через словарь» от «нашли
 * напрямую по совпадению в английском описании».
 */
export function hasKnownTranslation(query) {
  const q = normalize(query);
  return Object.keys(RU_EN_TERMS).some(ru => q.includes(ru));
}
