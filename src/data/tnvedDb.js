// База ТН ВЭД ЕАЭС — 10-значные коды
// desc: билингвальные (рус + eng) — необходимо для двухэтапного AI-фильтра
// Источник: ТН ВЭД ЕАЭС (Решение Совета ЕЭК № 54 от 16.07.2012 с изм.)

const TNVED_DB = [
  // ─── КРЕПЁЖ 7318 — БОЛТЫ (разделены по типу и материалу) ───────────────────
  { code: '7318110009', desc: 'шуруп по дереву глухарь шестигранная головка wood screw coach screw lag screw carbon steel' },
  { code: '7318120009', desc: 'саморез универсальный по металлу прессшайба острый self-tapping screw tek screw carbon steel' },
  { code: '7318140009', desc: 'саморез по металлу нержавеющий а2 self-tapping screw stainless steel A2 A4' },
  { code: '7318151001', desc: 'болт шестигранный нержавеющий а2 а4 с полной резьбой hex bolt stainless steel A2 A4 threaded' },
  { code: '7318158201', desc: 'болт шестигранный нержавеющий а2 нержавейка hex bolt stainless steel A2 corrosion-resistant fully threaded' },
  { code: '7318159000', desc: 'болт шестигранный стальной оцинкованный чёрный hex bolt carbon steel zinc black threaded fastener' },
  { code: '7318149900', desc: 'шпилька резьбовая штифт анкерный стержень threaded rod stud pin carbon steel' },

  // ─── КРЕПЁЖ 7318 — ГАЙКИ ────────────────────────────────────────────────────
  { code: '7318160000', desc: 'гайка шестигранная стальная оцинкованная hex nut carbon steel zinc threaded' },
  { code: '7318161000', desc: 'гайка шестигранная нержавеющая а2 hex nut stainless steel A2 A4' },
  { code: '7318163000', desc: 'гайка самоконтрящаяся корончатая lock nut nyloc nut flanged nut' },
  { code: '7318164000', desc: 'гайка шестигранная высокая hex coupling nut high nut' },

  // ─── КРЕПЁЖ 7318 — ШАЙБЫ ────────────────────────────────────────────────────
  { code: '7318210000', desc: 'шайба пружинная гровер пружинная разрезная spring washer lock washer split washer helical' },
  { code: '7318220009', desc: 'шайба плоская стальная оцинкованная plain washer flat washer carbon steel zinc' },
  { code: '7318229000', desc: 'шайба плоская нержавеющая а2 plain washer flat washer stainless steel A2 A4' },

  // ─── КРЕПЁЖ 7318 — АНКЕРЫ / ПРОЧИЙ ─────────────────────────────────────────
  { code: '7318290000', desc: 'анкер распорный химический болт-анкер expansion anchor chemical anchor anchor bolt' },
  { code: '7317000000', desc: 'гвоздь строительный стальной nail construction nail brad nail steel' },

  // ─── МЕТАЛЛЫ ПРОКАТ ─────────────────────────────────────────────────────────
  { code: '7214200000', desc: 'арматура рифлёная стержень rebar deformed reinforcing bar hot-rolled' },
  { code: '7213100000', desc: 'катанка арматурная wire rod rebar coil' },
  { code: '7216100000', desc: 'уголок стальной angle bar L-profile steel' },
  { code: '7216310000', desc: 'швеллер стальной channel bar C-section steel' },
  { code: '7216330000', desc: 'двутавр балка I-beam H-beam steel' },
  { code: '7208370000', desc: 'лист стальной горячекатаный steel sheet hot-rolled plate' },
  { code: '7210300000', desc: 'лист оцинкованный с покрытием galvanized steel sheet coated' },
  { code: '7219310000', desc: 'лист нержавеющий холоднокатаный stainless steel sheet cold-rolled' },

  // ─── ТРУБЫ ───────────────────────────────────────────────────────────────────
  { code: '7304310000', desc: 'труба стальная бесшовная seamless steel pipe tube' },
  { code: '7306300000', desc: 'труба стальная сварная электросварная welded steel pipe tube' },
  { code: '7306610000', desc: 'труба профильная прямоугольная квадратная rectangular square hollow section' },
  { code: '7307931100', desc: 'отвод угольник стальной под сварку elbow carbon steel butt-weld' },
  { code: '7307931900', desc: 'тройник стальной под сварку tee carbon steel butt-weld' },
  { code: '7307990000', desc: 'фланец фитинг стальной flange steel pipe fitting' },
  { code: '7412200000', desc: 'фитинг медный латунный copper brass fitting' },

  // ─── ИНСТРУМЕНТ РУЧНОЙ ───────────────────────────────────────────────────────
  { code: '8201300000', desc: 'лопата совковая штыковая shovel spade hand tool manual' },
  { code: '8201400000', desc: 'мотыга тяпка кирка hoe pick axe hand tool' },
  { code: '8201600000', desc: 'ножницы по металлу ручные metal shears hand tool' },
  { code: '8203100000', desc: 'напильник надфиль file rasp hand tool' },
  { code: '8203200000', desc: 'плоскогубцы пассатижи бокорезы pliers side cutter hand tool' },
  { code: '8204110000', desc: 'ключ гаечный рожковый накидной wrench spanner open-end hand tool manual' },
  { code: '8204120000', desc: 'ключ разводной трубный adjustable wrench pipe wrench' },
  { code: '8205200000', desc: 'молоток слесарный кувалда hammer sledgehammer' },
  { code: '8205400000', desc: 'отвёртка крестовая шлицевая screwdriver Phillips flathead' },
  { code: '8205510000', desc: 'зубило долото chisel punch hand tool' },
  { code: '8205591000', desc: 'шпатель штукатурный скребок putty knife scraper trowel' },
  { code: '8205598099', desc: 'пистолет для герметика монтажный степлер caulking gun manual staple gun hand tool' },
  { code: '8205900000', desc: 'набор инструментов ручной tool set kit' },
  { code: '8211930000', desc: 'нож строительный монтажный utility knife box cutter' },
  { code: '9017209000', desc: 'рулетка измерительная tape measure' },

  // ─── ЭЛЕКТРОИНСТРУМЕНТ ───────────────────────────────────────────────────────
  { code: '8467111000', desc: 'дрель электрическая перфоратор electric drill rotary hammer power tool' },
  { code: '8467191000', desc: 'болгарка шлифмашина угловая angle grinder electric power tool' },
  { code: '8467223000', desc: 'пила дисковая циркулярная circular saw electric power tool' },
  { code: '8467810000', desc: 'цепная пила электрическая chain saw electric power tool' },
  { code: '8467890000', desc: 'шуруповёрт электрический аккумуляторный cordless drill driver electric' },
  { code: '8414802200', desc: 'компрессор поршневой воздушный air compressor piston' },
  { code: '8415100000', desc: 'кондиционер сплит-система air conditioner split system' },

  // ─── НАСАДКИ СВЁРЛА БИТЫ ─────────────────────────────────────────────────────
  { code: '8207130009', desc: 'бур sds plus max сверло по бетону кирпичу SDS-plus SDS-max rotary hammer drill bit concrete masonry' },
  { code: '8207190009', desc: 'сверло по металлу спиральное кобальтовое drill bit HSS cobalt twist metal' },
  { code: '8207600000', desc: 'фреза торцевая концевая end mill milling cutter' },
  { code: '8207903000', desc: 'бита насадка для шуруповёрта крестовая screwdriver bit Phillips hex insert bit' },

  // ─── АБРАЗИВЫ ────────────────────────────────────────────────────────────────
  { code: '6804221800', desc: 'диск отрезной шлифовальный абразивный cutting disc grinding wheel bonded' },
  { code: '6804291000', desc: 'диск алмазный отрезной diamond cutting disc blade' },
  { code: '6805100000', desc: 'шкурка наждачная абразивная sandpaper abrasive cloth sheet' },

  // ─── СРЕДСТВА ЗАЩИТЫ СИЗ ─────────────────────────────────────────────────────
  { code: '4203210000', desc: 'краги сварщика кожаные рукавицы кожаные leather protective gloves welding gauntlet' },
  { code: '6116102000', desc: 'перчатки трикотажные рабочие с ПВХ нитрил knitted work gloves PVC nitrile coated' },
  { code: '6116109400', desc: 'перчатки резиновые прорезиненные rubber latex gloves' },
  { code: '6116920000', desc: 'перчатки трикотажные хлопковые х/б jersey cotton work gloves' },
  { code: '6211330000', desc: 'комбинезон рабочий спецодежда coverall workwear protective clothing' },
  { code: '6506101000', desc: 'каска строительная защитная hard hat safety helmet' },
  { code: '9004909000', desc: 'очки защитные строительные safety goggles glasses protective' },

  // ─── СТРОПЫ ТАКЕЛАЖ ──────────────────────────────────────────────────────────
  { code: '6307909800', desc: 'строп текстильный петлевой ленточный textile sling lifting strap synthetic webbing' },
  { code: '7326200000', desc: 'строп цепной крюк карабин chain sling hook shackle steel' },
  { code: '7312100000', desc: 'трос стальной канат steel wire rope cable' },

  // ─── ПЛЁНКИ ──────────────────────────────────────────────────────────────────
  { code: '3920102800', desc: 'плёнка полиэтиленовая тонкая до 0.125мм polyethylene PE film thin <= 0.125mm' },
  { code: '3920102500', desc: 'плёнка полиэтиленовая толстая более 0.125мм polyethylene PE film thick > 0.125mm' },
  { code: '3921130000', desc: 'пенофол пенополиэтилен вспененный foamed polyethylene insulation' },

  // ─── СТЕКЛОСЕТКА ─────────────────────────────────────────────────────────────
  { code: '7019690000', desc: 'серпянка стеклосетка шириной более 30 см fiberglass mesh serpyanka woven > 30cm' },
  { code: '7019610000', desc: 'серпянка лента стеклосетка узкая до 30 см fiberglass mesh tape narrow <= 30cm' },

  // ─── ИЗОЛЯЦИЯ МЕМБРАНЫ ───────────────────────────────────────────────────────
  { code: '5603129000', desc: 'мембрана гидроизоляционная нетканая геотекстиль waterproof membrane geotextile nonwoven' },
  { code: '6807100000', desc: 'рубероид гидроизоляция рулон bitumen roofing felt roll' },
  { code: '3921190000', desc: 'пеноплекс пенополистирол экструзионный XPS extruded polystyrene foam insulation' },
  { code: '6806100000', desc: 'вата минеральная базальтовая стекловата mineral wool rockwool insulation' },

  // ─── СКОТЧ ЛЕНТА ─────────────────────────────────────────────────────────────
  { code: '3919108000', desc: 'скотч упаковочный клейкий прозрачный adhesive tape packing tape transparent' },
  { code: '7607209000', desc: 'скотч алюминиевый фольгированный aluminium foil tape self-adhesive' },

  // ─── ХИМИЯ ГЕРМЕТИКИ ─────────────────────────────────────────────────────────
  { code: '3214100000', desc: 'герметик силиконовый санитарный строительный silicone sealant construction glazing sealant' },
  { code: '3214901000', desc: 'шпаклёвка финишная базовая finishing putty wall filler gypsum' },
  { code: '3506910000', desc: 'клей строительный монтажный adhesive construction glue bonding agent' },
  { code: '3403191000', desc: 'смазка спрей WD-40 аэрозоль penetrating oil spray lubricant' },

  // ─── ЭЛЕКТРИКА ───────────────────────────────────────────────────────────────
  { code: '8544421900', desc: 'кабель ВВГ медный силовой electric cable copper VVG power cable insulated' },
  { code: '8544491900', desc: 'провод электрический многожильный copper wire stranded insulated' },
  { code: '8535210000', desc: 'автоматический выключатель АВ circuit breaker MCB' },
  { code: '8536610000', desc: 'лампа светодиодная LED LED lamp bulb' },

  // ─── КРАСКИ ──────────────────────────────────────────────────────────────────
  { code: '3209100000', desc: 'краска водоэмульсионная акриловая водно-дисперсионная acrylic paint water-based emulsion' },
  { code: '3208100000', desc: 'эмаль алкидная масляная alkyd enamel oil paint' },
  { code: '3210000000', desc: 'грунтовка строительная primer coat undercoat' },

  // ─── МАЛЯРНЫЙ ИНСТРУМЕНТ ─────────────────────────────────────────────────────
  { code: '9603409000', desc: 'валик малярный кисть roller paint roller brush decorator' },

  // ─── СЫПУЧИЕ ─────────────────────────────────────────────────────────────────
  { code: '2505100000', desc: 'песок кварцевый природный quartz sand natural' },
  { code: '2517100000', desc: 'щебень гравий crushed stone gravel aggregate' },
  { code: '2523290000', desc: 'цемент серый портландцемент grey cement portland cement' },

  // ─── ТРУБЫ ПЛАСТИКОВЫЕ ───────────────────────────────────────────────────────
  { code: '3917230000', desc: 'труба канализационная ПВХ серая PVC drainage pipe sewer grey' },
  { code: '3917210000', desc: 'труба водопроводная полипропиленовая PP polypropylene water pipe' },

  // ─── ЗАМКИ ПЕТЛИ ─────────────────────────────────────────────────────────────
  { code: '8301400000', desc: 'замок навесной врезной padlock door lock' },
  { code: '8302100000', desc: 'петля дверная оконная door hinge window hinge' },

  // ─── НИВЕЛИРЫ ────────────────────────────────────────────────────────────────
  { code: '9015800000', desc: 'нивелир лазерный уровень строительный laser level rotary laser surveying instrument' },

  // ─── УПАКОВКА ────────────────────────────────────────────────────────────────
  { code: '4819100000', desc: 'коробка картонная гофрированная cardboard box corrugated' },
  { code: '6305320000', desc: 'мешок полипропиленовый тканый woven polypropylene bag sack' },

  // ─── ПРОЧЕЕ ──────────────────────────────────────────────────────────────────
  { code: '8716800000', desc: 'тележка ручная складская gripping hand truck trolley cart' },
  { code: '7326909800', desc: 'крюк стальной карабин монтажный steel hook carabiner clip' },
  { code: '6307200000', desc: 'строп страховочный пояс safety sling harness' },
];

export default TNVED_DB;
