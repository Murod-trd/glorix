/**
 * Собственные SVG-иллюстрации товаров маркетплейса — закрывает аудит-пункт
 * 🟡#16. Раньше все 6 товаров использовали фото с images.unsplash.com,
 * который зависит от инфраструктуры Cloudflare/AWS — это создавало
 * реальный риск недоступности для пользователей из стран с ограничениями
 * доступа к этой инфраструктуре (Россия активно блокирует ресурсы,
 * использующие Cloudflare, см. docs/CHANGELOG.md запись про Google Fonts
 * для аналогичного обоснования по другому внешнему сервису).
 *
 * Это не фотографии — простые геометрические иллюстрации категории
 * товара в фирменных цветах платформы, не претендующие на фотореализм.
 * Полностью устраняют внешнюю зависимость: ничего не загружается из
 * интернета, иллюстрации — часть самого кода.
 */

const COLORS = {
  navy: '#0A0F1E',
  navy2: '#111827',
  navy3: '#1a2236',
  accent: '#00D4AA',
  gold: '#F5A623',
  blue: '#63B3ED',
};

function Wrapper({ children }) {
  return (
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect width="400" height="300" fill={COLORS.navy2} />
      {children}
    </svg>
  );
}

// Цемент — мешки, сложенные стопкой
function CementIllustration() {
  return (
    <Wrapper>
      {[0, 1, 2].map(i => (
        <rect key={i} x={120 - i * 6} y={210 - i * 38} width="160" height="34" rx="4"
          fill={i % 2 === 0 ? COLORS.navy3 : COLORS.blue} opacity={0.9 - i * 0.15} />
      ))}
      <text x="200" y="155" textAnchor="middle" fontSize="13" fill={COLORS.accent} fontFamily="monospace">M400</text>
    </Wrapper>
  );
}

// Хлопковая пряжа — катушки нити
function CottonYarnIllustration() {
  return (
    <Wrapper>
      {[140, 200, 260].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 14} y="90" width="28" height="120" rx="6" fill={COLORS.navy3} />
          {[0, 1, 2, 3, 4].map(j => (
            <ellipse key={j} cx={cx} cy={100 + j * 25} rx="20" ry="8" fill="none" stroke={COLORS.blue} strokeWidth="2" opacity={0.7} />
          ))}
        </g>
      ))}
    </Wrapper>
  );
}

// Подсолнечное масло — канистра/бочка
function SunflowerOilIllustration() {
  return (
    <Wrapper>
      <rect x="150" y="100" width="100" height="130" rx="8" fill={COLORS.navy3} />
      <rect x="170" y="80" width="60" height="24" rx="4" fill={COLORS.navy3} />
      <rect x="150" y="140" width="100" height="60" fill={COLORS.gold} opacity="0.85" />
      <circle cx="200" cy="170" r="22" fill="none" stroke={COLORS.navy2} strokeWidth="2" opacity="0.4" />
    </Wrapper>
  );
}

// Арматура — прутки, перекрёстный узор
function RebarIllustration() {
  return (
    <Wrapper>
      {[100, 140, 180, 220, 260, 300].map((x, i) => (
        <rect key={i} x={x - 4} y="60" width="8" height="190" fill={i % 2 === 0 ? COLORS.blue : COLORS.navy3} rx="2" />
      ))}
      {[100, 160, 220].map((y, i) => (
        <rect key={`h${i}`} x="90" y={y} width="220" height="6" fill={COLORS.accent} opacity="0.5" rx="2" />
      ))}
    </Wrapper>
  );
}

// Полиэтиленовая плёнка — рулон
function LdpeFilmIllustration() {
  return (
    <Wrapper>
      <ellipse cx="200" cy="150" rx="50" ry="90" fill="none" stroke={COLORS.blue} strokeWidth="3" />
      <ellipse cx="200" cy="150" rx="38" ry="78" fill="none" stroke={COLORS.blue} strokeWidth="2" opacity="0.5" />
      <ellipse cx="200" cy="150" rx="26" ry="66" fill="none" stroke={COLORS.blue} strokeWidth="2" opacity="0.3" />
      <rect x="195" y="60" width="10" height="180" fill={COLORS.navy3} rx="3" />
    </Wrapper>
  );
}

