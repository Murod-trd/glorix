import { tenders as staticTenders, users } from './mock';

/**
 * Хранилище тендеров — тот же паттерн, что marketplaceStore.js для товаров:
 * статичные демо-тендеры (mock.js) остаются кодом, не данными, а тендеры,
 * реально опубликованные пользователем через CreateTender.jsx, хранятся
 * отдельно в localStorage и объединяются при чтении.
 *
 * КОНТЕКСТ: раньше «Опубликовать тендер» в CreateTender.jsx был чистой
 * заглушкой (alert() + navigate, без сохранения) — тендер никуда не
 * попадал и не был виден другим аккаунтам/ролям. Тот же класс проблемы,
 * что был у «Разместить товар» до фикса в marketplaceStore.js.
 *
 * Бизнес-решение по модели прав (зафиксировано основателем, как бизнес-
 * консультантом по сценарию Alibaba RFQ / SAP Ariba): тендеры видны ВСЕМ
 * ролям без фильтрации по владельцу — продавцы должны видеть весь поток
 * тендеров, чтобы подавать оферты. Но личность покупателя анонимизирована
 * для продавцов («Покупатель из [страна]») до завершения тендера —
 * раскрывается только самому покупателю (он видит свой тендер как есть)
 * и всем после того, как тендер переходит в статус completed.
 */

const USER_TENDERS_KEY = 'glorix_user_tenders';
const OFFERS_KEY = 'glorix_tender_offers';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage недоступен/переполнен — тендер просто не переживёт
    // перезагрузку страницы, не должно ломать приложение.
  }
}

function findUserById(id) {
  return Object.values(users).find(u => u.id === id) || null;
}

/**
 * Возвращает полный список тендеров: статичные демо-тендеры + реально
 * опубликованные пользователем за текущую сессию браузера.
 */
export function getAllTenders() {
  const userTenders = readJson(USER_TENDERS_KEY, []);
  return [...staticTenders, ...userTenders];
}

export function getTenderById(id) {
  return getAllTenders().find(t => t.id === id) || null;
}

/**
 * Публикует новый тендер — реализует требование «создание тендера должно
 * реально сохранять тендер, видимый другим ролям», а не просто
 * прокручивать форму до конца без последствий (см. CreateTender.jsx).
 */
export function addUserTender(tender) {
  const userTenders = readJson(USER_TENDERS_KEY, []);
  const newTender = {
    ...tender,
    id: `ut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    isUserAdded: true,
    status: tender.status || 'active',
    offers: 0,
    createdAt: new Date().toISOString(),
  };
  writeJson(USER_TENDERS_KEY, [...userTenders, newTender]);
  return newTender;
}

/**
 * Возвращает «безопасное для показа продавцу» имя покупателя — реализует
 * деловое решение об анонимизации покупателя до завершения тендера.
 *
 * Три демо-тендера из mock.js (t1-t3) не привязаны к конкретному
 * демо-аккаунту покупателя (buyerId отсутствует) — это были давние
 * иллюстративные данные без связи с реальными аккаунтами, и для двух из
 * трёх стран (UZ, RU) демо-аккаунты покупателя/«оба» совпадают по стране,
 * но для третьего (KZ) единственный демо-аккаунт этой страны — продавец
 * (KazSteel Trading), который по бизнес-правилам не может владеть
 * тендером. Привязывать тендер к продавцу было бы внутренним
 * противоречием, поэтому для t2 buyerId сознательно не указан — тендер
 * остаётся анонимным для всех, без раскрытия даже формально. Открытый
 * вопрос, не решённый в одностороннем порядке: нужен ли отдельный
 * демо-аккаунт покупателя из Казахстана.
 */
export function getDisplayBuyerName(tender, viewerId) {
  const fallbackCountry = tender.buyerCountry || '—';
  if (!tender.buyerId) {
    return `Покупатель из ${fallbackCountry}`;
  }
  const canReveal = tender.buyerId === viewerId || tender.status === 'completed';
  if (canReveal) {
    const buyer = findUserById(tender.buyerId);
    if (buyer) return buyer.name;
  }
  return `Покупатель из ${fallbackCountry}`;
}

// === Оферты продавцов по тендеру ===

function readOffers() {
  return readJson(OFFERS_KEY, {}); // { [tenderId]: Offer[] }
}

export function getOffersForTender(tenderId) {
  return readOffers()[tenderId] || [];
}

export function getMyOfferForTender(tenderId, sellerId) {
  return getOffersForTender(tenderId).find(o => o.sellerId === sellerId) || null;
}

/**
 * Возвращает количество оферт для отображения: демо-счётчик из статичных
 * данных (флёр-текст старых демо-тендеров) + реально поданные оферты —
 * иначе реально поданная оферта продавца никак не отразилась бы в счётчике
 * «Получено оферт», и фича выглядела бы нерабочей.
 */
export function getTotalOfferCount(tender) {
  return (tender.offers || 0) + getOffersForTender(tender.id).length;
}

/**
 * Подаёт (или обновляет, если продавец уже подавал) оферту продавца на
 * тендер. Обновление, а не дубль — чтобы продавец мог скорректировать
 * цену/КП без создания второй записи с тем же sellerId.
 */
export function submitOffer(tenderId, offer) {
  const allOffers = readOffers();
  const list = allOffers[tenderId] || [];
  const existingIdx = list.findIndex(o => o.sellerId === offer.sellerId);
  const newOffer = {
    ...offer,
    id: existingIdx >= 0 ? list[existingIdx].id : `of_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenderId,
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const nextList = existingIdx >= 0
    ? list.map((o, i) => (i === existingIdx ? newOffer : o))
    : [...list, newOffer];
  allOffers[tenderId] = nextList;
  writeJson(OFFERS_KEY, allOffers);
  return newOffer;
}
