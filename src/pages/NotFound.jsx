import { useNavigate } from 'react-router-dom';

/**
 * 404 — закрывает аудит-пункт 🟡#13. Раньше переход на любой несуществующий
 * путь (например /несуществующая-страница) внутри основного layout показывал
 * пустой main без какого-либо сообщения — внутренний <Routes> в App.jsx не
 * имел wildcard-маршрута.
 */
export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="fade-in" style={{ padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 64, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', marginBottom: 8 }}>404</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Страница не найдена</div>
        <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
          Такой страницы не существует. Возможно, ссылка устарела или содержит ошибку.
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>← На главную</button>
      </div>
    </div>
  );
}
