import { jsPDF } from 'jspdf';
import { PT_SERIF_REGULAR_BASE64, PT_SERIF_BOLD_BASE64 } from './ptSerifFont';
import { ROBOTO_BOLD_BASE64 } from './robotoFont';
import { LANG_NAMES } from '../data/contractData';

// Те же фирменные цвета, что и в pdfExport.js — сохраняем визуальное единство
// всех документов платформы.
const NAVY = [10, 15, 30];
const ACCENT = [0, 212, 170];
const TEXT_DARK = [26, 26, 26];
const TEXT_GRAY = [110, 118, 130];
const RULE_GRAY = [220, 224, 230];
const TABLE_HEAD_BG = [235, 238, 242];

function registerFonts(doc) {
  doc.addFileToVFS('PTSerif-Regular.ttf', PT_SERIF_REGULAR_BASE64);
  doc.addFont('PTSerif-Regular.ttf', 'PTSerif', 'normal');
  doc.addFileToVFS('PTSerif-Bold.ttf', PT_SERIF_BOLD_BASE64);
  doc.addFont('PTSerif-Bold.ttf', 'PTSerif', 'bold');
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
  doc.addFont('Roboto-Bold.ttf', 'RobotoLogo', 'bold');
}

function drawLogo(doc, x, y) {
  doc.setFont('RobotoLogo', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text('GLO', x, y, { charSpace: 0.6 });
  const gloWidth = doc.getTextWidth('GLO') + 0.6 * 2;
  doc.setTextColor(...ACCENT);
  doc.text('RIX', x + gloWidth, y, { charSpace: 0.6 });
  doc.setTextColor(...TEXT_DARK);
}

function drawHeader(doc, pageWidth, margin, docTitle, docNum) {
  const headerY = 32;
  drawLogo(doc, margin, headerY);

  doc.setFont('PTSerif', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_GRAY);
  doc.text('B2B TRADE PLATFORM', margin, headerY + 11);

  doc.setFont('PTSerif', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text(docTitle, pageWidth - margin, headerY - 2, { align: 'right' });
  if (docNum) {
    doc.setFont('PTSerif', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_GRAY);
    doc.text(docNum, pageWidth - margin, headerY + 9, { align: 'right' });
  }

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(1.2);
  doc.line(margin, headerY + 18, pageWidth - margin, headerY + 18);
  doc.setDrawColor(...RULE_GRAY);
  doc.setLineWidth(0.4);

  return headerY + 18;
}

function drawFooter(doc, pageWidth, pageHeight, margin, pageNum, totalPages) {
  const footerY = pageHeight - 24;
  doc.setDrawColor(...RULE_GRAY);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('PTSerif', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_GRAY);
  doc.text('GLORIX — B2B Trade Platform · Документ сформирован автоматически, требует подписи сторон', margin, footerY + 9);
  doc.text(`${pageNum} / ${totalPages}`, pageWidth - margin, footerY + 9, { align: 'right' });
}

// Демо-платформа ещё не имеет юридически обязывающего статуса подписания —
// документы не должны выглядеть как готовый к исполнению финальный контракт.
// Водяной знак рисуется первым (под остальным контентом мы его не кладём,
// jsPDF не поддерживает z-order слоями на одной странице, поэтому контент
// дальше рисуется поверх с непрозрачным белым текстом — водяной знак бледный
// и не мешает читаемости).
function drawDraftWatermark(doc, pageWidth, pageHeight) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.setFont('PTSerif', 'bold');
  doc.setFontSize(72);
  doc.setTextColor(...NAVY);
  doc.text('ПРОЕКТ / DRAFT', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 35,
  });
  doc.restoreGraphicsState();
}

// Шрифт PT Serif, встроенный в PDF, не содержит глифов для некоторых символов
// казахской/таджикской кириллицы (Қ, ҷ, ӣ) и грузинского письма. Для подписи
// колонки в PDF используем название языка на русском как шрифто-совместимый
// аналог — это не влияет на юридический текст самого договора, только на ярлык
// заголовка колонки.
const PDF_SAFE_LANG_LABEL = {
  kk: 'Казахский', tg: 'Таджикский', ka: 'Грузинский', az: 'Азербайджанский',
  ky: 'Кыргызский', tk: 'Туркменский',
};
function pdfSafeLangName(lang) {
  return PDF_SAFE_LANG_LABEL[lang] || LANG_NAMES[lang] || lang;
}
// КРИТИЧЕСКИ ВАЖНО: GLORIX хранит проверенный юридический текст только на русском
// и английском (clauseRu/clauseEn). Если язык колонки (primary ИЛИ secondary) — это
// не 'ru' и не 'en' (напр. казахский 'kk' для Казахстана), мы НЕ подставляем туда
// русский текст по умолчанию — это было бы изобретённым/неверным юридическим текстом
// на чужом языке. Вместо этого показываем честный плейсхолдер.
function resolveColumnText(clauseRu, clauseEn, lang) {
  if (lang === 'ru') return clauseRu;
  if (lang === 'en') return clauseEn;
  return `[${pdfSafeLangName(lang)}: текст требует профессионального юридического перевода]`;
}