// Промышленный насос — корпус с трубами
function PumpIllustration() {
  return (
    <Wrapper>
      <circle cx="200" cy="160" r="55" fill={COLORS.navy3} />
      <circle cx="200" cy="160" r="55" fill="none" stroke={COLORS.accent} strokeWidth="3" opacity="0.6" />
      <rect x="100" y="148" width="70" height="24" rx="6" fill={COLORS.blue} opacity="0.85" />
      <rect x="230" y="148" width="70" height="24" rx="6" fill={COLORS.blue} opacity="0.85" />
      <circle cx="200" cy="160" r="20" fill={COLORS.gold} opacity="0.9" />
    </Wrapper>
  );
}

// === Расширение каталога (24-30 товаров, все 8 категорий) ===

// Агро
function WheatIllustration() {
  return (
    <Wrapper>
      {[140, 200, 260].map((x, i) => (
        <g key={i}>
          <rect x={x - 3} y="120" width="6" height="110" fill={COLORS.gold} opacity="0.7" />
          {[0, 1, 2, 3].map(j => (
            <ellipse key={j} cx={x + (j % 2 === 0 ? -10 : 10)} cy={130 + j * 18} rx="9" ry="14" fill={COLORS.gold} opacity="0.85" />
          ))}
        </g>
      ))}
    </Wrapper>
  );
}
function RiceIllustration() {
  return (
    <Wrapper>
      <ellipse cx="200" cy="190" rx="90" ry="30" fill={COLORS.navy3} />
      {Array.from({ length: 18 }).map((_, i) => (
        <ellipse key={i} cx={130 + (i % 9) * 18} cy={170 + Math.floor(i / 9) * 16} rx="6" ry="3" fill="#F0EAD6" opacity="0.9" />
      ))}
    </Wrapper>
  );
}
function SpicesIllustration() {
  return (
    <Wrapper>
      {[150, 200, 250].map((x, i) => (
        <g key={i}>
          <rect x={x - 16} y="120" width="32" height="90" rx="6" fill={COLORS.navy3} />
          <ellipse cx={x} cy="120" rx="16" ry="6" fill={[COLORS.gold, '#C0392B', COLORS.accent][i]} opacity="0.85" />
        </g>
      ))}
    </Wrapper>
  );
}

// Стройматериалы
function BrickIllustration() {
  return (
    <Wrapper>
      {[0, 1, 2].map(row => (
        <g key={row}>
          {[0, 1, 2, 3].map(col => (
            <rect key={col} x={110 + col * 50 + (row % 2 === 0 ? 0 : 25)} y={110 + row * 35} width="44" height="28" rx="2"
              fill={COLORS.gold} opacity={0.9 - row * 0.1} stroke={COLORS.navy} strokeWidth="2" />
          ))}
        </g>
      ))}
    </Wrapper>
  );
}
function MetalRoofIllustration() {
  return (
    <Wrapper>
      <polygon points="100,200 200,110 300,200" fill="none" stroke={COLORS.blue} strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <line key={i} x1={110 + i * 32} y1={195 - i * 4} x2={110 + i * 32 + 16} y2={130} stroke={COLORS.blue} strokeWidth="2" opacity="0.5" />
      ))}
    </Wrapper>
  );
}
function CeramicTileIllustration() {
  return (
    <Wrapper>
      {[0, 1, 2].map(row => (
        [0, 1, 2].map(col => (
          <rect key={`${row}-${col}`} x={110 + col * 64} y={90 + row * 64} width="58" height="58" rx="3"
            fill={COLORS.navy3} stroke={COLORS.accent} strokeWidth="1.5" opacity="0.9" />
        ))
      ))}
    </Wrapper>
  );
}

