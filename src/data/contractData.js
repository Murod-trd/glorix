// Структурированная модель Договора купли-продажи GLORIX.
// Возвращает не строку, а объект { title, num, date, city, contractLang, sections },
// который используется ТРЕМЯ рендерерами (экран, PDF, Word) для единообразного
// двухколоночного (RU | вторичный язык) или одноязычного вывода — в зависимости
// от resolveContractLanguage(). Это устраняет рассинхронизацию между тремя форматами.
//
// Каждая секция: { heading: { ru, en }, clauses: [{ ru, en }, ...] }
// Текст EN — перевод текста RU, выполненный и проверенный в рамках этой задачи
// (см. research/contract_en_translation_draft.md). JS-переменные внутри текста
// (${...}) разрешаются один раз при вызове buildContractStructured(f) для каждого
// языка одинаково, чтобы цифры/условия не расходились между колонками.

import { legalSources, internationalLaw } from './legalSources';

export const LANG_NAMES = {
  ru: 'Русский', kk: 'Қазақша', tg: 'Тоҷикӣ', ka: 'ქართული',
  az: 'Azərbaycanca', ky: 'Кыргызча', tk: 'Türkmençe', en: 'English',
};

// Правило (см. /home/claude/work/glorix-v14/src/pages/LegalAI.jsx для исходной версии —
// здесь дублируется намеренно, так как структурированный builder используется отдельно
// от текстового; обе копии должны давать идентичный результат, см. тесты резолвера):
// — Стороны из РАЗНЫХ стран → международная сделка, RU/EN, национальные законы сторон
//   не применяются к выбору языка контракта.
// — Стороны из ОДНОЙ страны → проверяется именно закон этой страны: разрешает русский →
//   один язык (русский); запрещает русский / требует только национальный → один язык
//   (национальный), без билингвальности.
export function resolveContractLanguage(sellerCountry, buyerCountry) {
  const sameCountry = sellerCountry && buyerCountry && sellerCountry === buyerCountry;

  if (!sameCountry) {
    return { mode: 'bilingual', primary: 'ru', secondary: 'en', warning: null };
  }

  const sLaw = legalSources.find(s => s.code === sellerCountry);
  const cl = sLaw?.contractLanguage;
  if (!cl) {
    return { mode: 'mono', primary: 'ru', secondary: null, warning: null };
  }

  if (cl.domesticRule === 'mono' || cl.domesticRule === 'bilingual_mandatory') {
    if (cl.domesticRule === 'bilingual_mandatory') {
      const [first, second] = cl.domesticLanguage.split('+');
      return { mode: 'bilingual', primary: first, secondary: second, warning: null, mandatory: true, requiresCertifiedTranslation: true };
    }
    return { mode: 'mono', primary: 'ru', secondary: null, warning: cl.verified ? null : cl.note };
  }

  if (cl.domesticRule === 'national_required' || cl.domesticRule === 'national_must_prevail') {
    return { mode: 'mono', primary: cl.domesticLanguage, secondary: null, warning: cl.note, nationalOnly: true };
  }

  if (cl.domesticRule === 'caution') {
    const [national] = cl.domesticLanguage.split('+');
    return { mode: 'mono', primary: national, secondary: null, warning: cl.note, unverifiedCaution: true };
  }

  return { mode: 'mono', primary: 'ru', secondary: null, warning: null };
}

