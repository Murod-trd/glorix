import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
} from 'docx';

// ─────────────────────────────────────────────────────────────────────────────
// Генерирует .docx КП с профессиональной таблицей (аналог PDF-версии).
// kpData = { kpNum, dateStr, validStr, sellerName, buyer, incoterms, payTerms,
//            items: [{name,tnved,unit,qty,price}], totalAmount }
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadKpAsDocx(kpData, filename = 'glorix-kp.docx') {
  const { kpNum, dateStr, validStr, sellerName, buyer, incoterms, payTerms, currency, items, totalAmount, vatAmount = 0, grandTotal, vatRate = 0 } = kpData;
  const finalTotal = vatRate > 0 ? (grandTotal || totalAmount) : totalAmount;
  const CURR_SYMBOLS = { USD:'$', EUR:'€', RUB:'₽', UZS:'сум', KZT:'₸', UAH:'₴',
    BYN:'Br', AZN:'₼', AMD:'֏', GEL:'₾', TJS:'SM', TMT:'T', KGS:'с', MDL:'L',
    CNY:'¥', TRY:'₺', GBP:'£', JPY:'¥' };
  const currSym = CURR_SYMBOLS[currency] || currency;
  const validItems = (items || []).filter(i => i.name);

  const fmt = (n) =>
    (parseFloat(n) || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Цвета (hex без #) ──────────────────────────────────────────────────────
  const NAVY    = '1a2233';
  const FOOTER  = '0f1a28';
  const WHITE   = 'ffffff';
  const ACCENT  = '00d4aa';
  const EVEN    = 'f8f9fb';
  const ODD     = 'ffffff';
  const GREEN   = '1a7a4a';
  const RED_COL = 'c0392b';
  const BORDER  = 'dde3ea';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const bd = (color = BORDER) => ({ style: BorderStyle.SINGLE, size: 4, color });
  const darkBd = () => ({ style: BorderStyle.SINGLE, size: 6, color: NAVY });

  const cell = ({ text, width, fill, color = NAVY, bold = false, align = AlignmentType.LEFT,
                  borderColor = BORDER, size = 18 }) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      shading: { type: ShadingType.SOLID, fill },
      borders: { top: bd(borderColor), bottom: bd(borderColor), left: bd(borderColor), right: bd(borderColor) },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text ?? ''), bold, color, size, font: 'Calibri' })],
      })],
    });

  // ── Ширины колонок (единицы DXA = 1/20 pt) ────────────────────────────────
  // Итого: ~9300 DXA ≈ ширина A4 минус поля
  const W = { n: 400, name: 3500, tnved: 1400, unit: 550, qty: 900, price: 1250, sum: 1300 };

  // ── Заголовок таблицы ──────────────────────────────────────────────────────
  const HEADER_BG = 'e8edf5';  // светло-синий (не чёрный) — виден в Word
  const mkTh = (txt, width, align = AlignmentType.CENTER) =>
    cell({ text: txt, width, fill: HEADER_BG, color: NAVY, bold: true, align, borderColor: 'b0bdd6', size: 18 });

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      mkTh('№', W.n),
      mkTh('Наименование / Description', W.name, AlignmentType.LEFT),
      mkTh('Код ТН ВЭД / HS Code', W.tnved),
      mkTh('Ед.изм / Unit', W.unit),
      mkTh('К-во / Q\'ty', W.qty, AlignmentType.RIGHT),
      mkTh(`Цена за ед. / Unit price, ${currSym}`, W.price, AlignmentType.RIGHT),
      mkTh(`Сумма / Amount, ${currSym}`, W.sum, AlignmentType.RIGHT),
    ],
  });

  // ── Строки данных ──────────────────────────────────────────────────────────
  const dataRows = validItems.map((item, idx) => {
    const subtotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
    const fill = idx % 2 === 0 ? EVEN : ODD;
    const mk = (text, width, align, color = NAVY, bold = false) =>
      cell({ text, width, fill, color, bold, align, size: 18 });

    return new TableRow({ children: [
      mk(idx + 1, W.n, AlignmentType.CENTER),
      mk(item.name, W.name, AlignmentType.LEFT, '1a2233', true),
      mk(item.tnved || '—', W.tnved, AlignmentType.CENTER, item.tnved ? GREEN : RED_COL),
      mk(item.unit, W.unit, AlignmentType.CENTER),
      mk(fmt(item.qty), W.qty, AlignmentType.RIGHT),
      mk(fmt(item.price) + ' ' + currSym, W.price, AlignmentType.RIGHT),
      mk(fmt(subtotal) + ' ' + currSym, W.sum, AlignmentType.RIGHT, '0a5522', true),
    ]});
  });

  // ── НДС строки (если vatRate > 0) ────────────────────────────────────────
  const lightBd = () => ({ style: BorderStyle.SINGLE, size: 4, color: 'dde3ea' });
  const vatRows = vatRate > 0 ? [
    new TableRow({ children: [
      new TableCell({
        columnSpan: 6,
        shading: { type: ShadingType.SOLID, fill: 'f8f9fb' },
        borders: { top: lightBd(), bottom: lightBd(), left: lightBd(), right: lightBd() },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Сумма без НДС / Amount excl. VAT:', color: '555555', size: 20, font: 'Calibri' })],
        })],
      }),
      new TableCell({
        shading: { type: ShadingType.SOLID, fill: 'f8f9fb' },
        borders: { top: lightBd(), bottom: lightBd(), left: lightBd(), right: lightBd() },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `${fmt(totalAmount)} ${currSym}`, size: 20, font: 'Calibri' })],
        })],
      }),
    ]}),
    new TableRow({ children: [
      new TableCell({
        columnSpan: 6,
        shading: { type: ShadingType.SOLID, fill: 'f8f9fb' },
        borders: { top: lightBd(), bottom: lightBd(), left: lightBd(), right: lightBd() },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `НДС ${vatRate}% / VAT ${vatRate}%:`, color: 'e67e22', size: 20, font: 'Calibri' })],
        })],
      }),
      new TableCell({
        shading: { type: ShadingType.SOLID, fill: 'f8f9fb' },
        borders: { top: lightBd(), bottom: lightBd(), left: lightBd(), right: lightBd() },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `${fmt(vatAmount)} ${currSym}`, color: 'e67e22', size: 20, font: 'Calibri' })],
        })],
      }),
    ]}),
  ] : [];

  // ── Итоговая строка ────────────────────────────────────────────────────────
  const totalLabel = vatRate > 0 ? `ИТОГО / TOTAL  (${incoterms} 2020, ${currency}) С НДС ${vatRate}%:` : `ИТОГО / TOTAL  (${incoterms} 2020, ${currency}):`;
  const totalRow = new TableRow({ children: [
    new TableCell({
      columnSpan: 6,
      shading: { type: ShadingType.SOLID, fill: FOOTER },
      borders: { top: darkBd(), bottom: darkBd(), left: darkBd(), right: darkBd() },
      margins: { top: 100, bottom: 100, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: totalLabel, bold: true, color: WHITE, size: 22, font: 'Calibri' })],
      })],
    }),
    new TableCell({
      shading: { type: ShadingType.SOLID, fill: FOOTER },
      borders: { top: darkBd(), bottom: darkBd(), left: darkBd(), right: darkBd() },
      margins: { top: 100, bottom: 100, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: `${fmt(finalTotal)} ${currSym}`, bold: true, color: ACCENT, size: 22, font: 'Calibri' })],
      })],
    }),
  ]});

  // ── Таблица ────────────────────────────────────────────────────────────────
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, ...vatRows, totalRow],
  });

  // ── Информационная шапка ───────────────────────────────────────────────────
  const p = (text, opts = {}) => new Paragraph({
    spacing: { after: opts.after ?? 60 },
    children: [new TextRun({ text, font: 'Calibri', size: opts.size ?? 20, ...opts })],
  });
  const label = (l, v) => new Paragraph({
    spacing: { after: 50 },
    children: [
      new TextRun({ text: `${l}  `, color: '888888', size: 20, font: 'Calibri' }),
      new TextRun({ text: v, bold: true, size: 20, font: 'Calibri' }),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 720 } } },
      children: [
        // Заголовок
        p('GLORIX PLATFORM  ·  Верифицировано ✓', { size: 16, color: '888888', after: 80 }),
        p('КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ', { bold: true, size: 36, color: NAVY, after: 60 }),
        p(`COMMERCIAL OFFER  ·  №${kpNum}`, { size: 22, color: '666666', after: 240 }),

        // Реквизиты
        label('Продавец / Seller:', sellerName),
        label('Покупатель / Buyer:', buyer || '[Укажите покупателя / Specify buyer]'),
        label('Дата / Date:', dateStr),
        label('Действительно / Valid until:', validStr),
        label('Инкотермс / Incoterms:', `${incoterms} 2020`),
        label('Условия оплаты / Payment:', payTerms),

        // Раздел
        new Paragraph({ spacing: { before: 300, after: 120 },
          children: [new TextRun({ text: 'СПЕЦИФИКАЦИЯ ТОВАРОВ / GOODS SPECIFICATION',
            bold: true, size: 20, color: NAVY, font: 'Calibri', allCaps: true })] }),

        // Таблица
        table,

        // Подписи
        new Paragraph({ spacing: { before: 600 },
          children: [new TextRun({ text: 'Подпись / Signature:  ____________________', size: 20, font: 'Calibri', color: '555555' })] }),
        new Paragraph({ spacing: { before: 100 },
          children: [new TextRun({ text: 'Печать / Stamp:  ____________________', size: 20, font: 'Calibri', color: '555555' })] }),

        // Футер
        new Paragraph({ spacing: { before: 400 },
          children: [new TextRun({ text: `Сформировано платформой GLORIX · glorix.uz · ${dateStr}`, size: 14, color: 'bbbbbb', font: 'Calibri' })] }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
