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

  // === Раздел I: живые животные ===
  'лошади': 'horses', 'осёл': 'asses', 'ослы': 'asses', 'крупный рогатый скот': 'cattle',
  'буйволы': 'buffalo', 'свиньи': 'swine', 'свинья': 'swine', 'овцы': 'sheep', 'овца': 'sheep', 'козы': 'goats', 'коза': 'goats',
  'птица домашняя': 'poultry', 'курица': 'poultry fowls', 'утки': 'ducks', 'гуси': 'geese',
  'индейки': 'turkeys', 'кролики': 'rabbits', 'пчёлы': 'bees', 'пчелы': 'bees',
  'рыба живая': 'fish live', 'моллюски': 'molluscs', 'ракообразные': 'crustaceans',
  'креветки': 'shrimps prawns', 'крабы': 'crabs',

  // === Раздел II: растительные продукты ===
  'растения живые': 'plants live', 'саженцы': 'plants live', 'цветы': 'flowers cut',
  'семена': 'seeds sowing', 'рассада': 'plants live', 'грибы': 'mushrooms truffles',
  'лимоны': 'lemons', 'мандарины': 'mandarins', 'груши': 'pears', 'сливы': 'plums',
  'клубника': 'strawberries', 'ягоды': 'berries', 'финики': 'dates fruit',
  'кофе зелёный': 'coffee not roasted', 'перец': 'pepper', 'корица': 'cinnamon',
  'имбирь': 'ginger', 'кориандр': 'coriander seed', 'хмель': 'hops',
  'солома': 'straw husks', 'сено': 'forage', 'отруби': 'bran sharps',

  // === Раздел III: жиры и масла ===
  'свиной жир': 'pig fat', 'сало': 'lard pig fat', 'животный жир': 'fat tallow',
  'оливковое масло': 'olive oil', 'пальмовое масло': 'palm oil', 'соевое масло': 'soya bean oil',
  'рапсовое масло': 'rape colza oil', 'кокосовое масло': 'coconut oil', 'маргарин': 'margarine',

  // === Раздел IV: готовые продукты, напитки, табак ===
  'колбаса': 'sausages meat preparations', 'тушёнка': 'meat preparations preserved',
  'рыбные консервы': 'fish prepared preserved', 'икра': 'caviar',
  'хлеб': 'bread pastry', 'печенье': 'biscuits', 'макароны': 'pasta',
  'шоколад': 'chocolate cocoa preparations', 'кондитерские изделия': 'sugar confectionery',
  'минеральная вода': 'waters mineral', 'вода': 'waters mineral natural',
  'сок': 'juices fruit', 'уксус': 'vinegar', 'дрожжи': 'yeasts',
  'табак': 'tobacco', 'сигареты': 'cigarettes tobacco', 'комбикорм': 'preparations animal feeding',

  // === Раздел V: минеральные продукты ===
  'соль': 'salt', 'сера': 'sulphur', 'графит': 'graphite', 'песок строительный': 'sands natural',
  'кварц': 'quartz', 'мел': 'chalk', 'гравий': 'gravel', 'доломит': 'dolomite',
  'руда железная': 'iron ores concentrates', 'руда': 'ores concentrates',
  'каменный уголь': 'coal', 'кокс': 'coke semi-coke', 'асфальт природный': 'bitumen asphalt natural',
  'парафин': 'petroleum jelly paraffin wax', 'смазочные масла': 'lubricating oils',

  // === Раздел VI: химическая продукция ===
  'хлор': 'chlorine', 'йод': 'iodine', 'водород': 'hydrogen', 'кислород': 'oxygen',
  'азот': 'nitrogen', 'аммиак': 'ammonia', 'сода': 'sodium carbonate',
  'перекись водорода': 'hydrogen peroxide', 'спирт этиловый': 'ethyl alcohol undenatured',
  'антибиотики': 'antibiotics', 'гормоны': 'hormones', 'инсектициды': 'insecticides',
  'пестициды': 'pesticides', 'мыло хозяйственное': 'soap', 'духи': 'perfumes toilet waters',
  'шампунь': 'preparations hair', 'зубная паста': 'dentifrices',
  'фотопленка': 'photographic plates film', 'фотопленка': 'photographic plates film',
  'взрывчатые вещества': 'explosives', 'спички': 'matches',

  // === Раздел VII: пластмассы и каучук ===
  'полистирол': 'polystyrene', 'поливинилхлорид': 'vinyl chloride polymers',
  'поликарбонат': 'polycarbonates', 'силикон': 'silicones',
  'плиты пластиковые': 'plates sheets plastics', 'трубы пластиковые': 'tubes pipes plastics',
  'плёнка пластиковая': 'plates sheets film plastics', 'пакеты пластиковые': 'sacks bags plastics',
  'посуда пластиковая': 'tableware kitchenware plastics', 'латекс': 'rubber latex natural',
  'резиновые изделия': 'articles rubber', 'резиновые шланги': 'tubes pipes hoses rubber',
  'конвейерные ленты': 'conveyor belts rubber',

  // === Раздел VIII: кожа, мех ===
  'шкуры': 'hides skins raw', 'мех': 'furskins', 'дублёная кожа': 'leather',
  'чемоданы': 'trunks suitcases', 'ремни': 'belts straps leather',

  // === Раздел IX: древесина, пробка ===
  'пробка': 'cork natural', 'древесный уголь': 'wood charcoal', 'опилки': 'sawdust wood waste',
  'паллеты': 'pallets wood', 'тара деревянная': 'packing cases boxes wood',
  'бочки деревянные': 'casks barrels wood', 'двери деревянные': 'builders joinery carpentry wood',
  'окна деревянные': 'builders joinery carpentry wood',

  // === Раздел X: бумажная масса, бумага ===
  'целлюлоза': 'wood pulp', 'газетная бумага': 'newsprint',
  'туалетная бумага': 'toilet paper', 'гофрокартон': 'paperboard corrugated',
  'обои': 'wallpaper', 'тетради': 'registers exercise books',
  'этикетки': 'labels paper', 'фильтровальная бумага': 'paper filter',

  // === Раздел XI: текстиль (расширение) ===
  'шёлковая ткань': 'fabrics woven silk', 'джут': 'jute', 'верёвка': 'twine cordage rope',
  'канат': 'twine cordage rope', 'сетка': 'netting nets', 'ковёр': 'carpets textile floor',
  'нетканые материалы': 'nonwovens', 'войлок': 'felt', 'вата': 'wadding textile',
  'тент': 'tarpaulins awnings', 'спецодежда': 'clothing protective work',
  'постельное бельё': 'bed linen', 'полотенца': 'towels terry toweling',
  'носки': 'socks hosiery', 'перчатки текстильные': 'gloves knitted textile',

  // === Раздел XII: обувь, головные уборы ===
  'сапоги': 'footwear', 'кроссовки': 'sports footwear', 'шляпы': 'hats headgear',
  'зонты': 'umbrellas', 'трости': 'walking-sticks',

  // === Раздел XIII: камень, керамика, стекло ===
  'плитка керамическая': 'tiles ceramic', 'кафель': 'tiles ceramic',
  'фарфор': 'porcelain china tableware', 'санфарфор': 'ceramic sanitary fixtures',
  'кирпич огнеупорный': 'bricks blocks refractory', 'стеклотара': 'glass containers',
  'стекловата': 'glass wool fibres', 'оптическое стекло': 'glass optical elements',
  'зеркало': 'mirrors glass',

  // === Раздел XIV: драгоценные камни, металлы ===
  'жемчуг': 'pearls', 'бриллианты': 'diamonds', 'драгоценные камни': 'precious stones',
  'платина': 'platinum', 'монеты': 'coin',

  // === Раздел XV: чёрные и цветные металлы ===
  'чугун': 'pig iron', 'феррохром': 'ferro-alloys', 'нержавеющая сталь': 'steel stainless',
  'стальной лист': 'flat-rolled steel', 'стальная труба': 'tubes pipes iron steel',
  'гвозди': 'nails tacks', 'болты': 'bolts screws', 'гайки': 'nuts screws',
  'проволока стальная': 'wire iron steel', 'крепёж': 'fasteners screws bolts',
  'свинцовый лист': 'lead plates sheet', 'цинковый лист': 'zinc plates sheet',
  'магний': 'magnesium', 'кобальт': 'cobalt', 'вольфрам': 'tungsten wolfram',
  'столовые приборы': 'cutlery tableware', 'замки': 'locks padlocks', 'петли': 'hinges',
  'цепи': 'chain chains iron steel', 'трос стальной': 'wire ropes cables',

  // === Раздел XVI: машины, оборудование, электроника (расширение) ===
  'котёл': 'boilers', 'турбина': 'turbines', 'ядерный реактор': 'nuclear reactors',
  'подъёмник': 'lifting machinery', 'кран грузовой': 'cranes lifting machinery',
  'конвейер': 'machinery handling continuous-action elevators conveyors',
  'сельскохозяйственная техника': 'machinery agricultural',
  'сеялка': 'machinery sowing planting', 'комбайн': 'harvesting threshing machinery',
  'мельница': 'machinery milling industry', 'пресс': 'presses machinery',
  'сварочный аппарат': 'machines apparatus soldering brazing welding',
  'сверлильный станок': 'machine tools drilling',
  'фрезерный станок': 'machine tools milling', 'токарный станок': 'lathes machine tools',
  'упаковочное оборудование': 'machinery packing wrapping',
  'холодильное оборудование': 'refrigerating freezing equipment',
  'фильтр промышленный': 'machinery filtering purifying',
  'весы': 'weighing machinery', 'клапан': 'taps cocks valves',
  'подшипники шариковые': 'bearings ball', 'трансформатор': 'transformers electrical',
  'аккумуляторная батарея': 'accumulators electric', 'лампа': 'lamps lighting',
  'светодиод': 'diodes light-emitting', 'выключатель': 'switches electrical',
  'розетка': 'plugs sockets electrical', 'микрофон': 'microphones',
  'наушники': 'headphones earphones', 'видеокамера': 'television cameras',
  'роутер': 'apparatus transmission reception voice data', 'модем': 'apparatus transmission reception',
  'сим-карта': 'smart cards', 'жёсткий диск': 'storage units',
  'клавиатура': 'input output units automatic data processing',
  'сканер': 'optical scanners',

  // === Раздел XVII: транспорт ===
  'локомотив': 'rail locomotives', 'железнодорожный вагон': 'railway tramway coaches vans trucks',
  'рельсы': 'railway tramway track fixtures fittings', 'прицеп': 'trailers semi-trailers',
  'мопед': 'mopeds cycles', 'катер': 'vessel boats', 'яхта': 'yachts pleasure vessels',
  'контейнер': 'containers', 'якорь': 'anchors grapnels',

  // === Раздел XVIII: оптика, медицина, часы, музыка ===
  'очки': 'spectacles goggles', 'бинокль': 'binoculars optical',
  'микроскоп': 'microscopes', 'термометр': 'thermometers',
  'медицинское оборудование': 'instruments appliances medical',
  'шприц': 'syringes needles catheters', 'рентген аппарат': 'apparatus x-ray',
  'слуховой аппарат': 'hearing aids', 'будильник': 'clocks alarm',
  'гитара': 'musical instruments string', 'пианино': 'pianos',

  // === Раздел XIX: оружие ===
  'патроны боевые': 'cartridges ammunition', 'пневматическое оружие': 'arms spring air gas',
  'снаряды': 'bombs grenades torpedoes mines missiles',

  // === Раздел XX: разное ===
  'стулья': 'seats', 'кресла': 'seats', 'диван': 'seats',
  'светильник': 'lamps lighting fittings', 'постельные принадлежности': 'mattresses cushions bedding',
  'авторучка': 'pens ball point', 'карандаш': 'pencils', 'кисть для рисования': 'brushes paint',
  'кнопки': 'buttons', 'молнии': 'slide fasteners', 'пуговицы': 'buttons',
  'воздушные шары': 'carnival articles', 'ёлочные украшения': 'festive carnival entertainment articles',

  // === Раздел XXI: искусство, антиквариат ===
  'картины': 'paintings drawings pastels', 'скульптура': 'sculptures statuary',
  'антиквариат': 'antiques', 'марки почтовые': 'postage revenue stamps',
};

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

