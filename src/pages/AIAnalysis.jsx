import { aiAnalysis } from '../data/mock';

export default function AIAnalysis() {
  const { offers } = aiAnalysis;
  const best = offers.find(o => o.recommended);

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ИИ-АНАЛИЗ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Сравнение оферт</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>
        Тендер: «Поставка пшеницы 3-го класса» · {offers.length} предложения · Incoterms CIF · Ташкент, UZ
      </div>

      {/* AI recommendation banner */}
      <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(0,212,170,0.3)', background: 'rgba(0,212,170,0.05)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 28, marginTop: 2 }}>◎</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              ИИ рекомендует: предложение из {best.flag} {best.country}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
              {best.aiNote}. Полная стоимость с учётом доставки по {best.incoterms} составляет{' '}
              <strong style={{ color: 'var(--accent)' }}>${best.totalCost.toLocaleString()}</strong> —
              оптимальный вариант среди {offers.length} проверенных предложений.
            </div>
          </div>
        </div>
      </div>

      {/* Offers comparison */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {offers.map((offer, idx) => (
          <div key={offer.id} className="card" style={{
            padding: '20px 24px',
            borderColor: offer.recommended ? 'rgba(0,212,170,0.4)' : 'var(--border)',
            background: offer.recommended ? 'rgba(0,212,170,0.04)' : 'var(--card)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--navy-3)', border: '1px solid var(--border)',
                }}>{offer.flag}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>Предложение {idx + 1} · {offer.country}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    Рейтинг доверия: <span style={{ color: offer.trustScore >= 70 ? 'var(--accent)' : offer.trustScore >= 30 ? 'var(--gold)' : 'var(--red)' }}>{offer.trustScore}%</span>
                    {' '}· {offer.incoterms} · {offer.deliveryDays} дней доставки
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {offer.recommended && <span className="badge badge-green" style={{ marginBottom: 6, display: 'block' }}>✓ Рекомендовано ИИ</span>}
                <div style={{ fontSize: 22, fontWeight: 700, color: offer.recommended ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--font-display)' }}>
                  ${offer.totalCost.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>итого с доставкой</div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: 'var(--navy-3)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Цена товара</div>
                <div style={{ fontWeight: 600 }}>${offer.productPrice.toLocaleString()}</div>
              </div>
              <div style={{ background: 'var(--navy-3)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Доставка ({offer.incoterms})</div>
                <div style={{ fontWeight: 600 }}>${offer.deliveryCost.toLocaleString()}</div>
              </div>
              <div style={{ background: offer.recommended ? 'var(--accent-dim)' : 'var(--navy-3)', borderRadius: 8, padding: '12px 14px', border: offer.recommended ? '1px solid rgba(0,212,170,0.2)' : 'none' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>TCO (полная стоимость)</div>
                <div style={{ fontWeight: 700, color: offer.recommended ? 'var(--accent)' : 'var(--text)' }}>${offer.totalCost.toLocaleString()}</div>
              </div>
            </div>

            {/* AI note */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)' }}>
              <span>◎</span>
              <span>{offer.aiNote}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Incoterms note */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Справка по Incoterms 2020</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[['CIF', 'Продавец оплачивает доставку и страховку до порта покупателя'],['FOB','Продавец доставляет на борт судна. Далее — риски покупателя'],['DAP','Продавец доставляет до указанного места назначения']].map(([t,d])=>(
            <div key={t} style={{ flex: 1, minWidth: 200, background: 'var(--navy-3)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
