import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Шрифты подключены через @fontsource (самохостинг, бандлится со
// сборкой) вместо Google Fonts CDN — закрывает аудит-пункт 🟡#15.
// fonts.googleapis.com блокируется или работает нестабильно в части
// стран целевого рынка платформы (Россия, Туркменистан и другие страны
// СНГ с ограничениями доступа к Google) — GLORIX заявлен как продукт
// для всего региона СНГ (см. MASTER_PROJECT_CONTEXT.md), не только для
// Узбекистана, поэтому эта зависимость затрагивала реальную часть
// целевой аудитории платформы. Включены только нужные начертания
// (Inter 300/400/500/600, Space Grotesk 400/500/600/700) — те же веса,
// что были запрошены через прежнюю Google Fonts ссылку.
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