// Электроника
function LaptopIllustration() {
  return (
    <Wrapper>
      <rect x="130" y="100" width="140" height="90" rx="6" fill={COLORS.navy3} stroke={COLORS.blue} strokeWidth="2" />
      <rect x="140" y="108" width="120" height="74" fill={COLORS.navy} />
      <polygon points="110,200 290,200 270,215 130,215" fill={COLORS.navy3} />
    </Wrapper>
  );
}
function SmartphoneIllustration() {
  return (
    <Wrapper>
      <rect x="165" y="80" width="70" height="140" rx="10" fill={COLORS.navy3} stroke={COLORS.blue} strokeWidth="2" />
      <rect x="172" y="92" width="56" height="106" fill={COLORS.navy} />
      <circle cx="200" cy="206" r="5" fill={COLORS.blue} opacity="0.6" />
    </Wrapper>
  );
}
function CableIllustration() {
  return (
    <Wrapper>
      {[0, 1, 2].map(i => (
        <path key={i} d={`M100,${130 + i * 30} Q200,${100 + i * 30} 300,${130 + i * 30}`}
          fill="none" stroke={[COLORS.blue, COLORS.gold, COLORS.accent][i]} strokeWidth="6" opacity="0.85" />
      ))}
    </Wrapper>
  );
}
function PowerSupplyIllustration() {
  return (
    <Wrapper>
      <rect x="130" y="110" width="140" height="80" rx="6" fill={COLORS.navy3} />
      <rect x="145" y="125" width="50" height="14" rx="2" fill={COLORS.accent} opacity="0.7" />
      <circle cx="240" cy="150" r="14" fill="none" stroke={COLORS.blue} strokeWidth="3" />
    </Wrapper>
  );
}

// Химикаты
function PolypropyleneIllustration() {
  return (
    <Wrapper>
      {[150, 200, 250].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 18} y="110" width="36" height="100" rx="18" fill={COLORS.navy3} />
          <rect x={cx - 18} y="110" width="36" height="20" rx="8" fill={COLORS.accent} opacity="0.6" />
        </g>
      ))}
    </Wrapper>
  );
}
function PaintIllustration() {
  return (
    <Wrapper>
      <rect x="160" y="110" width="80" height="100" rx="8" fill={COLORS.navy3} />
      <rect x="150" y="95" width="100" height="20" rx="4" fill={COLORS.navy3} />
      <rect x="160" y="150" width="80" height="60" fill={COLORS.gold} opacity="0.8" />
    </Wrapper>
  );
}
function FertilizerIllustration() {
  return (
    <Wrapper>
      <rect x="140" y="120" width="120" height="90" rx="6" fill={COLORS.navy3} />
      {Array.from({ length: 30 }).map((_, i) => (
        <circle key={i} cx={150 + (i % 10) * 10} cy={130 + Math.floor(i / 10) * 22} r="3" fill={COLORS.accent} opacity="0.7" />
      ))}
    </Wrapper>
  );
}
function AcidIllustration() {
  return (
    <Wrapper>
      <path d="M180,90 L180,140 L155,200 Q155,215 170,215 L230,215 Q245,215 245,200 L220,140 L220,90 Z" fill="none" stroke={COLORS.gold} strokeWidth="3" />
      <rect x="170" y="160" width="60" height="45" fill={COLORS.gold} opacity="0.6" />
    </Wrapper>
  );
}