let cachedData = null;
let cachedRuGroups = null;

async function loadDataset() {
  if (cachedData) return cachedData;
  const mod = await import('./hsCodesRaw.json');
  cachedData = mod.default;
  return cachedData;
}

/**
 * Загружает официальные русские названия 96 товарных групп ТН ВЭД ЕАЭС
 * (2-значный уровень — например '01' → 'Живые животные'). Источник —
 * classifikators.ru, который ссылается на официальное Решение Совета
 * Евразийской экономической комиссии от 14.09.2021 №80. Это подлинные
 * официальные русские названия, не машинный перевод — поэтому проверяются
 * раньше словаря и живого перевода: если запрос совпадает с названием
 * группы, результат ограничивается товарами из этой группы (по 2-значному
 * префиксу кода), что даёт точное соответствие без риска ошибки перевода.
 *
 * Это покрывает только верхний уровень (96 групп из 5613 позиций
 * международного датасета) — собрать полный 6-значный уровень на русском
 * вручную нереалистично за одну сессию (тысячи отдельных страниц).
 * Дальнейшее расширение глубины (4-значный, затем 6-значный уровень)
 * запланировано как постепенная работа в будущих сессиях.
 */
async function loadRuGroups() {
  if (cachedRuGroups) return cachedRuGroups;
  const mod = await import('./tnvedGroupsRu.json');
  cachedRuGroups = mod.default;
  return cachedRuGroups;
}

