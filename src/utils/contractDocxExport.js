import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  BorderStyle, Header, Footer, PageNumber,
  Table, TableRow, TableCell, WidthType, ShadingType, VerticalAlign,
} from 'docx';
import { LANG_NAMES } from '../data/contractData';

// Те же фирменные цвета/шрифты, что и в docxExport.js — визуальное единство всех
// документов платформы.
const NAVY_HEX = '0A0F1E';
const ACCENT_HEX = '00D4AA';
const TEXT_GRAY_HEX = '6E7682';
const RULE_GRAY_HEX = 'DCE0E6';
const HEAD_BG_HEX = 'EBEEF2';
const GOLD_HEX = 'B48214';

function buildHeader(title, num) {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: 'right', position: 9000 }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT_HEX, space: 4 } },
        children: [
          new TextRun({ text: 'GLO', bold: true, size: 24, color: NAVY_HEX, font: 'Arial' }),
          new TextRun({ text: 'RIX', bold: true, size: 24, color: ACCENT_HEX, font: 'Arial' }),
          new TextRun({ text: '\t' + title + (num ? ` № ${num}` : ''), bold: true, size: 18, color: NAVY_HEX, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: 'B2B TRADE PLATFORM', size: 14, color: TEXT_GRAY_HEX, font: 'Arial' })],
      }),
    ],
  });
}

function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE_GRAY_HEX, space: 4 } },
        tabStops: [{ type: 'right', position: 9000 }],
        children: [
          new TextRun({ text: 'GLORIX — B2B Trade Platform · Документ сформирован автоматически, требует подписи сторон\t', size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman' }),
          new TextRun({ text: ' / ', size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman' }),
        ],
      }),
    ],
  });
}

// Для языков без верифицированного юридического перевода — честный плейсхолдер
// вместо изобретённого текста (см. requiresCertifiedTranslation в contractData.js).
// КРИТИЧЕСКИ ВАЖНО: GLORIX хранит проверенный юридический текст только на русском
// и английском. Если язык колонки (primary ИЛИ secondary) — не 'ru' и не 'en'
// (напр. казахский 'kk'), мы НЕ подставляем туда русский текст по умолчанию —
// это было бы изобретённым/неверным юридическим текстом на чужом языке.
function resolveColumnText(clauseRu, clauseEn, lang) {
  if (lang === 'ru') return clauseRu;
  if (lang === 'en') return clauseEn;
  return `[${LANG_NAMES[lang] || lang}: текст требует профессионального юридического перевода]`;
}

// Параграф(ы) из многострочного текста (текст может содержать '\n' для разрывов внутри пункта)
function textParagraphs(text, opts = {}) {
  const { bold = false, color = '1A1A1A', size = 20, align } = opts;
  const lines = String(text || '').split('\n');
  return lines.map(line => new Paragraph({
    alignment: align,
    spacing: { after: 60 },
    children: [new TextRun({ text: line, bold, color, font: 'Times New Roman', size })],
  }));
}

function cell(content, opts = {}) {
  const { shadingHex, width } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    shading: shadingHex ? { type: ShadingType.SOLID, color: shadingHex, fill: shadingHex } : undefined,
    children: Array.isArray(content) ? content : [content],
  });
}