export function buildContractStructured(f) {
  const { seller, buyer, sellerCountry, buyerCountry, goods, amount, currency,
    incoterms, deliveryDays, payTerms, penaltyRate, maxPenalty,
    scope, intLaw, contractNum, city, date } = f;

  const sLaw = legalSources.find(s => s.code === sellerCountry);
  const bLaw = legalSources.find(s => s.code === buyerCountry);
  const iLaw = internationalLaw?.find(l => l.id === intLaw);
  const sameCountry = sellerCountry && buyerCountry && sellerCountry === buyerCountry;

  const appliedLawRu = scope === 'international'
    ? `${iLaw?.name || 'КМКПТ/CISG'} + Incoterms 2020 (ICC)`
    : sameCountry
      ? `${sLaw?.mainCode || '___'}`
      : `${sLaw?.mainCode || '___'} (право продавца) + Incoterms 2020 (ICC) — трансграничная сделка СНГ`;
  const appliedLawEn = scope === 'international'
    ? `${iLaw?.name || 'CISG'} + Incoterms 2020 (ICC)`
    : sameCountry
      ? `${sLaw?.mainCode || '___'}`
      : `${sLaw?.mainCode || '___'} (Seller's law) + Incoterms 2020 (ICC) — cross-border CIS transaction`;

  const arbRu = scope === 'international'
    ? (iLaw?.arbitration || 'ICC Арбитраж, Париж')
    : sameCountry
      ? (sLaw?.nationalArbitration || '[АРБИТРАЖНЫЙ ИНСТИТУТ — ТРЕБУЕТСЯ УКАЗАТЬ ВРУЧНУЮ]')
      : `${sLaw?.nationalArbitration || '[АРБИТРАЖНЫЙ ИНСТИТУТ ПРОДАВЦА — ТРЕБУЕТСЯ УКАЗАТЬ ВРУЧНУЮ]'} (основной) → LCIA Лондон / SCC Стокгольм (запасной)`;
  const arbEn = scope === 'international'
    ? (iLaw?.arbitration || 'ICC Arbitration, Paris')
    : sameCountry
      ? (sLaw?.nationalArbitration || '[ARBITRATION INSTITUTION — TO BE SPECIFIED MANUALLY]')
      : `${sLaw?.nationalArbitration || "[SELLER'S ARBITRATION INSTITUTION — TO BE SPECIFIED MANUALLY]"} (primary) → LCIA London / SCC Stockholm (fallback)`;

  const rate = penaltyRate || '0,1';
  const maxP = maxPenalty || '10';
  const amt = amount ? `${parseFloat(amount).toLocaleString('ru-RU')} ${currency}` : '___________';
  const d = date || new Date().toLocaleDateString('ru-RU');
  const num = contractNum || `ДКП-${Math.floor(Math.random() * 9000 + 1000)}`;
  const year = new Date().getFullYear();

  const deliveryTermsRu = (scope === 'international' || !sameCountry)
    ? `${incoterms} (Инкотермс 2020, ICC)`
    : `${incoterms === 'DAP' ? 'поставка на склад ПОКУПАТЕЛЯ' : incoterms === 'EXW' ? 'самовывоз со склада ПРОДАВЦА' : incoterms} согласно условиям настоящего Договора`;
  const deliveryTermsEn = (scope === 'international' || !sameCountry)
    ? `${incoterms} (Incoterms 2020, ICC)`
    : `${incoterms === 'DAP' ? "delivery to the BUYER's warehouse" : incoterms === 'EXW' ? "ex-works pickup from the SELLER's warehouse" : incoterms} under the terms of this Contract`;

  const contractLang = resolveContractLanguage(sellerCountry, buyerCountry);

  const sellerName = seller || '________________________________';
  const buyerName = buyer || '________________________________';
  const sellerCountryName = sLaw?.country || sellerCountry || '___________';
  const buyerCountryName = bLaw?.country || buyerCountry || '___________';

  const sections = [
    {
      heading: { ru: 'СТАТЬЯ 1. ПРЕДМЕТ ДОГОВОРА', en: 'ARTICLE 1. SUBJECT OF THE CONTRACT' },
      clauses: [
        {
          ru: `1.1. ПРОДАВЕЦ обязуется передать в собственность ПОКУПАТЕЛЯ, а ПОКУПАТЕЛЬ обязуется принять и оплатить следующий товар (далее — «Товар»):\nНаименование: ${goods || '________________________________'}\nХарактеристики: согласно Спецификации (Приложение № 1)\nСтрана происхождения: ${sellerCountryName}`,
          en: `1.1. The SELLER undertakes to transfer ownership of, and the BUYER undertakes to accept and pay for, the following goods (hereinafter — the "Goods"):\nDescription: ${goods || '________________________________'}\nSpecifications: as per Specification (Appendix No. 1)\nCountry of origin: ${sellerCountryName}`,
        },
        { ru: `1.2. Товар является новым, не бывшим в употреблении, год производства — не ранее ${year - 1} года.`, en: `1.2. The Goods are new and unused, manufactured no earlier than ${year - 1}.` },
        { ru: '1.3. Товар свободен от каких-либо прав и притязаний третьих лиц, не является предметом залога, судебного спора, ареста или иного обременения.', en: '1.3. The Goods are free from any rights or claims of third parties and are not subject to pledge, litigation, seizure, or any other encumbrance.' },
        { ru: '1.4. Передаваемый Товар приобретается для коммерческого использования ПОКУПАТЕЛЕМ.', en: '1.4. The transferred Goods are acquired by the BUYER for commercial use.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 2. ЦЕНА И ОБЩАЯ СТОИМОСТЬ ДОГОВОРА', en: 'ARTICLE 2. PRICE AND TOTAL VALUE OF THE CONTRACT' },
      clauses: [
        { ru: `2.1. Общая стоимость настоящего Договора составляет: ${amt} (${amount ? 'сумма прописью' : '___________________________'}) на условиях ${deliveryTermsRu}.`, en: `2.1. The total value of this Contract is: ${amt} (${amount ? 'amount in words' : '___________________________'}) on the terms of ${deliveryTermsEn}.` },
        { ru: '2.2. Указанная цена является ОКОНЧАТЕЛЬНОЙ и не подлежит одностороннему изменению после подписания Договора.', en: '2.2. The stated price is FINAL and shall not be unilaterally amended after signing of the Contract.' },
        { ru: '2.3. Стоимость включает: упаковку, маркировку, погрузку, все расходы ПРОДАВЦА по выполнению условий поставки.', en: "2.3. The price includes: packing, marking, loading, and all costs borne by the SELLER in performing the delivery terms." },
        { ru: '2.4. Сумма Договора включает все налоги, пошлины, сборы, подлежащие уплате ПРОДАВЦОМ в соответствии с применимым законодательством.', en: '2.4. The Contract amount includes all taxes, duties, and fees payable by the SELLER in accordance with applicable law.' },
        { ru: '2.5. Все банковские расходы в банке ПОКУПАТЕЛЯ несёт ПОКУПАТЕЛЬ; в банке ПРОДАВЦА (включая банк-корреспондент) — ПРОДАВЕЦ.', en: "2.5. All bank charges arising at the BUYER's bank shall be borne by the BUYER; charges arising at the SELLER's bank (including the correspondent bank) shall be borne by the SELLER." },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 3. УСЛОВИЯ ПЛАТЕЖА', en: 'ARTICLE 3. PAYMENT TERMS' },
      clauses: [
        { ru: `3.1. Валюта платежа: ${currency}.`, en: `3.1. Currency of payment: ${currency}.` },
        { ru: `3.2. Порядок оплаты: ${payTerms || '30% предоплата в течение 5 банковских дней с даты подписания Договора; 70% — в течение 10 банковских дней с даты подписания Акта приёма-передачи.'}`, en: `3.2. Payment procedure: ${payTerms || '30% advance payment within 5 banking days from the date of signing the Contract; 70% within 10 banking days from the date of signing the Acceptance Certificate.'}` },
        { ru: '3.3. Платежи осуществляются безналичным путём посредством банковского перевода на реквизиты ПРОДАВЦА.', en: "3.3. Payments are made by bank transfer to the SELLER's account details." },
        { ru: "3.4. Обязательство ПОКУПАТЕЛЯ по оплате считается исполненным в момент поступления денежных средств на корреспондентский счёт банка ПРОДАВЦА.", en: "3.4. The BUYER's payment obligation is deemed fulfilled at the moment the funds are credited to the correspondent account of the SELLER's bank." },
        { ru: '3.5. Стороны согласились использовать Escrow-счёт платформы GLORIX для хранения средств до выполнения условий поставки, что обеспечивает защиту обеих Сторон.', en: '3.5. The Parties have agreed to use the GLORIX platform Escrow account to hold funds until the delivery terms are fulfilled, ensuring protection for both Parties.' },
        { ru: '3.6. При изменении реквизитов ПРОДАВЕЦ обязан уведомить ПОКУПАТЕЛЯ в письменном виде не менее чем за 5 рабочих дней. Платежи по старым реквизитам до получения уведомления считаются надлежащим исполнением.', en: "3.6. In the event of a change of bank details, the SELLER shall notify the BUYER in writing no less than 5 working days in advance. Payments made to the previous bank details prior to receipt of such notice shall be deemed proper performance." },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 4. КАЧЕСТВО ТОВАРА И ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ', en: 'ARTICLE 4. QUALITY OF GOODS AND TECHNICAL REQUIREMENTS' },
      clauses: [
        { ru: '4.1. Товар должен соответствовать техническим характеристикам, стандартам и спецификациям, указанным в Приложении № 1 к настоящему Договору.', en: '4.1. The Goods shall conform to the technical characteristics, standards, and specifications set out in Appendix No. 1 to this Contract.' },
        { ru: '4.2. Качество Товара подтверждается сертификатом качества завода-изготовителя и/или аккредитованной лаборатории.', en: "4.2. The quality of the Goods shall be confirmed by a quality certificate from the manufacturer and/or an accredited laboratory." },
        { ru: '4.3. При поставке оборудования или сложного товара ПРОДАВЕЦ в течение 15 (пятнадцати) календарных дней с даты подписания Договора предоставляет ПОКУПАТЕЛЮ:\nа) график производства/поставки;\nб) еженедельные отчёты о ходе производства (каждую среду до 12:00 по часовому поясу ПРОДАВЦА).', en: "4.3. When supplying equipment or complex goods, the SELLER shall, within 15 (fifteen) calendar days of the date of signing the Contract, provide the BUYER with:\na) a production/delivery schedule;\nb) weekly production progress reports (every Wednesday by 12:00, SELLER's time zone)." },
        { ru: '4.4. ПОКУПАТЕЛЬ вправе осуществлять инспекцию качества Товара на производстве ПРОДАВЦА, привлекая собственных представителей или независимых инспекторов (SGS, Bureau Veritas, Intertek и аналогичные). Расходы на инспекцию несёт ПОКУПАТЕЛЬ, если иное не согласовано Сторонами.', en: "4.4. The BUYER is entitled to carry out a quality inspection of the Goods at the SELLER's production facility, engaging its own representatives or independent inspectors (SGS, Bureau Veritas, Intertek, and similar). Inspection costs shall be borne by the BUYER unless otherwise agreed by the Parties." },
        { ru: '4.5. Товар, произведённый с отклонением от согласованных характеристик без письменного согласия ПОКУПАТЕЛЯ, оплате не подлежит и подлежит возврату за счёт ПРОДАВЦА.', en: "4.5. Goods manufactured with deviation from the agreed specifications without the BUYER's written consent shall not be subject to payment and shall be returned at the SELLER's expense." },
        { ru: '4.6. При привлечении субпоставщиков ПРОДАВЕЦ обязан:\nа) уведомить ПОКУПАТЕЛЯ о каждом субпоставщике;\nб) предоставить внутренний номер заказа субпоставщику;\nв) обеспечить соблюдение субпоставщиком всех условий настоящего Договора.', en: '4.6. When engaging sub-suppliers, the SELLER shall:\na) notify the BUYER of each sub-supplier;\nb) provide the sub-supplier with an internal order number;\nc) ensure the sub-supplier\'s compliance with all terms of this Contract.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 5. ТАРА, УПАКОВКА И МАРКИРОВКА', en: 'ARTICLE 5. CONTAINERS, PACKING, AND MARKING' },
      clauses: [
        { ru: `5.1. Тара и упаковка должны обеспечивать сохранность Товара при транспортировке, погрузке, выгрузке и хранении в соответствии с условиями ${deliveryTermsRu}.`, en: `5.1. Containers and packing shall ensure the preservation of the Goods during transportation, loading, unloading, and storage in accordance with the terms of ${deliveryTermsEn}.` },
        { ru: '5.2. Каждое грузовое место маркируется:\n— наименование и адрес ПОКУПАТЕЛЯ;\n— номер Договора и Спецификации;\n— страна происхождения;\n— габариты: длина × ширина × высота (см);\n— масса брутто/нетто (кг);\n— количество единиц;\n— манипуляционные знаки («Осторожно!», «Хрупкое», «Беречь от влаги», «Верх», «Место строповки»).', en: '5.2. Each shipping package shall be marked with:\n— the BUYER\'s name and address;\n— the Contract and Specification number;\n— country of origin;\n— dimensions: length × width × height (cm);\n— gross/net weight (kg);\n— quantity of units;\n— handling marks ("Caution!", "Fragile", "Keep dry", "This side up", "Sling here").' },
        { ru: '5.3. Упаковка должна допускать вскрытие для проверки содержимого без её уничтожения.', en: '5.3. Packing shall allow for inspection of the contents without destroying it.' },
        { ru: "5.4. ПРОДАВЕЦ несёт ответственность за повреждение Товара вследствие ненадлежащей упаковки до момента передачи Товара уполномоченному лицу ПОКУПАТЕЛЯ.", en: "5.4. The SELLER shall be liable for damage to the Goods resulting from improper packing prior to transfer of the Goods to the BUYER's authorized person." },
        { ru: '5.5. Вся документация (техническая, финансовая, сопроводительная) составляется на русском и английском языках. Оба текста имеют равную юридическую силу.', en: '5.5. All documentation (technical, financial, accompanying) shall be drawn up in Russian and English. Both texts shall have equal legal force.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 6. СРОК И ПОРЯДОК ПОСТАВКИ', en: 'ARTICLE 6. DELIVERY TIME AND PROCEDURE' },
      clauses: [
        { ru: `6.1. Срок поставки: ${deliveryDays || '___'} (${deliveryDays ? 'указать прописью' : '_____________'}) рабочих дней с даты поступления предоплаты на счёт ПРОДАВЦА, если иное не указано в Спецификации.`, en: `6.1. Delivery time: ${deliveryDays || '___'} (${deliveryDays ? 'in words' : '_____________'}) working days from the date the advance payment is received in the SELLER's account, unless otherwise specified in the Specification.` },
        { ru: `6.2. Условия поставки: ${deliveryTermsRu}. Пункт назначения — согласно Спецификации (Приложение № 1).`, en: `6.2. Delivery terms: ${deliveryTermsEn}. Destination point — as per the Specification (Appendix No. 1).` },
        { ru: '6.3. Поставка партиями допускается только при наличии письменного согласия ПОКУПАТЕЛЯ. При поставке партиями каждая партия комплектуется полным пакетом документов согласно ст. 7.', en: "6.3. Delivery in batches is permitted only with the BUYER's written consent. In the case of delivery by batches, each batch shall be accompanied by the full set of documents under Article 7." },
        { ru: '6.4. ПРОДАВЕЦ обязан уведомить ПОКУПАТЕЛЯ о готовности Товара к отгрузке не позднее чем за 10 (десять) рабочих дней до планируемой даты отгрузки.', en: "6.4. The SELLER shall notify the BUYER of the Goods' readiness for shipment no later than 10 (ten) working days prior to the planned shipment date." },
        { ru: '6.5. Сроки устранения нарушений (с даты письменного требования ПОКУПАТЕЛЯ):\nа) допоставка недопоставленного количества — 20 дней;\nб) устранение дефектов без замены Товара — 30 дней;\nв) замена дефектного Товара — 30 дней;\nг) предоставление недостающих документов — 10 дней;\nд) поставка недостающих принадлежностей — 15 дней.\nПраво выбора способа устранения (ремонт или замена) принадлежит ПОКУПАТЕЛЮ.', en: "6.5. Time limits for remedying violations (from the date of the BUYER's written demand):\na) delivery of an undelivered quantity — 20 days;\nb) remedying defects without replacement of the Goods — 30 days;\nc) replacement of defective Goods — 30 days;\nd) provision of missing documents — 10 days;\ne) delivery of missing accessories — 15 days.\nThe right to choose the method of remedy (repair or replacement) belongs to the BUYER." },
        { ru: '6.6. ПОКУПАТЕЛЬ вправе в любое время направить письменное уведомление о приостановлении поставки. ПРОДАВЕЦ обязан приостановить исполнение в течение 3 рабочих дней.', en: '6.6. The BUYER may at any time send written notice to suspend delivery. The SELLER shall suspend performance within 3 working days.' },
        { ru: '6.7. ⚖ ЗЕРКАЛЬНО: ПРОДАВЕЦ вправе приостановить поставку при просрочке оплаты свыше 15 дней, направив уведомление за 3 рабочих дня. Расходы на хранение Товара в период приостановления несёт виновная Сторона.', en: "6.7. ⚖ MIRROR: The SELLER is entitled to suspend delivery if payment is overdue by more than 15 days, by giving 3 working days' notice. Storage costs for the Goods during the suspension period shall be borne by the Party at fault." },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 7. ДОКУМЕНТЫ, ПЕРЕДАВАЕМЫЕ С ТОВАРОМ', en: 'ARTICLE 7. DOCUMENTS ACCOMPANYING THE GOODS' },
      clauses: [
        { ru: '7.1. ПРОДАВЕЦ обязан передать ПОКУПАТЕЛЮ вместе с Товаром:\nа) счёт-фактура (инвойс) с указанием № Договора и Спецификации — 1 ориг. + 1 копия;\nб) товарная/транспортная накладная — 1 ориг. + 1 копия;\nв) сертификат качества (от производителя или аккредитованной лаборатории) — 1 заверенная копия;\nг) сертификат соответствия — 1 заверенная копия;\nд) сертификат происхождения товара (CT-1 для СНГ / Form A / EUR.1 — в зависимости от маршрута) — 1 ориг.;\nе) упаковочный лист (packing list) — 1 ориг.;\nж) транспортная накладная (CMR / коносамент / авиа-AWB) с указанием пункта назначения и ПОКУПАТЕЛЯ — 1 ориг.;\nз) технический паспорт и комплектовочная ведомость (для оборудования) — 1 ориг. + 1 копия;\nи) инструкция по монтажу, эксплуатации, хранению (для оборудования) — 1 ориг.;\nк) документ о порядке хранения и консервации — 1 ориг.', en: '7.1. The SELLER shall provide the BUYER, together with the Goods, with:\na) an invoice indicating the Contract and Specification No. — 1 original + 1 copy;\nb) a commodity/transport waybill — 1 original + 1 copy;\nc) a quality certificate (from the manufacturer or an accredited laboratory) — 1 certified copy;\nd) a certificate of conformity — 1 certified copy;\ne) a certificate of origin (CT-1 for the CIS / Form A / EUR.1 — depending on the route) — 1 original;\nf) a packing list — 1 original;\ng) a transport document (CMR / bill of lading / air waybill) indicating the destination and the BUYER — 1 original;\nh) a technical passport and equipment list (for equipment) — 1 original + 1 copy;\ni) installation, operation, and storage instructions (for equipment) — 1 original;\nj) a document on storage and preservation procedures — 1 original.' },
        { ru: '7.2. Электронные копии всех документов направляются ПОКУПАТЕЛЮ по email в течение 2 рабочих дней с даты отгрузки.', en: '7.2. Electronic copies of all documents shall be sent to the BUYER by email within 2 working days of the date of shipment.' },
        { ru: '7.3. При обнаружении ошибок, несоответствий или неполноты документов ПОКУПАТЕЛЬ направляет замечания в течение 5 рабочих дней. ПРОДАВЕЦ исправляет и предоставляет корректные документы в течение 5 рабочих дней.', en: '7.3. If errors, discrepancies, or incomplete documents are discovered, the BUYER shall send its comments within 5 working days. The SELLER shall correct and provide accurate documents within 5 working days.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 8. ПОРЯДОК ПРИЁМКИ ТОВАРА', en: 'ARTICLE 8. GOODS ACCEPTANCE PROCEDURE' },
      clauses: [
        { ru: "8.1. Приёмка Товара осуществляется уполномоченным лицом ПОКУПАТЕЛЯ на основании доверенности.", en: "8.1. Acceptance of the Goods shall be carried out by the BUYER's authorized person on the basis of a power of attorney." },
        { ru: '8.2. При приёмке проверяется соответствие Товара по:\n— наименованию, ассортименту, комплектности;\n— количеству (вес, объём, штуки);\n— внешнему виду (видимые повреждения, состояние упаковки).', en: "8.2. Upon acceptance, the Goods shall be checked for compliance with respect to:\n— description, range, and completeness;\n— quantity (weight, volume, units);\n— appearance (visible damage, condition of packing)." },
        { ru: '8.3. Акт приёма-передачи подписывается уполномоченными представителями обеих Сторон в течение 10 рабочих дней после доставки Товара на указанный пункт назначения.', en: '8.3. The Acceptance Certificate shall be signed by authorized representatives of both Parties within 10 working days of delivery of the Goods to the specified destination point.' },
        { ru: '8.4. При выявлении несоответствий ПОКУПАТЕЛЬ:\n— не подписывает Акт приёма-передачи;\n— в течение 3 рабочих дней направляет письменное уведомление ПРОДАВЦУ с перечнем претензий;\n— вызывает представителя ПРОДАВЦА для составления Акта о выявленных недостатках (дефектного акта).', en: "8.4. If discrepancies are discovered, the BUYER shall:\n— not sign the Acceptance Certificate;\n— send the SELLER written notice with a list of claims within 3 working days;\n— call the SELLER's representative to draw up a Defects Report." },
        { ru: '8.5. Представитель ПРОДАВЦА обязан явиться в течение 5 рабочих дней с даты получения вызова. При неявке ПОКУПАТЕЛЬ вправе составить дефектный акт односторонне с привлечением независимого инспектора.', en: "8.5. The SELLER's representative shall appear within 5 working days of receiving the call. If the representative fails to appear, the BUYER may draw up the Defects Report unilaterally, engaging an independent inspector." },
        { ru: '8.6. Право собственности и риск случайной гибели/повреждения Товара переходят от ПРОДАВЦА к ПОКУПАТЕЛЮ с момента подписания обеими Сторонами Акта приёма-передачи.', en: '8.6. Title to and risk of accidental loss or damage of the Goods shall pass from the SELLER to the BUYER upon both Parties signing the Acceptance Certificate.' },
        { ru: '8.7. Подписанный без замечаний Акт приёма-передачи свидетельствует об отсутствии претензий ПОКУПАТЕЛЯ к количеству, комплектности и внешнему состоянию Товара на дату приёмки.', en: '8.7. An Acceptance Certificate signed without comments shall evidence the absence of any claims by the BUYER as to the quantity, completeness, and external condition of the Goods as of the date of acceptance.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 9. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА', en: 'ARTICLE 9. WARRANTY OBLIGATIONS' },
      clauses: [
        { ru: '9.1. ПРОДАВЕЦ гарантирует безупречную работу и соответствие Товара заявленным характеристикам в течение 24 (двадцати четырёх) месяцев с даты подписания Акта приёма-передачи (далее — «Гарантийный срок»).', en: '9.1. The SELLER warrants the proper operation and conformity of the Goods to the stated specifications for 24 (twenty-four) months from the date of signing the Acceptance Certificate (hereinafter — the "Warranty Period").' },
        { ru: '9.2. В течение Гарантийного срока ПРОДАВЕЦ обязан за свой счёт устранить все дефекты или произвести замену дефектного Товара в срок, согласованный Сторонами, но не более 30 дней с даты уведомления.', en: "9.2. During the Warranty Period, the SELLER shall, at its own expense, remedy all defects or replace defective Goods within a period agreed by the Parties, not to exceed 30 days from the date of notice." },
        { ru: '9.3. ПРОДАВЕЦ не несёт гарантийных обязательств в случае:\n— повреждения, вызванного нарушением инструкции по эксплуатации ПОКУПАТЕЛЕМ;\n— повреждения при транспортировке, организованной ПОКУПАТЕЛЕМ (в случае условий EXW, FCA, FOB);\n— воздействия непреодолимой силы (форс-мажор).', en: "9.3. The SELLER shall bear no warranty obligation in the event of:\n— damage caused by the BUYER's breach of the operating instructions;\n— damage during transportation arranged by the BUYER (in the case of EXW, FCA, or FOB terms);\n— force majeure (Article 12)." },
        { ru: '9.4. Гарантийный срок продлевается на период, в течение которого ПОКУПАТЕЛЬ был лишён возможности использовать Товар по вине ПРОДАВЦА.', en: "9.4. The Warranty Period shall be extended by the period during which the BUYER was unable to use the Goods due to the SELLER's fault." },
        { ru: '9.5. Все расходы, связанные с заменой и ремонтом Товара в рамках гарантии, несёт ПРОДАВЕЦ.', en: '9.5. All costs related to the replacement and repair of the Goods under warranty shall be borne by the SELLER.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 10. ОТВЕТСТВЕННОСТЬ СТОРОН (⚖ ЗЕРКАЛЬНЫЕ ШТРАФНЫЕ САНКЦИИ)', en: 'ARTICLE 10. LIABILITY OF THE PARTIES (⚖ MIRRORED PENALTIES)' },
      clauses: [
        { ru: `10.1. ПРОСРОЧКА ПОСТАВКИ — ответственность ПРОДАВЦА:\nЗа каждый календарный день просрочки поставки сверх установленного срока ПРОДАВЕЦ уплачивает пеню в размере ${rate}% (${rate} процентов) от стоимости непоставленного в срок Товара.\nМаксимальный размер пени: ${maxP}% от стоимости Товара.\nВыплата: в течение 10 дней с даты письменного требования.`, en: `10.1. DELAY IN DELIVERY — SELLER's liability:\nFor each calendar day of delay in delivery beyond the established time limit, the SELLER shall pay a penalty of ${rate}% (${rate} percent) of the value of the Goods not delivered on time.\nMaximum penalty: ${maxP}% of the value of the Goods.\nPayment: within 10 days of the date of written demand.` },
        { ru: `10.2. ПРОСРОЧКА ОПЛАТЫ — ответственность ПОКУПАТЕЛЯ:\n⚖ ЗЕРКАЛЬНО п. 10.1 — ОДИНАКОВЫЕ УСЛОВИЯ:\nЗа каждый календарный день просрочки оплаты ПОКУПАТЕЛЬ уплачивает пеню в размере ${rate}% от неоплаченной суммы.\nМаксимальный размер пени: ${maxP}% от суммы долга.\nВыплата: в течение 10 дней с даты письменного требования.\n[Исключение: форс-мажорные обстоятельства по ст. 12]`, en: `10.2. DELAY IN PAYMENT — BUYER's liability:\n⚖ MIRRORS clause 10.1 — IDENTICAL TERMS:\nFor each calendar day of delay in payment, the BUYER shall pay a penalty of ${rate}% of the unpaid amount.\nMaximum penalty: ${maxP}% of the amount owed.\nPayment: within 10 days of the date of written demand.\n[Exception: force majeure under Article 12]` },
        { ru: '10.3. НЕПОСТАВКА ТОВАРА — ответственность ПРОДАВЦА:\nПри непоставке Товара в течение 20 дней после истечения срока поставки ПРОДАВЕЦ обязан:\nа) вернуть всю полученную предоплату в течение 10 дней;\nб) уплатить штраф в размере 10% от стоимости непоставленного Товара.', en: "10.3. NON-DELIVERY OF GOODS — SELLER's liability:\nIn the event of non-delivery of the Goods within 20 days of the expiry of the delivery period, the SELLER shall:\na) refund all advance payment received within 10 days;\nb) pay a penalty of 10% of the value of the undelivered Goods." },
        { ru: '10.4. ОТКАЗ ОТ ОПЛАТЫ — ответственность ПОКУПАТЕЛЯ:\n⚖ ЗЕРКАЛЬНО п. 10.3 — ОДИНАКОВЫЕ УСЛОВИЯ:\nПри необоснованном отказе от оплаты поставленного Товара ПОКУПАТЕЛЬ обязан:\nа) принять Товар и оплатить его в течение 10 дней;\nб) уплатить штраф в размере 10% от стоимости Товара.\nПРОДАВЕЦ вправе потребовать возврата Товара.', en: "10.4. REFUSAL TO PAY — BUYER's liability:\n⚖ MIRRORS clause 10.3 — IDENTICAL TERMS:\nIn the event of unjustified refusal to pay for delivered Goods, the BUYER shall:\na) accept the Goods and pay for them within 10 days;\nb) pay a penalty of 10% of the value of the Goods.\nThe SELLER may demand the return of the Goods." },
        { ru: `10.5. НАРУШЕНИЕ КАЧЕСТВА — ответственность ПРОДАВЦА:\nПри непоставке документов (ст. 7) или нарушении графика производства ПРОДАВЕЦ уплачивает пеню ${rate}%/день от стоимости партии. Максимум — ${maxP}%.`, en: `10.5. QUALITY VIOLATION — SELLER's liability:\nIn the event of non-delivery of documents (Article 7) or breach of the production schedule, the SELLER shall pay a penalty of ${rate}%/day of the value of the batch. Maximum — ${maxP}%.` },
        { ru: `10.6. НЕОБОСНОВАННЫЙ ОТКАЗ ОТ ПРИЁМКИ — ответственность ПОКУПАТЕЛЯ:\n⚖ ЗЕРКАЛЬНО п. 10.5:\nПри необоснованном уклонении от приёмки Товара ПОКУПАТЕЛЬ возмещает расходы ПРОДАВЦА на хранение и уплачивает пеню ${rate}%/день от стоимости Товара.`, en: `10.6. UNJUSTIFIED REFUSAL TO ACCEPT — BUYER's liability:\n⚖ MIRRORS clause 10.5:\nIn the event of unjustified evasion of acceptance of the Goods, the BUYER shall reimburse the SELLER's storage costs and pay a penalty of ${rate}%/day of the value of the Goods.` },
        { ru: '10.7. ПРАВО ЗАЧЁТА:\nПОКУПАТЕЛЬ вправе зачесть подлежащие уплате ПРОДАВЦОМ штрафы против платежей ПОКУПАТЕЛЯ.\n⚖ ЗЕРКАЛЬНО: ПРОДАВЕЦ вправе удержать из оставшихся поставок стоимость неоплаченных партий.', en: "10.7. RIGHT OF SET-OFF:\nThe BUYER may set off penalties payable by the SELLER against the BUYER's payments.\n⚖ MIRROR: The SELLER may withhold the value of unpaid batches from remaining deliveries." },
        { ru: '10.8. Уплата штрафов и пеней НЕ освобождает виновную Сторону от исполнения обязательств по Договору. Все санкции взыскиваются ПОМИМО возмещения убытков.', en: '10.8. Payment of fines and penalties shall NOT release the Party at fault from performing its obligations under the Contract. All sanctions shall be recovered IN ADDITION TO compensation for losses.' },
        { ru: 'ПОКУПАТЕЛЬ вправе приостановить платежи ПРОДАВЦУ до устранения нарушений со стороны ПРОДАВЦА.\n⚖ ЗЕРКАЛЬНО: ПРОДАВЕЦ вправе приостановить поставку до устранения просрочки оплаты со стороны ПОКУПАТЕЛЯ.\nПриостановление не является нарушением Договора.', en: "10.9. SUSPENSION OF PAYMENTS:\nThe BUYER may suspend payments to the SELLER until the SELLER's violations are remedied.\n⚖ MIRROR: The SELLER may suspend delivery until the BUYER's payment delay is remedied.\nSuspension shall not constitute a breach of the Contract." },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 11. ПРЕТЕНЗИОННЫЙ ПОРЯДОК', en: 'ARTICLE 11. CLAIMS PROCEDURE' },
      clauses: [
        { ru: '11.1. Все претензии направляются в письменной форме (заказное письмо с уведомлением о вручении + email). Обращение в арбитраж допускается только после соблюдения претензионного порядка.', en: '11.1. All claims shall be submitted in writing (registered letter with acknowledgment of receipt + email). Recourse to arbitration is permitted only after compliance with the claims procedure.' },
        { ru: '11.2. Претензия должна содержать:\n— наименование, количество Товара;\n— суть нарушения, ссылку на пункт Договора;\n— сумму требований с расчётом;\n— приложения: акты, фото, экспертные заключения, накладные, сертификаты.', en: '11.2. A claim shall contain:\n— the description and quantity of the Goods;\n— the substance of the violation, with reference to the relevant Contract clause;\n— the amount claimed, with calculation;\n— attachments: certificates, photographs, expert opinions, waybills, certificates.' },
        { ru: '11.3. Сторона, получившая претензию, обязана дать письменный мотивированный ответ в течение 30 (тридцати) календарных дней.', en: '11.3. The Party receiving the claim shall provide a written, reasoned response within 30 (thirty) calendar days.' },
        { ru: '11.4. Если Сторона не воспользовалась правом проверки обоснованности претензии — претензия считается признанной.', en: '11.4. If a Party fails to exercise its right to verify the validity of the claim, the claim shall be deemed accepted.' },
        { ru: '11.5. При частичном признании претензии Сторона указывает признанную и оспариваемую части.', en: '11.5. In the event of partial acceptance of a claim, the Party shall indicate the accepted and disputed portions thereof.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 12. ФОРС-МАЖОР (ОБСТОЯТЕЛЬСТВА НЕПРЕОДОЛИМОЙ СИЛЫ)', en: 'ARTICLE 12. FORCE MAJEURE' },
      clauses: [
        { ru: '12.1. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств, если таковое явилось следствием обстоятельств непреодолимой силы, возникших после заключения Договора, а именно: стихийные бедствия (землетрясение, наводнение, ураган, цунами), военные действия, блокада, мятеж, восстание, революция, введение чрезвычайного или военного положения, эпидемия, пандемия, карантин, забастовки, правительственные запреты и ограничения, санкции, введённые после подписания Договора.', en: '12.1. The Parties shall be released from liability for partial or complete non-performance of obligations if such non-performance results from circumstances of force majeure arising after conclusion of the Contract, namely: natural disasters (earthquake, flood, hurricane, tsunami), military action, blockade, riot, insurrection, revolution, declaration of a state of emergency or martial law, epidemic, pandemic, quarantine, strikes, government prohibitions and restrictions, and sanctions imposed after the signing of the Contract.' },
        { ru: '12.2. Сторона, столкнувшаяся с форс-мажором, обязана уведомить другую Сторону в письменной форме в течение 14 (четырнадцати) календарных дней с момента наступления форс-мажорных обстоятельств. Факт форс-мажора подтверждается заключением компетентного государственного органа или Торгово-промышленной палаты страны, где произошли соответствующие события.', en: '12.2. A Party affected by force majeure shall notify the other Party in writing within 14 (fourteen) calendar days of the occurrence of the force majeure event. The fact of force majeure shall be confirmed by a certificate from the competent state authority or the Chamber of Commerce and Industry of the country where the relevant events occurred.' },
        { ru: '12.3. Несоблюдение срока уведомления лишает Сторону права ссылаться на форс-мажор как основание освобождения от ответственности.', en: '12.3. Failure to comply with the notification period shall deprive the Party of the right to rely on force majeure as grounds for release from liability.' },
        { ru: 'Если форс-мажорные обстоятельства продолжаются более 90 (девяноста) календарных дней, каждая из Сторон вправе расторгнуть Договор без взаимных санкций, направив письменное уведомление. ПРОДАВЕЦ обязан вернуть ПОКУПАТЕЛЮ всю уплаченную предоплату за непоставленный Товар в течение 10 рабочих дней с даты расторжения.', en: '12.4. If force majeure circumstances continue for more than 90 (ninety) calendar days, either Party may terminate the Contract without mutual sanctions by giving written notice. The SELLER shall refund to the BUYER all advance payment made for undelivered Goods within 10 working days of the date of termination.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 13. РАСТОРЖЕНИЕ ДОГОВОРА', en: 'ARTICLE 13. TERMINATION OF THE CONTRACT' },
      clauses: [
        { ru: '13.1. ПОКУПАТЕЛЬ вправе в одностороннем внесудебном порядке расторгнуть Договор с немедленным возвратом уплаченных сумм в случае, если ПРОДАВЕЦ:\nа) признан несостоятельным (банкротом);\nб) начал процедуру ликвидации;\nв) допустил просрочку поставки более чем на 30 дней;\nг) отказался от исполнения Договора.', en: '13.1. The BUYER may unilaterally terminate the Contract out of court, with immediate refund of amounts paid, if the SELLER:\na) is declared insolvent (bankrupt);\nb) has commenced liquidation proceedings;\nc) has delayed delivery by more than 30 days;\nd) has refused to perform the Contract.' },
        { ru: '13.2. ⚖ ЗЕРКАЛЬНО: ПРОДАВЕЦ вправе расторгнуть Договор, если ПОКУПАТЕЛЬ:\nа) допустил просрочку оплаты более чем на 30 дней;\nб) отказался принимать надлежащий Товар без оснований;\nв) признан несостоятельным или начал процедуру ликвидации.', en: '13.2. ⚖ MIRROR: The SELLER may terminate the Contract if the BUYER:\na) has delayed payment by more than 30 days;\nb) has refused without grounds to accept conforming Goods;\nc) is declared insolvent or has commenced liquidation proceedings.' },
        { ru: '13.3. ПОКУПАТЕЛЬ вправе расторгнуть Договор по своему усмотрению (convenience termination), направив письменное уведомление за 30 дней. В этом случае ПОКУПАТЕЛЬ возмещает ПРОДАВЦУ документально подтверждённые прямые расходы, понесённые до получения уведомления о расторжении, но не более стоимости фактически изготовленного/поставленного Товара.', en: "13.3. The BUYER may terminate the Contract for convenience by giving 30 days' written notice. In such case, the BUYER shall reimburse the SELLER for documented direct costs incurred prior to receipt of the termination notice, not to exceed the value of Goods actually manufactured/delivered." },
        { ru: '13.4. После расторжения ПРОДАВЕЦ обязан:\nа) немедленно прекратить поставку и производство;\nб) передать ПОКУПАТЕЛЮ уже изготовленный Товар;\nв) предоставить всю документацию по Товару;\nг) при расторжении по вине ПРОДАВЦА — возместить ПОКУПАТЕЛЮ расходы на завершение поставки от третьей стороны.', en: "13.4. Upon termination, the SELLER shall:\na) immediately cease delivery and production;\nb) transfer to the BUYER any Goods already manufactured;\nc) provide all documentation relating to the Goods;\nd) where termination is due to the SELLER's fault, reimburse the BUYER for the cost of completing delivery through a third party." },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 14. КОНФИДЕНЦИАЛЬНОСТЬ', en: 'ARTICLE 14. CONFIDENTIALITY' },
      clauses: [
        { ru: '14.1. Стороны признают конфиденциальной всю информацию, полученную в связи с исполнением настоящего Договора, включая: коммерческие условия, цены, технические характеристики, информацию о контрагентах.', en: '14.1. The Parties shall treat as confidential all information obtained in connection with the performance of this Contract, including: commercial terms, prices, technical specifications, and information about counterparties.' },
        { ru: '14.2. Стороны обязуются:\nа) не раскрывать конфиденциальную информацию третьим лицам без письменного согласия другой Стороны, за исключением случаев, предусмотренных применимым законодательством;\nб) принимать меры защиты, не менее строгие, чем те, что применяются для собственной информации.', en: "14.2. The Parties undertake to:\na) not disclose confidential information to third parties without the other Party's written consent, except as required by applicable law;\nb) take protective measures no less stringent than those applied to their own information." },
        { ru: '14.3. Обязательство по конфиденциальности действует в течение 3 (трёх) лет после прекращения Договора.', en: '14.3. The confidentiality obligation shall remain in effect for 3 (three) years after termination of the Contract.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 15. АНТИКОРРУПЦИОННАЯ ОГОВОРКА', en: 'ARTICLE 15. ANTI-CORRUPTION CLAUSE' },
      clauses: [
        { ru: '15.1. Стороны обязуются соблюдать применимое антикоррупционное законодательство, включая Закон Великобритании о взяточничестве 2010 г. (UK Bribery Act), Закон США о коррупции за рубежом (FCPA) и национальные антикоррупционные законы.', en: '15.1. The Parties undertake to comply with applicable anti-corruption legislation, including the UK Bribery Act 2010, the US Foreign Corrupt Practices Act (FCPA), and applicable national anti-corruption laws.' },
        { ru: '15.2. Стороны не предлагают, не обещают, не дают и не принимают взяток, незаконных вознаграждений или иных ненадлежащих выгод ни в какой форме.', en: '15.2. The Parties shall not offer, promise, give, or accept bribes, unlawful remuneration, or any other improper benefit in any form.' },
        { ru: '15.3. Нарушение данной статьи предоставляет другой Стороне право немедленно расторгнуть Договор без каких-либо финансовых последствий для расторгающей Стороны.', en: '15.3. A breach of this Article shall entitle the other Party to terminate the Contract immediately, with no financial consequences for the terminating Party.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 16. ПРИМЕНИМОЕ ПРАВО И РАЗРЕШЕНИЕ СПОРОВ', en: 'ARTICLE 16. GOVERNING LAW AND DISPUTE RESOLUTION' },
      clauses: [
        { ru: `16.1. ПРИМЕНИМОЕ ПРАВО:\n${appliedLawRu}\n${scope === 'international' ? 'Конвенция ООН о договорах международной купли-продажи товаров (КМКПТ/CISG, Вена, 1980) применяется в части, не урегулированной выбранным правом.' : `Законодательство ${sellerCountryName} применяется субсидиарно.`}`, en: `16.1. GOVERNING LAW:\n${appliedLawEn}\n${scope === 'international' ? 'The United Nations Convention on Contracts for the International Sale of Goods (CISG, Vienna, 1980) shall apply to matters not governed by the chosen law.' : `The law of ${sellerCountryName} shall apply on a subsidiary basis.`}` },
        { ru: '16.2. ЯЗЫКИ ДОГОВОРА:\nНастоящий Договор составлен на русском и английском языках. Оба текста имеют равную юридическую силу. При противоречии русский текст имеет приоритет для сделок в СНГ; английский — для международных.', en: '16.2. LANGUAGES OF THE CONTRACT:\nThis Contract is executed in Russian and English. Both texts shall have equal legal force. In the event of any discrepancy, the Russian text shall prevail for transactions within the CIS; the English text shall prevail for international transactions.' },
        { ru: `16.3. РАЗРЕШЕНИЕ СПОРОВ — ТРЁХЭТАПНАЯ ПРОЦЕДУРА:\n\nЭТАП 1 — ПЕРЕГОВОРЫ (обязателен):\nСтороны обязаны предпринять добросовестные попытки урегулировать спор путём переговоров в течение 30 (тридцати) календарных дней с даты направления письменного уведомления о споре.\n\nЭТАП 2 — МЕДИАЦИЯ (при недостижении соглашения):\nЕсли переговоры не привели к результату, Стороны вправе обратиться к медиатору, согласованному обеими Сторонами, в течение 15 дней.\n\nЭТАП 3 — АРБИТРАЖ (окончательный):\n${arbRu}\nЯзык арбитражного производства: русский / английский.\nСостав арбитража: один арбитр (для споров до $1 млн), три арбитра (для споров свыше $1 млн).\nРешение арбитража является окончательным и обязательным для исполнения обеими Сторонами.\n${scope === 'international' ? 'Признание и исполнение решений — по Нью-Йоркской конвенции 1958 г.' : ''}`, en: `16.3. DISPUTE RESOLUTION — THREE-STAGE PROCEDURE:\n\nSTAGE 1 — NEGOTIATION (mandatory):\nThe Parties shall make good-faith efforts to resolve any dispute through negotiation within 30 (thirty) calendar days of the date written notice of the dispute is given.\n\nSTAGE 2 — MEDIATION (if no agreement is reached):\nIf negotiation does not result in a resolution, the Parties may refer the matter to a mediator agreed by both Parties within 15 days.\n\nSTAGE 3 — ARBITRATION (final):\n${arbEn}\nLanguage of arbitral proceedings: Russian / English.\nComposition of the tribunal: one arbitrator (for disputes up to USD 1 million); three arbitrators (for disputes exceeding USD 1 million).\nThe arbitral award shall be final and binding on both Parties.\n${scope === 'international' ? 'Recognition and enforcement of awards shall be governed by the 1958 New York Convention.' : ''}` },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 17. ПЕРЕПИСКА МЕЖДУ СТОРОНАМИ', en: 'ARTICLE 17. CORRESPONDENCE BETWEEN THE PARTIES' },
      clauses: [
        { ru: '17.1. Официальная переписка направляется по реквизитам, указанным в ст. 19, способами:\n— курьерская служба (DHL, FedEx, EMS и аналоги);\n— заказное письмо с уведомлением о вручении;\n— email (для оперативной переписки, без юридических последствий, если иное не согласовано).', en: '17.1. Official correspondence shall be sent to the details specified in Article 19, by the following means:\n— courier service (DHL, FedEx, EMS, and similar);\n— registered letter with acknowledgment of receipt;\n— email (for routine correspondence, without legal effect unless otherwise agreed).' },
        { ru: '17.2. Корреспонденция считается полученной:\n— при курьерской доставке — в день вручения;\n— при почтовой отправке — на 7-й день с даты сдачи;\n— при отправке по email — в день отправки (при отсутствии уведомления о недоставке).', en: '17.2. Correspondence shall be deemed received:\n— by courier — on the day of delivery;\n— by post — on the 7th day from the date of dispatch;\n— by email — on the day of sending (absent a non-delivery notification).' },
        { ru: '17.3. Об изменении реквизитов Сторона уведомляет другую Сторону в письменной форме в течение 3 рабочих дней.', en: '17.3. A Party shall notify the other Party in writing of any change of details within 3 working days.' },
      ],
    },
    {
      heading: { ru: 'СТАТЬЯ 18. ПРОЧИЕ УСЛОВИЯ', en: 'ARTICLE 18. MISCELLANEOUS' },
      clauses: [
        { ru: '18.1. Настоящий Договор вступает в силу с даты подписания обеими Сторонами и действует до полного исполнения Сторонами всех обязательств по нему.', en: '18.1. This Contract shall enter into force on the date of signing by both Parties and shall remain in effect until the Parties have fully performed all their obligations hereunder.' },
        { ru: '18.2. Все изменения и дополнения к Договору действительны только в письменной форме, подписанные уполномоченными представителями обеих Сторон.', en: '18.2. All amendments and supplements to the Contract shall be valid only if made in writing and signed by authorized representatives of both Parties.' },
        { ru: '18.3. ПРОДАВЕЦ не вправе передавать права и обязанности по настоящему Договору третьим лицам без письменного согласия ПОКУПАТЕЛЯ.\n⚖ ЗЕРКАЛЬНО: ПОКУПАТЕЛЬ не вправе уступать права требования без письменного согласия ПРОДАВЦА.', en: "18.3. The SELLER shall not assign its rights and obligations under this Contract to third parties without the BUYER's written consent.\n⚖ MIRROR: The BUYER shall not assign its claims without the SELLER's written consent." },
        { ru: '18.4. Недействительность одного или нескольких положений Договора не влечёт недействительности остальных положений. Стороны заменяют недействительные положения юридически действительными, максимально близкими по смыслу.', en: '18.4. The invalidity of one or more provisions of the Contract shall not entail the invalidity of the remaining provisions. The Parties shall replace any invalid provision with a legally valid one as close in meaning as possible.' },
        { ru: '18.5. Договор составлен в 2 (двух) экземплярах на русском и английском языках, имеющих равную юридическую силу, по одному экземпляру для каждой Стороны.', en: '18.5. The Contract is executed in 2 (two) counterparts in Russian and English, having equal legal force, one counterpart for each Party.' },
        { ru: '18.6. Все предшествующие переговоры, соглашения и переписка по предмету настоящего Договора утрачивают юридическую силу с момента его подписания.', en: '18.6. All prior negotiations, agreements, and correspondence relating to the subject matter of this Contract shall cease to have legal effect upon its signing.' },
      ],
    },
  ];

  return {
    title: { ru: 'ДОГОВОР КУПЛИ-ПРОДАЖИ', en: 'SALE AND PURCHASE CONTRACT' },
    num,
    city: city || 'Ташкент',
    date: d,
    year,
    seller: sellerName,
    buyer: buyerName,
    sellerCountryName,
    buyerCountryName,
    contractLang,
    appliedLaw: { ru: appliedLawRu, en: appliedLawEn },
    rate, maxP,
    sections,
    appendices: {
      ru: 'ПРИЛОЖЕНИЯ К ДОГОВОРУ:\nПриложение № 1 — Спецификация (технические характеристики, количество, цена, единица измерения)\nПриложение № 2 — Акт приёма-передачи (форма)\nПриложение № 3 — График производства/поставки (при необходимости)',
      en: 'APPENDICES TO THE CONTRACT:\nAppendix No. 1 — Specification (technical characteristics, quantity, price, unit of measurement)\nAppendix No. 2 — Acceptance Certificate (form)\nAppendix No. 3 — Production/delivery schedule (if applicable)',
    },
    disclaimer: {
      ru: `⚠ ПРИМЕЧАНИЕ GLORIX LEGAL AI:\nДокумент составлен по стандарту международного коммерческого права. Применимое право: ${appliedLawRu}.\nЗеркальные штрафные санкции: ${rate}%/день, макс. ${maxP}%.\nРекомендуется проверка квалифицированным юристом перед подписанием.\nДата генерации: ${d}`,
      en: `⚠ GLORIX LEGAL AI NOTE:\nThis document has been drafted in accordance with international commercial law standards. Governing law: ${appliedLawEn}.\nMirrored penalties: ${rate}%/day, maximum ${maxP}%.\nReview by a qualified lawyer is recommended prior to signing.\nGenerated on: ${d}`,
    },
  };
}