// Текстиль
function SilkFabricIllustration() {
  return (
    <Wrapper>
      {[0, 1, 2, 3].map(i => (
        <path key={i} d={`M90,${100 + i * 30} Q200,${85 + i * 30} 310,${100 + i * 30}`} fill="none"
          stroke={COLORS.gold} strokeWidth="3" opacity={0.8 - i * 0.1} />
      ))}
    </Wrapper>
  );
}
function ClothingIllustration() {
  return (
    <Wrapper>
      <path d="M160,100 L150,120 L165,135 L165,215 L235,215 L235,135 L250,120 L240,100 Q220,90 200,90 Q180,90 160,100 Z"
        fill={COLORS.navy3} stroke={COLORS.blue} strokeWidth="2" />
    </Wrapper>
  );
}
function SyntheticFabricIllustration() {
  return (
    <Wrapper>
      <rect x="120" y="100" width="160" height="110" fill="none" stroke={COLORS.blue} strokeWidth="2" />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`v${i}`} x1={120 + i * 20} y1="100" x2={120 + i * 20} y2="210" stroke={COLORS.blue} strokeWidth="1" opacity="0.4" />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`h${i}`} x1="120" y1={100 + i * 18} x2="280" y2={100 + i * 18} stroke={COLORS.blue} strokeWidth="1" opacity="0.4" />
      ))}
    </Wrapper>
  );
}

// Металлы
function SteelSheetIllustration() {
  return (
    <Wrapper>
      {[0, 1, 2].map(i => (
        <rect key={i} x={110 + i * 8} y={100 + i * 8} width="180" height="110" fill={COLORS.navy3}
          stroke={COLORS.blue} strokeWidth="2" opacity={1 - i * 0.2} />
      ))}
    </Wrapper>
  );
}
function AluminumProfileIllustration() {
  return (
    <Wrapper>
      {[140, 200, 260].map((x, i) => (
        <rect key={i} x={x - 12} y="80" width="24" height="140" rx="3" fill={COLORS.blue} opacity="0.85" />
      ))}
    </Wrapper>
  );
}
function CopperWireIllustration() {
  return (
    <Wrapper>
      <circle cx="200" cy="150" r="70" fill="none" stroke={COLORS.gold} strokeWidth="8" opacity="0.85" />
      <circle cx="200" cy="150" r="55" fill="none" stroke={COLORS.gold} strokeWidth="6" opacity="0.6" />
      <circle cx="200" cy="150" r="40" fill="none" stroke={COLORS.gold} strokeWidth="4" opacity="0.4" />
    </Wrapper>
  );
}

// Упаковка
function CardboardBoxIllustration() {
  return (
    <Wrapper>
      <polygon points="140,110 260,110 280,130 280,210 160,210 140,190" fill={COLORS.navy3} stroke={COLORS.gold} strokeWidth="2" />
      <line x1="140" y1="110" x2="160" y2="130" stroke={COLORS.gold} strokeWidth="2" opacity="0.6" />
      <line x1="160" y1="130" x2="280" y2="130" stroke={COLORS.gold} strokeWidth="2" opacity="0.6" />
      <line x1="160" y1="130" x2="160" y2="210" stroke={COLORS.gold} strokeWidth="2" opacity="0.6" />
    </Wrapper>
  );
}
function PetBottleIllustration() {
  return (
    <Wrapper>
      {[160, 200, 240].map((x, i) => (
        <g key={i}>
          <rect x={x - 14} y="100" width="28" height="110" rx="10" fill="none" stroke={COLORS.accent} strokeWidth="2" />
          <rect x={x - 8} y="85" width="16" height="18" rx="3" fill="none" stroke={COLORS.accent} strokeWidth="2" />
        </g>
      ))}
    </Wrapper>
  );
}
function PpBagIllustration() {
  return (
    <Wrapper>
      <polygon points="150,110 250,110 260,210 140,210" fill={COLORS.navy3} stroke={COLORS.blue} strokeWidth="2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={145 + i * 22} y1="110" x2={143 + i * 24} y2="210" stroke={COLORS.blue} strokeWidth="1" opacity="0.4" />
      ))}
    </Wrapper>
  );
}