/**
 * Живой перевод через неофициальный, незадокументированный эндпоинт
 * Google Translate (без API-ключа). Решение явно одобрено основателем
 * как временная мера для демо-фазы (см. docs/DECISIONS.md, Decision 10) —
 * этот эндпоинт может быть заблокирован или изменён Google в любой момент
 * без предупреждения, поэтому он используется только как fallback после
 * локального словаря, а ошибки сети обрабатываются мягко (возврат null,
 * не исключение, которое могло бы сломать страницу).
 *
 * При переходе на реальный backend (MVP/Beta по Roadmap) этот эндпоинт
 * должен быть заменён на официальный платный API перевода или
 * самостоятельно хостящийся LibreTranslate — см. DECISIONS.md.
 *
 * @returns {Promise<string|null>} переведённый текст или null при ошибке
 */
async function liveTranslateRuToEn(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    // Формат ответа: [[[translated, original, ...], ...], ...]
    const translated = data?.[0]?.map(chunk => chunk[0]).join('') ?? null;
    return translated ? translated.toLowerCase() : null;
  } catch {
    // Сеть недоступна, таймаут, эндпоинт заблокирован/изменён — любая
    // ошибка здесь не должна ломать поиск, только означает «живой перевод
    // недоступен сейчас», UI покажет соответствующее сообщение.
    return null;
  }
}

