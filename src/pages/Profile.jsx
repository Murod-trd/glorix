import { useState } from 'react';
import { getCurrentUser } from '../data/mock';
import { useAccountType } from '../context/AccountContext';

const PREFS_KEY = 'glorix_profile_prefs';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Profile() {
  const { accountType } = useAccountType();
  const currentUser = getCurrentUser(accountType);
  const stored = loadPrefs();
  const [contractPref, setContractPref] = useState(stored?.contractPref ?? 'own');
  const [acceptTemplate, setAcceptTemplate] = useState(stored?.acceptTemplate ?? true);
  const [law, setLaw] = useState(stored?.law ?? 'UZ');
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ contractPref, acceptTemplate, law }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--navy-3)', border: '1px solid var(--border-2)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14,
  };

  return (
    <div className="fade-in" style={{ padding: '32px 36px', maxWidth: 720 }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ПРОФИЛЬ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 28 }}>Настройки аккаунта</h1>

      {/* Company card */}
      <div className="card" style={{ marginBottom: 20, padding: '24px 28px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-dim)', border: '2px solid var(--accent)',
          }}>{currentUser.flag}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>{currentUser.name}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
              {currentUser.country} · Покупатель · Верифицирован ✓
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>Участник с {currentUser.joined}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{currentUser.trustScore}%</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>рейтинг доверия</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Страна регистрации', 'Узбекистан (UZ)'],
            ['Тип участника', 'Покупатель'],
            ['Верификация', 'ЕГРПО / Госреестр UZ ✓'],
            ['Валюта', 'USD (мультивалютный)'],
          ].map(([k,v]) => (
            <div key={k} style={{ padding: '10px 14px', background: 'var(--navy-3)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract preferences */}
      <div className="card" style={{ marginBottom: 20, padding: '24px 28px' }}>
        <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Договорные предпочтения</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
          Настройки применяются автоматически ко всем вашим тендерам. Можно изменить один раз — платформа запомнит.
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Применимое право по умолчанию</label>
          <select style={inputStyle} value={law} onChange={e => setLaw(e.target.value)}>
            <option value="UZ">Узбекистан (авто — по стране регистрации)</option>
            <option value="KZ">Казахстан</option>
            <option value="RU">Россия</option>
            <option value="AZ">Азербайджан</option>
            <option value="neutral">Нейтральное (международное)</option>
          </select>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 10 }}>Приоритет договора</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['own','Мой договор в приоритете'],['other','Принимаю договор другой стороны'],['platform','На усмотрение платформы']].map(([v,l]) => (
              <label key={v} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', background: contractPref === v ? 'var(--accent-dim)' : 'var(--navy-3)', border: `1px solid ${contractPref === v ? 'rgba(0,212,170,0.3)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                <input type="radio" name="contract" value={v} checked={contractPref === v} onChange={() => setContractPref(v)} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 14 }}>{l}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 16px', background: acceptTemplate ? 'rgba(0,212,170,0.06)' : 'var(--red-dim)', border: `1px solid ${acceptTemplate ? 'rgba(0,212,170,0.2)' : 'rgba(255,77,77,0.2)'}`, borderRadius: 8 }}>
          <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={acceptTemplate} onChange={e => setAcceptTemplate(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Принимаю шаблон платформы при договорном конфликте</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {acceptTemplate
                  ? 'При конфликте настроек — тендер продолжится по нейтральному договору GLORIX'
                  : '⚠️ При конфликте настроек вы не сможете участвовать в таких тендерах'}
              </div>
            </div>
          </label>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} style={{ fontSize: 15, padding: '12px 28px' }}>
        {saved ? '✓ Сохранено' : 'Сохранить настройки'}
      </button>
    </div>
  );
}
