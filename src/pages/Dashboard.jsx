import { useNavigate } from 'react-router-dom';
import { tenders, stats, getCurrentUser } from '../data/mock';
import { useAccountType } from '../context/AccountContext';

function StatCard({ value, label, accent }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: accent || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function TenderRow({ tender, onClick }) {
  const statusMap = {
    active: { label: 'Активный', cls: 'badge-green' },
    agreement: { label: 'Согласование', cls: 'badge-gold' },
    completed: { label: 'Завершён', cls: 'badge-gray' },
  };
  const s = statusMap[tender.status];
  const progress = Object.values(tender.deadlines).filter(d => d.done).length;
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, marginBottom: 3 }}>{tender.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{tender.category} · {tender.destination}</div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 120 }}>
        <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 14 }}>${tender.budget.min.toLocaleString()}–${tender.budget.max.toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{tender.incoterms}</div>
      </div>
      <div style={{ minWidth: 90, textAlign: 'center' }}>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>
      <div style={{ minWidth: 100 }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: i<=progress?'var(--accent)':'var(--navy-3)', border: `1px solid ${i<=progress?'var(--accent)':'var(--border)'}` }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, textAlign: 'right' }}>{progress}/5 этапов</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 50, textAlign: 'right' }}>{tender.offers} оферт</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { canBuy, canSell, accountType } = useAccountType();
  const currentUser = getCurrentUser(accountType);
  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ДАШБОРД</div>
          <h1 style={{ fontSize: 26, fontWeight: 600 }}>Добро пожаловать, {currentUser.name}</h1>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>
            <span style={{ color: 'var(--accent)' }}>●</span> Платформа активна · СНГ регион · {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {/* Только покупатель и общий видят кнопку создания тендера */}
        {canBuy && (
          <button className="btn btn-primary" onClick={() => navigate('/create')}>+ Создать тендер</button>
        )}
        {/* Продавец видит кнопку размещения товара */}
        {canSell && !canBuy && (
          <button className="btn btn-primary" onClick={() => navigate('/marketplace')}>+ Разместить товар</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard value={`${stats.activeTenders.toLocaleString()}`} label="Активных тендеров" accent="var(--accent)" />
        <StatCard value={`${stats.countries}`} label="Стран СНГ и партнёров" />
        <StatCard value={`$${stats.totalVolume}`} label="Объём сделок" accent="var(--gold)" />
        <StatCard value={`${currentUser.trustScore}%`} label="Рейтинг доверия" />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            {canBuy ? 'Мои тендеры' : 'Открытые тендеры (доступны для оферт)'}
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/tenders')} style={{ fontSize: 13, padding: '6px 14px' }}>Все тендеры →</button>
        </div>
        {tenders.map(t => <TenderRow key={t.id} tender={t} onClick={() => navigate(`/tenders/${t.id}`)} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ borderColor: 'rgba(0,212,170,0.2)', background: 'rgba(0,212,170,0.04)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 24 }}>◎</div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>ИИ-анализ активен</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                По тендеру «Пшеница 3-го класса» получено 7 оферт. ИИ рассчитал полную стоимость с доставкой по Incoterms CIF.
              </div>
              <button className="btn btn-ghost" onClick={() => navigate('/ai-analysis')} style={{ marginTop: 12, fontSize: 13, padding: '7px 14px' }}>Смотреть анализ →</button>
            </div>
          </div>
        </div>
        <div className="card" onClick={() => navigate('/trust')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>Рейтинг доверия</div>
            <span className="badge badge-green">Зелёная зона</span>
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', marginBottom: 8 }}>{currentUser.trustScore}%</div>
          <div style={{ height: 6, background: 'var(--navy-3)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${currentUser.trustScore}%`, background: 'var(--accent)', borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginTop: 8 }}>
            <span>{currentUser.successDeals} успешных из {currentUser.totalDeals} сделок</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}
