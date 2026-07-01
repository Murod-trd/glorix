/**
 * glorixAiRegistry.js — Glorix AI governance foundation (frontend-only, lightweight).
 *
 * Concept:
 *   Glorix AI is the main orchestration/governance layer. It coordinates
 *   specialized SubAI modules. This registry is an HONEST description of what
 *   exists today — it does NOT implement Law AI or Support AI logic.
 *
 * Statuses used here:
 *   - "active"    : module is wired and usable now
 *   - "planned"   : module is on the roadmap, not implemented
 * A SubAI's live runtime state (configured/unavailable) is resolved separately
 * (e.g. TN VED AI health via src/services/tnvedAiClient.js) — this registry only
 * declares the modules and their intended scope.
 */

export const GLORIX_AI = {
  id: 'glorix-ai',
  name: 'Glorix AI',
  role: 'Главный ИИ-координатор Glorix (оркестрация и управление под-ИИ модулями)',
};

export const SUBAI_MODULES = [
  {
    id: 'tnved-ai',
    name: 'TN VED AI',
    title: 'ИИ классификации ТН ВЭД',
    scope: 'Таможенные коды ТН ВЭД / HS',
    status: 'active',
    // Runtime state (configured/unavailable/error) is provided by the health check.
  },
  {
    id: 'law-ai',
    name: 'Law AI',
    title: 'Юридический ИИ',
    scope: 'Договоры, комплаенс, право',
    status: 'planned',
  },
  {
    id: 'support-ai',
    name: 'Support AI',
    title: 'ИИ поддержки',
    scope: 'Горячая линия и помощь клиентам',
    status: 'planned',
  },
];

export function getSubAi(id) {
  return SUBAI_MODULES.find((m) => m.id === id) || null;
}

export default { GLORIX_AI, SUBAI_MODULES, getSubAi };
