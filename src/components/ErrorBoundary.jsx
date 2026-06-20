import { Component } from 'react';

/**
 * ErrorBoundary — закрывает аудит-пункт 🟡#13 (повышенный приоритет после
 * инцидента в сессии 6: необработанная ошибка в одном компоненте
 * Marketplace.jsx обрушила всю платформу полностью — чёрный экран при
 * клике, без какого-либо сообщения).
 *
 * React ErrorBoundary обязательно реализуется как class-компонент — хуки
 * (useState/useEffect) не могут перехватывать ошибки рендера дочерних
 * компонентов, это ограничение самого React, не архитектурное решение.
 *
 * Это не предотвращает баги — это ограничивает их последствия: вместо
 * полного краха всего приложения пользователь увидит понятное сообщение
 * с кнопкой возврата на главную, а не пустой чёрный экран.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // В реальном production здесь была бы отправка в систему мониторинга
    // ошибок (Sentry и подобные) — в demo-фазе просто логируем в консоль,
    // чтобы не молчать об ошибке полностью.
    console.error('GLORIX ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--navy)', padding: 32 }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Что-то пошло не так</div>
            <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Произошла непредвиденная ошибка. Это демо-версия платформы — приносим извинения за неудобство. Попробуйте вернуться на главную страницу.
            </div>
            <button className="btn btn-primary" onClick={this.handleReset}>← На главную</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