export function downloadContractAsPdf(data, filename = 'glorix-contract.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const tableWidth = pageWidth - margin * 2;
  const fontSize = 9;
  const lineHeight = fontSize * 1.5;
  const cellPadding = 7;

  const { contractLang } = data;
  const isBilingual = contractLang.mode === 'bilingual';
  const colWidth = isBilingual ? (tableWidth - 2) / 2 : tableWidth;
  const col1X = margin;
  const col2X = margin + colWidth + 2;

  let pageContentTop = 0;
  let y = 0;
  let pageNum = 1;

  function startPage() {
    pageContentTop = drawHeader(doc, pageWidth, margin, data.title.ru, `№ ${data.num}`);
    y = pageContentTop + 20;
    doc.setFont('PTSerif', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...TEXT_DARK);
  }

  function newPage() {
    doc.addPage();
    pageNum += 1;
    startPage();
  }

  function ensureSpace(neededHeight) {
    if (y + neededHeight > pageHeight - margin - 24) {
      newPage();
    }
  }

  // Рисует одну строку таблицы: либо на всю ширину (заголовок раздела),
  // либо двухколоночную (RU | вторичный язык), с учётом высоты переноса текста.
  function drawRow(ruText, secondaryText, opts = {}) {
    const { isHeading = false, fullWidth = false } = opts;
    doc.setFont('PTSerif', isHeading ? 'bold' : 'normal');
    doc.setFontSize(isHeading ? fontSize + 0.5 : fontSize);

    if (fullWidth) {
      const wrapped = doc.splitTextToSize(ruText, tableWidth - cellPadding * 2);
      const rowHeight = wrapped.length * lineHeight + cellPadding * 2;
      ensureSpace(rowHeight);
      if (isHeading) {
        doc.setFillColor(...TABLE_HEAD_BG);
        doc.rect(margin, y, tableWidth, rowHeight, 'F');
      }
      doc.setTextColor(...(isHeading ? NAVY : TEXT_DARK));
      let ty = y + cellPadding + lineHeight * 0.7;
      const tx = margin + (isHeading ? tableWidth / 2 : cellPadding);
      for (const line of wrapped) {
        doc.text(line, tx, ty, isHeading ? { align: 'center' } : undefined);
        ty += lineHeight;
      }
      doc.setDrawColor(...RULE_GRAY);
      doc.setLineWidth(0.4);
      doc.rect(margin, y, tableWidth, rowHeight);
      y += rowHeight;
      return;
    }

    const wrapped1 = doc.splitTextToSize(ruText, colWidth - cellPadding * 2);
    const wrapped2 = isBilingual ? doc.splitTextToSize(secondaryText, colWidth - cellPadding * 2) : [];
    const rowHeight = Math.max(wrapped1.length, wrapped2.length, 1) * lineHeight + cellPadding * 2;
    ensureSpace(rowHeight);

    doc.setTextColor(...TEXT_DARK);
    let ty1 = y + cellPadding + lineHeight * 0.7;
    for (const line of wrapped1) {
      doc.text(line, col1X + cellPadding, ty1);
      ty1 += lineHeight;
    }
    if (isBilingual) {
      let ty2 = y + cellPadding + lineHeight * 0.7;
      for (const line of wrapped2) {
        doc.text(line, col2X + cellPadding, ty2);
        ty2 += lineHeight;
      }
    }

    doc.setDrawColor(...RULE_GRAY);
    doc.setLineWidth(0.4);
    doc.rect(col1X, y, colWidth, rowHeight);
    if (isBilingual) doc.rect(col2X, y, colWidth, rowHeight);

    y += rowHeight;
  }

  startPage();

  // Языковые подписи колонок
  if (isBilingual) {
    drawRow(pdfSafeLangName(contractLang.primary), pdfSafeLangName(contractLang.secondary), { isHeading: true });
  }

  // Преамбула
  drawRow('ПРЕАМБУЛА', null, { isHeading: true, fullWidth: true });
  const preambleRu = `${data.seller}, юридическое лицо, действующее в соответствии с законодательством ${data.sellerCountryName}, именуемое в дальнейшем «ПРОДАВЕЦ», с одной стороны, и ${data.buyer}, юридическое лицо, действующее в соответствии с законодательством ${data.buyerCountryName}, именуемое в дальнейшем «ПОКУПАТЕЛЬ», с другой стороны, совместно именуемые «Стороны», ЗАКЛЮЧИЛИ настоящий Договор о нижеследующем:`;
  const preambleEn = `${data.seller}, a legal entity operating under the laws of ${data.sellerCountryName}, hereinafter the "SELLER", of the one part, and ${data.buyer}, a legal entity operating under the laws of ${data.buyerCountryName}, hereinafter the "BUYER", of the other part, jointly the "Parties", HAVE CONCLUDED this Contract as follows:`;
  drawRow(
    resolveColumnText(preambleRu, preambleEn, contractLang.primary),
    isBilingual ? resolveColumnText(preambleRu, preambleEn, contractLang.secondary) : null,
  );

  // Статьи
  for (const section of data.sections) {
    drawRow(section.heading.ru, null, { isHeading: true, fullWidth: true });
    for (const clause of section.clauses) {
      drawRow(
        resolveColumnText(clause.ru, clause.en, contractLang.primary),
        isBilingual ? resolveColumnText(clause.ru, clause.en, contractLang.secondary) : null,
      );
    }
  }

  // Статья 19 — реквизиты
  drawRow('СТАТЬЯ 19. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН', null, { isHeading: true, fullWidth: true });
  const sellerBlockRu = `ПРОДАВЕЦ: ${data.seller}\nЮр. адрес: ___________________  ИНН/ИД: _____________________\nБанк: _______________________  Счёт: _______________________\nПодпись: ___________________  Дата: ______________________  М.П.`;
  const sellerBlockEn = `SELLER: ${data.seller}\nRegistered address: _______________  Tax ID: ____________________\nBank: ______________________  Account: ___________________\nSignature: _________________  Date: ______________________  Seal`;
  drawRow(
    resolveColumnText(sellerBlockRu, sellerBlockEn, contractLang.primary),
    isBilingual ? resolveColumnText(sellerBlockRu, sellerBlockEn, contractLang.secondary) : null,
  );
  const buyerBlockRu = `ПОКУПАТЕЛЬ: ${data.buyer}\nЮр. адрес: ___________________  ИНН/ИД: _____________________\nБанк: _______________________  Счёт: _______________________\nПодпись: ___________________  Дата: ______________________  М.П.`;
  const buyerBlockEn = `BUYER: ${data.buyer}\nRegistered address: _______________  Tax ID: ____________________\nBank: ______________________  Account: ___________________\nSignature: _________________  Date: ______________________  Seal`;
  drawRow(
    resolveColumnText(buyerBlockRu, buyerBlockEn, contractLang.primary),
    isBilingual ? resolveColumnText(buyerBlockRu, buyerBlockEn, contractLang.secondary) : null,
  );

  drawRow(
    resolveColumnText(data.appendices.ru, data.appendices.en, contractLang.primary),
    isBilingual ? resolveColumnText(data.appendices.ru, data.appendices.en, contractLang.secondary) : null,
  );

  // Дисклеймер — золотым цветом, на всю ширину. Это служебная заметка платформы,
  // не часть юридического текста договора, но для консистентности тоже следует
  // правилу выбора языка (показываем на ru/en, иначе — на русском как нейтральном
  // языке интерфейса платформы, явно не выдавая его за текст на другом языке).
  doc.setFont('PTSerif', 'normal');
  doc.setFontSize(fontSize);
  const disclaimerText = (contractLang.primary === 'en') ? data.disclaimer.en : data.disclaimer.ru;
  const disclaimerWrapped = doc.splitTextToSize(disclaimerText, tableWidth - cellPadding * 2);
  const disclaimerHeight = disclaimerWrapped.length * lineHeight + cellPadding * 2;
  ensureSpace(disclaimerHeight);
  doc.setTextColor(180, 130, 20);
  let dy = y + cellPadding + lineHeight * 0.7;
  for (const line of disclaimerWrapped) {
    doc.text(line, margin + cellPadding, dy);
    dy += lineHeight;
  }
  y += disclaimerHeight;

  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawDraftWatermark(doc, pageWidth, pageHeight);
    drawFooter(doc, pageWidth, pageHeight, margin, p, totalPages);
  }

  doc.save(filename);
}