export async function downloadContractAsDocx(data, filename = 'glorix-contract.docx') {
  const { contractLang } = data;
  const isBilingual = contractLang.mode === 'bilingual';
  const colWidth = isBilingual ? 50 : 100;

  const rows = [];

  // Заголовок документа (на всю ширину, одна "строка" с одной объединённой ячейкой —
  // используем одну ячейку с columnSpan)
  rows.push(new TableRow({
    children: [
      new TableCell({
        columnSpan: isBilingual ? 2 : 1,
        shading: { type: ShadingType.SOLID, color: HEAD_BG_HEX, fill: HEAD_BG_HEX },
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${data.title.ru} № ${data.num}`, bold: true, size: 26, font: 'Times New Roman', color: NAVY_HEX })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: `г. ${data.city}                              «___» __________ ${data.year} г.`, size: 18, font: 'Times New Roman', color: TEXT_GRAY_HEX })] }),
        ],
      }),
    ],
  }));

  // Языковые подписи колонок
  if (isBilingual) {
    rows.push(new TableRow({
      children: [
        cell(new Paragraph({ children: [new TextRun({ text: LANG_NAMES[contractLang.primary] || contractLang.primary, bold: true, size: 20, font: 'Times New Roman' })] }), { shadingHex: HEAD_BG_HEX, width: colWidth }),
        cell(new Paragraph({ children: [new TextRun({ text: LANG_NAMES[contractLang.secondary] || contractLang.secondary, bold: true, size: 20, font: 'Times New Roman' })] }), { shadingHex: HEAD_BG_HEX, width: colWidth }),
      ],
    }));
  }

  // Заголовок-разделитель на всю ширину (для статей и преамбулы)
  function headingRow(text) {
    rows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: isBilingual ? 2 : 1,
          shading: { type: ShadingType.SOLID, color: HEAD_BG_HEX, fill: HEAD_BG_HEX },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 20, font: 'Times New Roman', color: NAVY_HEX })] })],
        }),
      ],
    }));
  }

  // Обычная двух- (или одно-) колоночная строка с текстом пункта
  function clauseRow(ruText, enText) {
    const children = [cell(textParagraphs(resolveColumnText(ruText, enText, contractLang.primary)), { width: colWidth })];
    if (isBilingual) children.push(cell(textParagraphs(resolveColumnText(ruText, enText, contractLang.secondary)), { width: colWidth }));
    rows.push(new TableRow({ children }));
  }

  // Преамбула
  headingRow('ПРЕАМБУЛА');
  const preambleRu = `${data.seller}, юридическое лицо, действующее в соответствии с законодательством ${data.sellerCountryName}, именуемое в дальнейшем «ПРОДАВЕЦ», с одной стороны, и ${data.buyer}, юридическое лицо, действующее в соответствии с законодательством ${data.buyerCountryName}, именуемое в дальнейшем «ПОКУПАТЕЛЬ», с другой стороны, совместно именуемые «Стороны», ЗАКЛЮЧИЛИ настоящий Договор о нижеследующем:`;
  const preambleEn = `${data.seller}, a legal entity operating under the laws of ${data.sellerCountryName}, hereinafter the "SELLER", of the one part, and ${data.buyer}, a legal entity operating under the laws of ${data.buyerCountryName}, hereinafter the "BUYER", of the other part, jointly the "Parties", HAVE CONCLUDED this Contract as follows:`;
  clauseRow(preambleRu, preambleEn);

  // Статьи
  for (const section of data.sections) {
    headingRow(section.heading.ru);
    for (const clause of section.clauses) {
      clauseRow(clause.ru, clause.en);
    }
  }

  // Статья 19 — реквизиты и подписи
  headingRow('СТАТЬЯ 19. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН');
  const sellerBlockRu = `ПРОДАВЕЦ: ${data.seller}\nЮр. адрес: ___________________\nИНН/ИД: _____________________\nБанк: _______________________\nСчёт: _______________________\nSWIFT/БИК: __________________\nПодпись: ___________________  Дата: ______________________  М.П.`;
  const sellerBlockEn = `SELLER: ${data.seller}\nRegistered address: _______________\nTax ID: ____________________\nBank: ______________________\nAccount: ___________________\nSWIFT/BIC: _________________\nSignature: _________________  Date: ______________________  Seal`;
  clauseRow(sellerBlockRu, sellerBlockEn);
  const buyerBlockRu = `ПОКУПАТЕЛЬ: ${data.buyer}\nЮр. адрес: ___________________\nИНН/ИД: _____________________\nБанк: _______________________\nСчёт: _______________________\nSWIFT/БИК: __________________\nПодпись: ___________________  Дата: ______________________  М.П.`;
  const buyerBlockEn = `BUYER: ${data.buyer}\nRegistered address: _______________\nTax ID: ____________________\nBank: ______________________\nAccount: ___________________\nSWIFT/BIC: _________________\nSignature: _________________  Date: ______________________  Seal`;
  clauseRow(buyerBlockRu, buyerBlockEn);

  // Приложения
  clauseRow(data.appendices.ru, data.appendices.en);

  // Дисклеймер — золотым цветом, на всю ширину
  rows.push(new TableRow({
    children: [
      new TableCell({
        columnSpan: isBilingual ? 2 : 1,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: textParagraphs(contractLang.primary === 'en' ? data.disclaimer.en : data.disclaimer.ru, { color: GOLD_HEX, size: 18 }),
      }),
    ],
  }));

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1100, bottom: 1100, left: 700, right: 700 } },
        },
        headers: { default: buildHeader(data.title.ru, data.num) },
        footers: { default: buildFooter() },
        children: [table],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
