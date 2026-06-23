// База ТН ВЭД ЕАЭС
// noun_en и material_en — авто-разметка через scripts/labelTnvedDb.mjs (не вручную)
// Для добавления новых товаров: добавь строку без noun_en, запусти скрипт.
const TNVED_DB = [
  // ── БОЛТЫ ────────────────────────────────────────────────────────────────
  { code: '7318110009', noun_en: 'screw',     material_en: 'carbon_steel',
    desc: 'шуруп по дереву глухарь',
    en:   'wood screw coach screw lag screw carbon steel' },
  { code: '7318120009', noun_en: 'screw',     material_en: 'carbon_steel',
    desc: 'саморез по металлу прессшайба',
    en:   'self-tapping screw tek screw carbon steel' },
  { code: '7318140009', noun_en: 'screw',     material_en: 'stainless_steel',
    desc: 'саморез нержавеющий а2 а4',
    en:   'self-tapping screw stainless steel A2 A4' },
  { code: '7318151001', noun_en: 'bolt',      material_en: 'stainless_steel',
    desc: 'болт шестигранный нержавеющий а2 а4 с полной резьбой',
    en:   'hex bolt fully threaded stainless steel A2 A4' },
  { code: '7318158201', noun_en: 'bolt',      material_en: 'stainless_steel',
    desc: 'болт шестигранный нержавейка а2',
    en:   'hex bolt stainless steel A2 corrosion resistant' },
  { code: '7318159000', noun_en: 'bolt',      material_en: 'carbon_steel',
    desc: 'болт шестигранный стальной оцинкованный',
    en:   'hex bolt carbon steel zinc black' },
  { code: '7318149900', noun_en: 'stud',      material_en: 'carbon_steel',
    desc: 'шпилька резьбовая стержень',
    en:   'threaded rod stud carbon steel' },

  // ── ГАЙКИ ────────────────────────────────────────────────────────────────
  { code: '7318160000', noun_en: 'nut',       material_en: 'carbon_steel',
    desc: 'гайка шестигранная стальная оцинкованная',
    en:   'hex nut carbon steel zinc galvanized' },
  { code: '7318161000', noun_en: 'nut',       material_en: 'stainless_steel',
    desc: 'гайка шестигранная нержавеющая а2 а4',
    en:   'hex nut stainless steel A2 A4' },
  { code: '7318163000', noun_en: 'nut',       material_en: 'carbon_steel',
    desc: 'гайка самоконтрящаяся корончатая нилок',
    en:   'lock nut nyloc nut flanged nut' },
  { code: '7318164000', noun_en: 'nut',       material_en: 'carbon_steel',
    desc: 'гайка высокая удлинённая муфтовая',
    en:   'coupling nut high nut sleeve nut' },

  // ── ШАЙБЫ ────────────────────────────────────────────────────────────────
  { code: '7318210000', noun_en: 'washer',    material_en: 'carbon_steel',
    desc: 'шайба пружинная гровер разрезная',
    en:   'spring washer lock washer split washer helical Grover' },
  { code: '7318220009', noun_en: 'washer',    material_en: 'carbon_steel',
    desc: 'шайба плоская стальная оцинкованная',
    en:   'plain washer flat washer carbon steel zinc' },
  { code: '7318229000', noun_en: 'washer',    material_en: 'stainless_steel',
    desc: 'шайба плоская нержавеющая а2 а4',
    en:   'plain washer flat washer stainless steel A2 A4' },

  // ── АНКЕРЫ / ГВОЗДИ ──────────────────────────────────────────────────────
  { code: '7318290000', noun_en: 'anchor',    material_en: 'carbon_steel',
    desc: 'анкер распорный химический дюбель',
    en:   'expansion anchor chemical anchor anchor bolt' },
  { code: '7317000000', noun_en: 'nail',      material_en: 'carbon_steel',
    desc: 'гвоздь строительный стальной',
    en:   'nail construction brad nail steel' },

  // ── СВЁРЛА / БУРЫ ────────────────────────────────────────────────────────
  { code: '8207130009', noun_en: 'drill bit', material_en: 'other',
    desc: 'бур sds-plus sds-max по бетону кирпичу',
    en:   'SDS-plus SDS-max rotary hammer drill bit concrete masonry' },
  { code: '8207190009', noun_en: 'drill bit', material_en: 'other',
    desc: 'сверло по металлу кобальтовое спиральное',
    en:   'HSS cobalt twist drill bit metal' },
  { code: '8207903000', noun_en: 'bit',       material_en: 'other',
    desc: 'бита насадка для шуруповёрта крестовая шестигранная',
    en:   'screwdriver bit Phillips hex insert bit' },

  // ── МЕТАЛЛЫ ПРОКАТ ───────────────────────────────────────────────────────
  { code: '7214200000', noun_en: 'rebar',     material_en: 'carbon_steel',
    desc: 'арматура рифлёная горячекатаная',
    en:   'rebar deformed reinforcing bar hot rolled' },
  { code: '7213100000', noun_en: 'wire rod',  material_en: 'carbon_steel',
    desc: 'катанка арматурная',
    en:   'wire rod rebar coil' },
  { code: '7216100000', noun_en: 'angle bar', material_en: 'carbon_steel',
    desc: 'уголок стальной швеллер балка',
    en:   'angle bar channel bar L-profile steel' },
  { code: '7210300000', noun_en: 'sheet',     material_en: 'carbon_steel',
    desc: 'лист стальной оцинкованный с покрытием',
    en:   'galvanized steel sheet coated' },
  { code: '7219310000', noun_en: 'sheet',     material_en: 'stainless_steel',
    desc: 'лист нержавеющий холоднокатаный',
    en:   'stainless steel sheet cold rolled' },

  // ── ТРУБЫ ────────────────────────────────────────────────────────────────
  { code: '7304310000', noun_en: 'pipe',      material_en: 'carbon_steel',
    desc: 'труба стальная бесшовная',
    en:   'seamless steel pipe tube' },
  { code: '7306300000', noun_en: 'pipe',      material_en: 'carbon_steel',
    desc: 'труба стальная сварная электросварная',
    en:   'welded steel pipe tube' },
  { code: '3917230000', noun_en: 'pipe',      material_en: 'plastic',
    desc: 'труба канализационная пвх серая',
    en:   'PVC drainage pipe sewer grey' },
  { code: '3917210000', noun_en: 'pipe',      material_en: 'plastic',
    desc: 'труба водопроводная полипропиленовая',
    en:   'polypropylene PP water pipe' },

  // ── СТРОПЫ ───────────────────────────────────────────────────────────────
  { code: '6307909800', noun_en: 'sling',     material_en: 'textile',
    desc: 'строп текстильный петлевой ленточный',
    en:   'textile sling lifting strap synthetic webbing' },
  { code: '7326200000', noun_en: 'sling',     material_en: 'carbon_steel',
    desc: 'строп цепной крюк карабин',
    en:   'chain sling hook shackle steel' },
  { code: '7312100000', noun_en: 'wire rope', material_en: 'carbon_steel',
    desc: 'трос стальной канат',
    en:   'steel wire rope cable' },

  // ── ПЛЁНКИ ───────────────────────────────────────────────────────────────
  { code: '3920102800', noun_en: 'film',      material_en: 'plastic',
    desc: 'плёнка полиэтиленовая тонкая до 0.125мм',
    en:   'polyethylene PE film thin <= 0.125mm' },
  { code: '3920102500', noun_en: 'film',      material_en: 'plastic',
    desc: 'плёнка полиэтиленовая толстая более 0.125мм',
    en:   'polyethylene PE film thick > 0.125mm' },
  { code: '3921130000', noun_en: 'insulation', material_en: 'plastic',
    desc: 'пенофол пенополиэтилен вспененный',
    en:   'foamed polyethylene insulation' },

  // ── СЕТКА СЕРПЯНКА ───────────────────────────────────────────────────────
  { code: '7019690000', noun_en: 'fiberglass mesh', material_en: 'other',
    desc: 'серпянка стеклосетка рулон более 30см',
    en:   'fiberglass mesh serpyanka woven > 30cm' },
  { code: '7019610000', noun_en: 'fiberglass mesh', material_en: 'other',
    desc: 'серпянка лента стеклосетка до 30см',
    en:   'fiberglass mesh tape narrow <= 30cm' },

  // ── ПЕРЧАТКИ ─────────────────────────────────────────────────────────────
  { code: '4203210000', noun_en: 'glove',     material_en: 'leather',
    desc: 'краги сварщика кожаные рукавицы защитные',
    en:   'leather protective gloves welding gauntlet' },
  { code: '6116920000', noun_en: 'glove',     material_en: 'textile',
    desc: 'перчатки трикотажные хлопковые рабочие',
    en:   'knitted cotton work gloves jersey' },
  { code: '6116102000', noun_en: 'glove',     material_en: 'rubber',
    desc: 'перчатки с нитриловым пвх покрытием',
    en:   'knitted gloves nitrile PVC coated work' },

  // ── НИВЕЛИРЫ ─────────────────────────────────────────────────────────────
  { code: '9015800000', noun_en: 'laser level', material_en: 'other',
    desc: 'нивелир лазерный уровень строительный',
    en:   'laser level rotary laser line level surveying' },

  // ── КАБЕЛЬ ───────────────────────────────────────────────────────────────
  { code: '8544421900', noun_en: 'cable',     material_en: 'other',
    desc: 'кабель ввг медный силовой провод',
    en:   'electric cable copper VVG power insulated' },
  { code: '8544491900', noun_en: 'wire',      material_en: 'other',
    desc: 'провод электрический многожильный',
    en:   'copper wire stranded insulated low voltage' },

  // ── ЭЛЕКТРОИНСТРУМЕНТ ────────────────────────────────────────────────────
  { code: '8467111000', noun_en: 'drill',     material_en: 'other',
    desc: 'дрель электрическая перфоратор',
    en:   'electric drill rotary hammer power tool' },
  { code: '8467191000', noun_en: 'angle grinder', material_en: 'other',
    desc: 'болгарка угловая шлифмашина',
    en:   'angle grinder electric power tool' },
  { code: '8467890000', noun_en: 'drill driver', material_en: 'other',
    desc: 'шуруповёрт аккумуляторный электрический',
    en:   'cordless drill driver electric' },

  // ── РУЧНОЙ ИНСТРУМЕНТ ────────────────────────────────────────────────────
  { code: '8204110000', noun_en: 'wrench',    material_en: 'carbon_steel',
    desc: 'ключ гаечный рожковый накидной',
    en:   'wrench spanner open-end hand tool manual' },
  { code: '8205200000', noun_en: 'hammer',    material_en: 'carbon_steel',
    desc: 'молоток слесарный кувалда',
    en:   'hammer sledgehammer hand tool' },
  { code: '8205400000', noun_en: 'screwdriver', material_en: 'other',
    desc: 'отвёртка крестовая шлицевая',
    en:   'screwdriver Phillips flathead hand tool' },
  { code: '8205591000', noun_en: 'putty knife', material_en: 'carbon_steel',
    desc: 'шпатель штукатурный скребок',
    en:   'putty knife scraper trowel hand tool' },
  { code: '8205598099', noun_en: 'caulking gun', material_en: 'other',
    desc: 'пистолет для герметика монтажный степлер',
    en:   'caulking gun manual staple gun hand tool' },

  // ── ГЕРМЕТИКИ ────────────────────────────────────────────────────────────
  { code: '3214100000', noun_en: 'sealant',   material_en: 'other',
    desc: 'герметик силиконовый санитарный строительный',
    en:   'silicone sealant construction glazing sealant' },
  { code: '3214901000', noun_en: 'filler',    material_en: 'mineral',
    desc: 'шпаклёвка финишная базовая',
    en:   'finishing putty wall filler gypsum' },

  // ── АБРАЗИВЫ ─────────────────────────────────────────────────────────────
  { code: '6804221800', noun_en: 'cutting disc', material_en: 'other',
    desc: 'диск отрезной шлифовальный абразивный',
    en:   'cutting disc grinding wheel bonded abrasive' },
  { code: '6804291000', noun_en: 'diamond disc', material_en: 'other',
    desc: 'диск алмазный отрезной',
    en:   'diamond cutting disc blade' },

  // ── ИЗОЛЯЦИЯ ─────────────────────────────────────────────────────────────
  { code: '3921190000', noun_en: 'insulation board', material_en: 'plastic',
    desc: 'пеноплекс пенополистирол экструзионный утеплитель',
    en:   'XPS extruded polystyrene insulation board' },
  { code: '6806100000', noun_en: 'mineral wool', material_en: 'mineral',
    desc: 'вата минеральная базальтовая стекловата',
    en:   'mineral wool rockwool insulation' },

  // ── КРАСКИ ───────────────────────────────────────────────────────────────
  { code: '3209100000', noun_en: 'paint',     material_en: 'other',
    desc: 'краска водоэмульсионная акриловая',
    en:   'acrylic paint water-based emulsion' },
  { code: '3210000000', noun_en: 'primer',    material_en: 'other',
    desc: 'грунтовка строительная',
    en:   'primer coat undercoat' },

  // ── СЫПУЧИЕ ──────────────────────────────────────────────────────────────
  { code: '2523290000', noun_en: 'cement',    material_en: 'mineral',
    desc: 'цемент серый портландцемент',
    en:   'grey cement portland cement' },
  { code: '2517100000', noun_en: 'aggregate', material_en: 'mineral',
    desc: 'щебень гравий',
    en:   'crushed stone gravel aggregate' },

  // ── ЛЕНТА СКОТЧ ──────────────────────────────────────────────────────────
  { code: '3919108000', noun_en: 'adhesive tape', material_en: 'plastic',
    desc: 'скотч упаковочный клейкий прозрачный',
    en:   'adhesive tape packing tape transparent' },
  { code: '7607209000', noun_en: 'aluminium tape', material_en: 'other',
    desc: 'скотч алюминиевый фольгированный',
    en:   'aluminium foil tape self-adhesive' },

  // ── ЗАМКИ / ПЕТЛИ ────────────────────────────────────────────────────────
  { code: '8301400000', noun_en: 'lock',      material_en: 'other',
    desc: 'замок навесной врезной',
    en:   'padlock door lock' },
  { code: '8302100000', noun_en: 'hinge',     material_en: 'carbon_steel',
    desc: 'петля дверная оконная',
    en:   'door hinge window hinge' },

  // ── МЕМБРАНЫ РУБЕРОИД ────────────────────────────────────────────────────
  { code: '5603129000', noun_en: 'membrane',  material_en: 'textile',
    desc: 'мембрана гидроизоляционная нетканая геотекстиль',
    en:   'waterproof membrane geotextile nonwoven' },
  { code: '6807100000', noun_en: 'roofing felt', material_en: 'other',
    desc: 'рубероид гидроизоляция рулон',
    en:   'bitumen roofing felt roll' },
];

export default TNVED_DB;