function matchByTerms(hsCodesRaw, terms) {
  const uniqueTerms = [...new Set(terms)];
  return hsCodesRaw.filter(r => {
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
}

/**
 * Ищет коды ТН ВЭД по запросу — названию товара (на русском или
 * английском) или прямому коду. Асинхронная: датасет (~900KB) подгружается
 * по требованию при первом вызове, дальше берётся из памяти.
 *
 * Порядок попыток для русского текстового запроса (не код, не латиница):
 *   1) официальные русские названия 96 товарных групп ТН ВЭД ЕАЭС —
 *      подлинные названия, не перевод (см. loadRuGroups), самый надёжный
 *      уровень, проверяется первым;
 *   2) локальный словарь (~459 терминов) — мгновенно, без сети;
 *   3) если ни группа, ни словарь не дали совпадений — живой перевод
 *      (см. liveTranslateRuToEn) как запасной вариант; при неудаче
 *      возвращается пустой список с понятным указанием причины через
 *      поле `translationUnavailable`.
 *
 * @returns {Promise<{results: Array<{code, description, section}>, source: 'code'|'official-ru-group'|'dictionary'|'live-translate'|'direct', translationUnavailable?: boolean}>}
 */
export async function searchHsCodes(query) {
  const q = normalize(query);
  if (q.length < 2) return { results: [], source: 'direct' };

  const hsCodesRaw = await loadDataset();

  // Прямой поиск по коду (цифры)
  if (/^\d+$/.test(q)) {
    return { results: hsCodesRaw.filter(r => r.code.startsWith(q)).slice(0, 20), source: 'code' };
  }

  // Кириллица в запросе? Если нет — ищем напрямую (английский термин)
  const hasCyrillic = /[а-яё]/i.test(q);

  if (!hasCyrillic) {
    const direct = matchByTerms(hsCodesRaw, [q]);
    return { results: direct.slice(0, 20), source: 'direct' };
  }

  // Русский запрос — сначала проверяем официальные названия групп ТН ВЭД
  // (96 групп, подлинные русские названия из ЕАЭС-классификатора, не
  // перевод) — это самый надёжный уровень, проверяется раньше словаря.
  const ruGroups = await loadRuGroups();
  const matchedGroupCodes = Object.entries(ruGroups)
    .filter(([, name]) => normalize(name).includes(q))
    .map(([code]) => code);

  if (matchedGroupCodes.length > 0) {
    const groupMatches = hsCodesRaw.filter(r => matchedGroupCodes.includes(r.code.slice(0, 2)));
    if (groupMatches.length > 0) {
      return { results: groupMatches.slice(0, 20), source: 'official-ru-group' };
    }
  }

  // Официальная группа не совпала — пробуем словарь
  const dictTerms = [];
  for (const [ru, en] of Object.entries(RU_EN_TERMS)) {
    if (q.includes(ru)) dictTerms.push(...en.split(' '));
  }

  if (dictTerms.length > 0) {
    const matches = matchByTerms(hsCodesRaw, dictTerms);
    if (matches.length > 0) {
      return { results: matches.slice(0, 20), source: 'dictionary' };
    }
  }

  // Словарь не помог — пробуем живой перевод
  const translated = await liveTranslateRuToEn(q);
  if (!translated) {
    return { results: [], source: 'live-translate', translationUnavailable: true };
  }

  const liveMatches = matchByTerms(hsCodesRaw, translated.split(/\s+/));
  return { results: liveMatches.slice(0, 20), source: 'live-translate', translatedQuery: translated };
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
