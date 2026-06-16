import { useState, useRef, useEffect } from 'react';

const buyerBot = {
  name: 'ИИ-Покупатель GLORIX',
  avatar: '🤖',
  role: 'buyer',
  color: 'var(--accent)',
  description: 'Симулирует реального покупателя: создаёт тендеры, проверяет спецификации, анализирует оферты',
};

const sellerBot = {
  name: 'ИИ-Продавец GLORIX',
  avatar: '🏭',
  role: 'seller',
  color: 'var(--gold)',
  description: 'Симулирует реального продавца: подаёт оферты, предлагает аналоги, работает по Incoterms',
};

const scenarios = [
  {
    id: 'tender_wheat',
    label: 'Тендер на пшеницу',
    icon: '🌾',
    description: 'Покупатель объявляет тендер, продавец подаёт оферту с аналогом',
    steps: [
      { bot: 'buyer', delay: 500, text: 'Создаю тендер: «Пшеница 3-й класс, 500 тонн, ГОСТ Р 52554-2006, влажность ≤ 14%, протеин ≥ 12%, Incoterms CIF Ташкент»' },
      { bot: 'buyer', delay: 800, text: 'Дедлайн D1 (тех. требования) установлен: 20 июля 2025. Депозит рассчитан ИИ: 10% от бюджета $100,000 = $10,000 с каждой стороны. Тендер опубликован анонимно.' },
      { bot: 'seller', delay: 2000, text: 'Вижу тендер. Анализирую спецификации... У меня есть пшеница 3-го класса, но протеин 13.5% (выше требуемых 12%). ИИ подтвердил: это аналог равного или лучшего качества.' },
      { bot: 'seller', delay: 1500, text: 'Подаю оферту: 500 тонн × $188/тонна = $94,000. Доставка CIF Ташкент: $6,200 (ж/д через Казахстан, 12 дней). Итого TCO: $100,200. Сертификат качества прилагается.' },
      { bot: 'buyer', delay: 2000, text: 'ИИ-анализ оферты завершён. TCO $100,200 vs бюджет $100,000 — в пределах допуска. Протеин 13.5% > 12% требуемых. ✓ Принимаю спецификацию продавца.' },
      { bot: 'buyer', delay: 1200, text: 'Дедлайн D4: финальная цена подтверждена. Открываю Escrow — $10,000 депозита уже внесён обеими сторонами. Ожидаю D5 — результат тендера.' },
      { bot: 'seller', delay: 1500, text: '✓ Победитель определён! Подписываю договор по шаблону GLORIX. Отгружаю 500 тонн. Загружаю накладную и счёт-фактуру в платформу.' },
      { bot: 'buyer', delay: 1000, text: '✓ Накладная верифицирована ИИ. Escrow $94,000 переведён продавцу мгновенно. Депозиты возвращены обеим сторонам. Сделка закрыта. Рейтинги обновлены.' },
    ],
  },
  {
    id: 'marketplace_urgent',
    label: 'Срочная покупка',
    icon: '⚡',
    description: 'Компании срочно нужны стройматериалы — маркетплейс, Escrow, быстрая доставка',
    steps: [
      { bot: 'buyer', delay: 500, text: 'Срочно нужен цемент М400, 200 мешков, доставка сегодня или завтра. Захожу в маркетплейс GLORIX, включаю фильтр "⚡ Срочно".' },
      { bot: 'buyer', delay: 1000, text: 'ИИ показал 3 поставщика в радиусе 50 км которые гарантируют доставку завтра. Выбираю UzBuild LLC — рейтинг 94%, 89 сделок, верифицирован.' },
      { bot: 'buyer', delay: 800, text: 'Заказываю 200 мешков × $6.5 = $1,300. Комиссия GLORIX 1.5% = $19.5. На Escrow: $1,319.50. Оплачиваю.' },
      { bot: 'seller', delay: 1500, text: 'Получил уведомление: оплата поступила на Escrow. Отгружаю 200 мешков цемента М400 прямо сейчас. Загружаю накладную и счёт-фактуру.' },
      { bot: 'seller', delay: 1000, text: 'Добавляю трекинг-номер логистической компании: UZ-TRK-20250716-4821. Товар в пути, доставка завтра 10:00–14:00.' },
      { bot: 'buyer', delay: 1200, text: 'Отслеживаю доставку в GLORIX. Трекинг показывает: «В пути, прибытие завтра». Накладная верифицирована ИИ.' },
      { bot: 'buyer', delay: 800, text: '✓ Товар получен. GLORIX автоматически перевёл $1,300 продавцу (минус комиссия 1.5%). Оставляю отзыв: 5 звёзд. Рейтинг продавца вырос.' },
    ],
  },
  {
    id: 'fraud_prevention',
    label: 'Защита от мошенника',
    icon: '🛡️',
    description: 'ИИ выявляет фиктивную компанию и блокирует участие в тендере',
    steps: [
      { bot: 'seller', delay: 500, text: 'Регистрируюсь на GLORIX как "Global Supply LLC". Указываю адрес в Дубае, ИНН, банковские реквизиты.' },
      { bot: 'buyer', delay: 1500, text: 'ИИ Anti-Fraud запустил автоматическую проверку нового поставщика по 10 параметрам...' },
      { bot: 'buyer', delay: 2000, text: '⚠ RED FLAG #1: ИНН не найден в госреестре ОАЭ. ИИ запрашивает дополнительные документы.' },
      { bot: 'seller', delay: 1000, text: 'Загружаю "поддельный" сертификат регистрации.' },
      { bot: 'buyer', delay: 1500, text: '⚠ RED FLAG #2: ИИ сравнил документ с реестром — номер сертификата не совпадает с базой данных торговой палаты ОАЭ.' },
      { bot: 'buyer', delay: 800, text: '⚠ RED FLAG #3: Банковский счёт зарегистрирован 3 дня назад. Транзакционная история отсутствует. Рейтинг доверия: 0%.' },
      { bot: 'buyer', delay: 1000, text: '🛑 БЛОКИРОВКА. Аккаунт заморожен. ИИ передал данные в compliance отдел GLORIX. Уведомление отправлено всем активным покупателям об этом поставщике. Сделки заблокированы.' },
      { bot: 'seller', delay: 500, text: '❌ Аккаунт заблокирован. Попытка мошенничества предотвращена платформой GLORIX.' },
    ],
  },
  {
    id: 'rfi_to_tender',
    label: 'RFI → Тендер (CIPS)',
    icon: '📋',
    description: 'Полный CIPS цикл: от RFI до закрытия контракта',
    steps: [
      { bot: 'buyer', delay: 500, text: 'Стадия 1 CIPS: Определяю потребность. Нужно промышленное холодильное оборудование, 12 единиц. Сначала запускаю RFI для изучения рынка.' },
      { bot: 'buyer', delay: 1000, text: 'Стадия 2–3 CIPS: Публикую RFI с 4 вопросами: производитель/дистрибьютор?, CE сертификат?, сервис в СНГ?, референс-лист клиентов?' },
      { bot: 'seller', delay: 2000, text: 'Отвечаю на RFI: Производитель (Германия). CE Mark + EAC. Сервисные центры в UZ, KZ, RU. Референс: 47 установок в СНГ за 5 лет.' },
      { bot: 'buyer', delay: 1500, text: 'Стадия 4 CIPS: Преквалификация. ИИ оценил поставщика по 10C. Средний балл 87/100. Финансовая проверка: стабильна. Допускаю к тендеру.' },
      { bot: 'buyer', delay: 1000, text: 'Стадия 5 CIPS: Создаю тендер на основе данных RFI. Спецификации уже заполнены из ответов поставщиков. Экономия времени: 3 дня.' },
      { bot: 'seller', delay: 1500, text: 'Стадия 6 CIPS: Подаю оферту. $280,000 за 12 единиц DAP Алматы. Полная документация, CE + EAC сертификаты приложены.' },
      { bot: 'buyer', delay: 2000, text: 'Стадии 7–9 CIPS: Переговоры → Выбор → Контракт. Согласовали $275,000, рассрочка 30/70. Контракт по шаблону GLORIX + NDA подписан.' },
      { bot: 'buyer', delay: 1000, text: 'Стадия 10–12 CIPS: KPI согласованы до подписания: доставка 30 дней, гарантия 24 мес, SLA сервиса 48ч. Трекинг в GLORIX активирован. 🎯 Полный CIPS цикл завершён.' },
    ],
  },
];

