// База ТН ВЭД ЕАЭС — билингвальная + поле type/stainless для жёсткого фильтра
const TNVED_DB = [
  // ── БОЛТЫ ────────────────────────────────────────────────────────────────
  { code: '7318110009', type: 'screw',   stainless: false,
    desc: 'шуруп по дереву глухарь',
    en:   'wood screw coach screw lag screw carbon steel' },
  { code: '7318120009', type: 'screw',   stainless: false,
    desc: 'саморез по металлу прессшайба',
    en:   'self-tapping screw tek screw carbon steel' },
  { code: '7318140009', type: 'screw',   stainless: true,
    desc: 'саморез нержавеющий а2 а4',
    en:   'self-tapping screw stainless steel A2 A4' },
  { code: '7318151001', type: 'bolt',    stainless: true,
    desc: 'болт шестигранный нержавеющий а2 а4 с полной резьбой',
    en:   'hex bolt fully threaded stainless steel A2 A4' },
  { code: '7318158201', type: 'bolt',    stainless: true,
    desc: 'болт шестигранный нержавейка а2',
    en:   'hex bolt stainless steel A2 corrosion resistant' },
  { code: '7318159000', type: 'bolt',    stainless: false,
    desc: 'болт шестигранный стальной оцинкованный',
    en:   'hex bolt carbon steel zinc black' },
  { code: '7318149900', type: 'bolt',    stainless: false,
    desc: 'шпилька резьбовая стержень',
    en:   'threaded rod stud carbon steel' },

  // ── ГАЙКИ ────────────────────────────────────────────────────────────────
  { code: '7318160000', type: 'nut',     stainless: false,
    desc: 'гайка шестигранная стальная оцинкованная',
    en:   'hex nut carbon steel zinc galvanized' },
  { code: '7318161000', type: 'nut',     stainless: true,
    desc: 'гайка шестигранная нержавеющая а2 а4',
    en:   'hex nut stainless steel A2 A4' },
  { code: '7318163000', type: 'nut',     stainless: false,
    desc: 'гайка самоконтрящаяся корончатая нилок',
    en:   'lock nut nyloc nut flanged nut' },
  { code: '7318164000', type: 'nut',     stainless: false,
    desc: 'гайка высокая удлинённая муфтовая',
    en:   'coupling nut high nut sleeve nut' },

  // ── ШАЙБЫ ────────────────────────────────────────────────────────────────
  { code: '7318210000', type: 'washer',  stainless: false,
    desc: 'шайба пружинная гровер разрезная',
    en:   'spring washer lock washer split washer helical Grover' },
  { code: '7318220009', type: 'washer',  stainless: false,
    desc: 'шайба плоская стальная оцинкованная',
    en:   'plain washer flat washer carbon steel zinc' },
  { code: '7318229000', type: 'washer',  stainless: true,
    desc: 'шайба плоская нержавеющая а2 а4',
    en:   'plain washer flat washer stainless steel A2 A4' },

  // ── АНКЕРЫ / ГВОЗДИ ──────────────────────────────────────────────────────
  { code: '7318290000', type: 'anchor',  stainless: false,
    desc: 'анкер распорный химический дюбель',
    en:   'expansion anchor chemical anchor anchor bolt' },
  { code: '7317000000', type: 'nail',    stainless: false,
    desc: 'гвоздь строительный стальной',
    en:   'nail construction brad nail steel' },

  // ── СВЁРЛА / БУРЫ ────────────────────────────────────────────────────────
  { code: '8207130009', type: 'drill_bit', stainless: false,
    desc: 'бур sds-plus sds-max по бетону кирпичу',
    en:   'SDS-plus SDS-max rotary hammer drill bit concrete masonry' },
  { code: '8207190009', type: 'drill_bit', stainless: false,
    desc: 'сверло по металлу кобальтовое спиральное',
    en:   'HSS cobalt twist drill bit metal' },
  { code: '8207903000', type: 'drill_bit', stainless: false,
    desc: 'бита насадка для шуруповёрта крестовая шестигранная',
    en:   'screwdriver bit Phillips hex insert bit' },

  // ── МЕТАЛЛЫ ПРОКАТ ───────────────────────────────────────────────────────
  { code: '7214200000', type: 'rebar',   stainless: false,
    desc: 'арматура рифлёная горячекатаная',
    en:   'rebar deformed reinforcing bar hot rolled' },
  { code: '7213100000', type: 'rebar',   stainless: false,
    desc: 'катанка арматурная',
    en:   'wire rod rebar coil' },
  { code: '7216100000', type: 'other',   stainless: false,
    desc: 'уголок стальной швеллер балка',
    en:   'angle bar channel bar L-profile steel' },
  { code: '7210300000', type: 'other',   stainless: false,
    desc: 'лист стальной оцинкованный с покрытием',
    en:   'galvanized steel sheet coated' },
  { code: '7219310000', type: 'other',   stainless: true,
    desc: 'лист нержавеющий холоднокатаный',
    en:   'stainless steel sheet cold rolled' },

  // ── ТРУБЫ ────────────────────────────────────────────────────────────────
  { code: '7304310000', type: 'other',   stainless: false,
    desc: 'труба стальная бесшовная',
    en:   'seamless steel pipe tube' },
  { code: '7306300000', type: 'other',   stainless: false,
    desc: 'труба стальная сварная электросварная',
    en:   'welded steel pipe tube' },
  { code: '3917230000', type: 'other',   stainless: false,
    desc: 'труба канализационная пвх серая',
    en:   'PVC drainage pipe sewer grey' },
  { code: '3917210000', type: 'other',   stainless: false,
    desc: 'труба водопроводная полипропиленовая',
    en:   'polypropylene PP water pipe' },

  // ── СТРОПЫ ───────────────────────────────────────────────────────────────
  { code: '6307909800', type: 'sling',   stainless: false,
    desc: 'строп текстильный петлевой ленточный',
    en:   'textile sling lifting strap synthetic webbing' },
  { code: '7326200000', type: 'sling',   stainless: false,
    desc: 'строп цепной крюк карабин',
    en:   'chain sling hook shackle steel' },
  { code: '7312100000', type: 'other',   stainless: false,
    desc: 'трос стальной канат',
    en:   'steel wire rope cable' },

  // ── ПЛЁНКИ ───────────────────────────────────────────────────────────────
  { code: '3920102800', type: 'film',    stainless: false,
    desc: 'плёнка полиэтиленовая тонкая до 0.125мм',
    en:   'polyethylene PE film thin <= 0.125mm' },
  { code: '3920102500', type: 'film',    stainless: false,
    desc: 'плёнка полиэтиленовая толстая более 0.125мм',
    en:   'polyethylene PE film thick > 0.125mm' },
  { code: '3921130000', type: 'other',   stainless: false,
    desc: 'пенофол пенополиэтилен вспененный',
    en:   'foamed polyethylene insulation' },

  // ── СЕРПЯНКА / СЕТКА ─────────────────────────────────────────────────────
  { code: '7019690000', type: 'mesh',    stainless: false,
    desc: 'серпянка стеклосетка рулон более 30см',
    en:   'fiberglass mesh serpyanka woven > 30cm' },
  { code: '7019610000', type: 'mesh',    stainless: false,
    desc: 'серпянка лента стеклосетка до 30см',
    en:   'fiberglass mesh tape narrow <= 30cm' },

  // ── ПЕРЧАТКИ ─────────────────────────────────────────────────────────────
  { code: '4203210000', type: 'glove',   stainless: false,
    desc: 'краги сварщика кожаные рукавицы защитные',
    en:   'leather protective gloves welding gauntlet' },
  { code: '6116920000', type: 'glove',   stainless: false,
    desc: 'перчатки трикотажные хлопковые рабочие',
    en:   'knitted cotton work gloves jersey' },
  { code: '6116102000', type: 'glove',   stainless: false,
    desc: 'перчатки с нитриловым пвх покрытием',
    en:   'knitted gloves nitrile PVC coated work' },

  // ── НИВЕЛИРЫ ─────────────────────────────────────────────────────────────
  { code: '9015800000', type: 'instrument', stainless: false,
    desc: 'нивелир лазерный уровень строительный',
    en:   'laser level rotary laser line level surveying' },

  // ── КАБЕЛЬ ───────────────────────────────────────────────────────────────
  { code: '8544421900', type: 'cable',   stainless: false,
    desc: 'кабель ввг медный силовой провод',
    en:   'electric cable copper VVG power insulated' },
  { code: '8544491900', type: 'cable',   stainless: false,
    desc: 'провод электрический многожильный',
    en:   'copper wire stranded insulated low voltage' },

  // ── ЭЛЕКТРОИНСТРУМЕНТ ────────────────────────────────────────────────────
  { code: '8467111000', type: 'tool_electric', stainless: false,
    desc: 'дрель электрическая перфоратор',
    en:   'electric drill rotary hammer power tool' },
  { code: '8467191000', type: 'tool_electric', stainless: false,
    desc: 'болгарка угловая шлифмашина',
    en:   'angle grinder electric power tool' },
  { code: '8467890000', type: 'tool_electric', stainless: false,
    desc: 'шуруповёрт аккумуляторный электрический',
    en:   'cordless drill driver electric' },

  // ── РУЧНОЙ ИНСТРУМЕНТ ────────────────────────────────────────────────────
  { code: '8204110000', type: 'tool_manual', stainless: false,
    desc: 'ключ гаечный рожковый накидной',
    en:   'wrench spanner open-end hand tool manual' },
  { code: '8205200000', type: 'tool_manual', stainless: false,
    desc: 'молоток слесарный кувалда',
    en:   'hammer sledgehammer hand tool' },
  { code: '8205400000', type: 'tool_manual', stainless: false,
    desc: 'отвёртка крестовая шлицевая',
    en:   'screwdriver Phillips flathead hand tool' },
  { code: '8205591000', type: 'tool_manual', stainless: false,
    desc: 'шпатель штукатурный скребок',
    en:   'putty knife scraper trowel' },
  { code: '8205598099', type: 'tool_manual', stainless: false,
    desc: 'пистолет для герметика монтажный степлер',
    en:   'caulking gun manual staple gun hand tool' },

  // ── ГЕРМЕТИКИ ────────────────────────────────────────────────────────────
  { code: '3214100000', type: 'sealant', stainless: false,
    desc: 'герметик силиконовый санитарный строительный',
    en:   'silicone sealant construction glazing sealant' },
  { code: '3214901000', type: 'sealant', stainless: false,
    desc: 'шпаклёвка финишная базовая',
    en:   'finishing putty wall filler gypsum' },

  // ── АБРАЗИВЫ ─────────────────────────────────────────────────────────────
  { code: '6804221800', type: 'other',   stainless: false,
    desc: 'диск отрезной шлифовальный абразивный',
    en:   'cutting disc grinding wheel bonded abrasive' },
  { code: '6804291000', type: 'other',   stainless: false,
    desc: 'диск алмазный отрезной',
    en:   'diamond cutting disc blade' },

  // ── ИЗОЛЯЦИЯ ─────────────────────────────────────────────────────────────
  { code: '3921190000', type: 'other',   stainless: false,
    desc: 'пеноплекс пенополистирол экструзионный утеплитель',
    en:   'XPS extruded polystyrene foam insulation' },
  { code: '6806100000', type: 'other',   stainless: false,
    desc: 'вата минеральная базальтовая стекловата',
    en:   'mineral wool rockwool insulation' },

  // ── КРАСКИ ───────────────────────────────────────────────────────────────
  { code: '3209100000', type: 'other',   stainless: false,
    desc: 'краска водоэмульсионная акриловая',
    en:   'acrylic paint water-based emulsion' },
  { code: '3210000000', type: 'other',   stainless: false,
    desc: 'грунтовка строительная',
    en:   'primer coat undercoat' },

  // ── СЫПУЧИЕ ──────────────────────────────────────────────────────────────
  { code: '2523290000', type: 'other',   stainless: false,
    desc: 'цемент серый портландцемент',
    en:   'grey cement portland cement' },
  { code: '2517100000', type: 'other',   stainless: false,
    desc: 'щебень гравий',
    en:   'crushed stone gravel aggregate' },

  // ── ЛЕНТА СКОТЧ ──────────────────────────────────────────────────────────
  { code: '3919108000', type: 'other',   stainless: false,
    desc: 'скотч упаковочный клейкий прозрачный',
    en:   'adhesive tape packing tape transparent' },
  { code: '7607209000', type: 'other',   stainless: false,
    desc: 'скотч алюминиевый фольгированный',
    en:   'aluminium foil tape self-adhesive' },

  // ── ЗАМКИ / ПЕТЛИ ────────────────────────────────────────────────────────
  { code: '8301400000', type: 'other',   stainless: false,
    desc: 'замок навесной врезной',
    en:   'padlock door lock' },
  { code: '8302100000', type: 'other',   stainless: false,
    desc: 'петля дверная оконная',
    en:   'door hinge window hinge' },
];

export default TNVED_DB;