// Оборудование
function CompressorIllustration() {
  return (
    <Wrapper>
      <rect x="130" y="140" width="140" height="60" rx="8" fill={COLORS.navy3} />
      <circle cx="160" cy="200" r="14" fill={COLORS.navy} stroke={COLORS.blue} strokeWidth="2" />
      <circle cx="240" cy="200" r="14" fill={COLORS.navy} stroke={COLORS.blue} strokeWidth="2" />
      <rect x="150" y="100" width="100" height="40" rx="20" fill={COLORS.accent} opacity="0.7" />
    </Wrapper>
  );
}
function LatheIllustration() {
  return (
    <Wrapper>
      <rect x="100" y="160" width="200" height="40" rx="4" fill={COLORS.navy3} />
      <rect x="120" y="120" width="160" height="40" fill="none" stroke={COLORS.blue} strokeWidth="2" />
      <circle cx="140" cy="140" r="10" fill={COLORS.gold} opacity="0.8" />
    </Wrapper>
  );
}
function WeldingMachineIllustration() {
  return (
    <Wrapper>
      <rect x="150" y="110" width="100" height="90" rx="8" fill={COLORS.navy3} />
      <path d="M250,140 Q280,150 270,180" fill="none" stroke={COLORS.gold} strokeWidth="3" />
      <circle cx="272" cy="183" r="6" fill={COLORS.gold} />
      <rect x="165" y="125" width="70" height="10" rx="2" fill={COLORS.accent} opacity="0.6" />
    </Wrapper>
  );
}

const ILLUSTRATIONS = {
  cement: CementIllustration,
  cottonYarn: CottonYarnIllustration,
  sunflowerOil: SunflowerOilIllustration,
  rebar: RebarIllustration,
  ldpeFilm: LdpeFilmIllustration,
  pump: PumpIllustration,
  // Расширение каталога
  wheat: WheatIllustration,
  rice: RiceIllustration,
  spices: SpicesIllustration,
  brick: BrickIllustration,
  metalRoof: MetalRoofIllustration,
  ceramicTile: CeramicTileIllustration,
  laptop: LaptopIllustration,
  smartphone: SmartphoneIllustration,
  cable: CableIllustration,
  powerSupply: PowerSupplyIllustration,
  polypropylene: PolypropyleneIllustration,
  paint: PaintIllustration,
  fertilizer: FertilizerIllustration,
  acid: AcidIllustration,
  silkFabric: SilkFabricIllustration,
  clothing: ClothingIllustration,
  syntheticFabric: SyntheticFabricIllustration,
  steelSheet: SteelSheetIllustration,
  aluminumProfile: AluminumProfileIllustration,
  copperWire: CopperWireIllustration,
  cardboardBox: CardboardBoxIllustration,
  petBottle: PetBottleIllustration,
  ppBag: PpBagIllustration,
  compressor: CompressorIllustration,
  lathe: LatheIllustration,
  weldingMachine: WeldingMachineIllustration,
};

/**
 * Рендерит иллюстрацию товара по идентификатору. Заменяет прежний
 * <img src={product.photo}>. Если идентификатор неизвестен — показывает
 * нейтральную заглушку вместо падения с ошибкой.
 */

/**
 * Список всех доступных идентификаторов иллюстраций — используется,
 * например, формой «Разместить товар», где продавец выбирает подходящую
 * категорийную иллюстрацию (без backend нет загрузки настоящих фото).
 * Экспортирован отдельно, чтобы не дублировать список ключей где-либо
 * ещё в коде.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const PRODUCT_ILLUSTRATION_IDS = Object.keys(ILLUSTRATIONS);

export default function ProductIllustration({ id, ...props }) {
  const Illustration = ILLUSTRATIONS[id];
  if (!Illustration) {
    // Логируем предупреждение в dev-режиме — помогает диагностировать товары
    // из localStorage, сохранённые со старым или несуществующим photoId.
    // В production console.warn остаётся, но не виден конечному пользователю.
    if (id) {
      console.warn(
        `[ProductIllustration] Неизвестный photoId: "${id}". ` +
        `Доступные: ${PRODUCT_ILLUSTRATION_IDS.join(', ')}`
      );
    }
    return (
      <Wrapper>
        <text x="200" y="155" textAnchor="middle" fontSize="14" fill={COLORS.blue}>Товар</text>
      </Wrapper>
    );
  }
  return <Illustration {...props} />;
}