export default function AIBots() {
  const [activeScenario, setActiveScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const messagesEndRef = useRef(null);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runScenario = (scenario) => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setActiveScenario(scenario);
    setMessages([]);
    setRunning(true);
    setDone(false);

    let cumDelay = 0;
    scenario.steps.forEach((step, i) => {
      cumDelay += step.delay;
      const t = setTimeout(() => {
        setMessages(prev => [...prev, { ...step, id: i, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
        if (i === scenario.steps.length - 1) { setRunning(false); setDone(true); }
      }, cumDelay);
      timeoutsRef.current.push(t);
    });
  };

  const stop = () => {
    timeoutsRef.current.forEach(clearTimeout);
    setRunning(false);
  };

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ИИ-БОТЫ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Симуляция сделок</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>
        ИИ-боты симулируют реальных покупателей и продавцов. Выберите сценарий и наблюдайте как платформа работает изнутри.
      </div>

      {/* Bots */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {[buyerBot, sellerBot].map(bot => (
          <div key={bot.role} className="card" style={{ borderColor: bot.color === 'var(--accent)' ? 'rgba(0,212,170,0.25)' : 'rgba(245,166,35,0.25)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: bot.color === 'var(--accent)' ? 'var(--accent-dim)' : 'var(--gold-dim)', border: `2px solid ${bot.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{bot.avatar}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{bot.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{bot.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)' }}>Выберите сценарий</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {scenarios.map(s => (
          <button key={s.id} onClick={() => !running && runScenario(s)} style={{
            padding: '16px 18px', borderRadius: 10, textAlign: 'left', cursor: running ? 'not-allowed' : 'pointer',
            background: activeScenario?.id === s.id ? 'rgba(0,212,170,0.08)' : 'var(--card)',
            border: `1px solid ${activeScenario?.id === s.id ? 'rgba(0,212,170,0.4)' : 'var(--border)'}`,
            transition: 'all 0.15s', opacity: running && activeScenario?.id !== s.id ? 0.5 : 1,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.description}</div>
          </button>
        ))}
      </div>

      {/* Chat simulation */}
      {activeScenario && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--navy-3)' }}>
            <div style={{ fontWeight: 600 }}>{activeScenario.icon} {activeScenario.label}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {running && <span style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1s infinite' }} />Симуляция идёт...</span>}
              {done && <span className="badge badge-green">✓ Завершено</span>}
              {running && <button className="btn btn-danger" onClick={stop} style={{ padding: '5px 12px', fontSize: 12 }}>Стоп</button>}
              {!running && <button className="btn btn-ghost" onClick={() => runScenario(activeScenario)} style={{ padding: '5px 12px', fontSize: 12 }}>↺ Запустить снова</button>}
            </div>
          </div>

          <div style={{ height: 420, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map(msg => {
              const isBot = msg.bot;
              const bot = msg.bot === 'buyer' ? buyerBot : sellerBot;
              return (
                <div key={msg.id} className="fade-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.bot === 'seller' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: msg.bot === 'buyer' ? 'var(--accent-dim)' : 'var(--gold-dim)', border: `2px solid ${bot.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{bot.avatar}</div>
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textAlign: msg.bot === 'seller' ? 'right' : 'left' }}>
                      {bot.name} · {msg.time}
                    </div>
                    <div style={{
                      padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6,
                      background: msg.bot === 'buyer' ? 'rgba(0,212,170,0.08)' : 'var(--gold-dim)',
                      border: `1px solid ${msg.bot === 'buyer' ? 'rgba(0,212,170,0.2)' : 'rgba(245,166,35,0.2)'}`,
                      borderTopLeftRadius: msg.bot === 'buyer' ? 2 : 10,
                      borderTopRightRadius: msg.bot === 'seller' ? 2 : 10,
                      color: 'var(--text)',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            {running && messages.length > 0 && (
              <div style={{ display: 'flex', gap: 6, paddingLeft: 46 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)', animation: `pulse ${0.6 + i * 0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {!activeScenario && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Выберите сценарий выше</div>
          <div style={{ fontSize: 14 }}>ИИ-боты покажут как работает GLORIX изнутри</div>
        </div>
      )}
    </div>
  );
}
