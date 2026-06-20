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

const ILLUSTRATIONS = {
  cement: CementIllustration,
  cottonYarn: CottonYarnIllustration,
  sunflowerOil: SunflowerOilIllustration,
  rebar: RebarIllustration,
  ldpeFilm: LdpeFilmIllustration,
  pump: PumpIllustration,
};

/**
 * Рендерит иллюстрацию товара по идентификатору. Заменяет прежний
 * <img src={product.photo}>. Если идентификатор неизвестен — показывает
 * нейтральную заглушку вместо падения с ошибкой.
 */
export default function ProductIllustration({ id, ...props }) {
  const Illustration = ILLUSTRATIONS[id];
  if (!Illustration) {
    return (
      <Wrapper>
        <text x="200" y="155" textAnchor="middle" fontSize="14" fill={COLORS.blue}>Товар</text>
      </Wrapper>
    );
  }
  return <Illustration {...props} />;
}
