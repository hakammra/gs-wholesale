import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const money = value => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numeric = type => ['currency', 'number', 'percent'].includes(type);
const cell = (value, type) => {
  if (value == null) return numeric(type) ? 'Not recorded' : '';
  if (type === 'currency') return money(value);
  if (type === 'number') return money(value);
  if (type === 'percent') return money(value) + '%';
  if (type === 'date') return String(value).slice(0, 10);
  return String(value);
};
const totalCells = report => report.columns.map((column, index) => index === 0 ? 'TOTAL'
  : column.key === 'unitCost' || (report.totals[column.key] == null && !numeric(column.type)) ? '' : cell(report.totals[column.key], column.type));

const csvCell = value => {
  const text = String(value ?? '');
  // Prevent names/notes from being interpreted as spreadsheet formulas.
  const safe = /^[=+@]/.test(text) || /^-\D/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
};

export function reportCsv(report) {
  const rows = [
    [report.title], ['Period', report.period], ['Currency', 'LKR'],
    ...report.stats.map(([label, value]) => [label, value == null ? 'Not recorded' : value]),
    ['Cost / reporting basis', report.note || ''], [],
    report.columns.map(column => column.label),
    ...report.rows.map(row => report.columns.map(column => row[column.key] == null
      ? numeric(column.type) ? 'Not recorded' : ''
      : column.type === 'date' ? String(row[column.key]).slice(0, 10) : row[column.key]))
  ];
  if (report.totals) rows.push(report.columns.map((column, index) => index === 0 ? 'TOTAL'
    : column.key === 'unitCost' ? '' : report.totals[column.key] ?? (numeric(column.type) ? 'Not recorded' : '')));
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadReportCsv(report) {
  const url = URL.createObjectURL(new Blob([reportCsv(report)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = report.fileName + '.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildReportPdf(report, companyName) {
  const pdf = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = width - margin * 2;
  const generated = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date());
  const drawPageHeader = () => {
    pdf.setFillColor(29, 43, 50);
    pdf.rect(0, 0, width, 12, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255);
    pdf.text(companyName || 'Gatronix Store - Wholesale', margin, 8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('REPORT', width - margin, 8, { align: 'right' });
  };
  drawPageHeader();
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(29, 43, 50);
  pdf.setFontSize(19);
  pdf.text(report.title.toUpperCase(), margin, 23);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(90, 105, 115);
  pdf.text('Period: ' + report.period, margin, 30);

  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * (report.stats.length - 1)) / report.stats.length;
  report.stats.forEach(([label, value, type = 'currency'], index) => {
    const x = margin + index * (cardWidth + cardGap);
    pdf.setFillColor(244, 247, 249);
    pdf.setDrawColor(214, 224, 230);
    pdf.roundedRect(x, 37, cardWidth, 17, 1, 1, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(90, 105, 115);
    pdf.text(label, x + 3, 42.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(29, 43, 50);
    pdf.text((type === 'currency' && value != null ? 'LKR ' : '') + cell(value, type), x + 3, 49.5);
  });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(90, 105, 115);
  const noteLines = pdf.splitTextToSize(report.note || '', contentWidth);
  pdf.text(noteLines, margin, 60);
  const productIndex = report.columns.findIndex(column => column.key === 'product');
  autoTable(pdf, {
    startY: 64 + Math.max(0, noteLines.length - 1) * 3.5,
    margin: { top: 18, right: margin, bottom: 16, left: margin },
    head: [report.columns.map(column => column.label)],
    body: report.rows.length ? report.rows.map(row => report.columns.map(column => cell(row[column.key], column.type)))
      : [[{ content: 'No records in this period.', colSpan: report.columns.length, styles: { halign: 'center' } }]],
    foot: report.totals && report.rows.length ? [totalCells(report)] : undefined,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: report.columns.length > 9 ? 7 : 8, cellPadding: 2, overflow: 'linebreak', lineColor: [215, 225, 230], lineWidth: 0.15, textColor: [29, 43, 50] },
    headStyles: { fillColor: [29, 43, 50], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [232, 239, 243], textColor: [29, 43, 50], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 250, 251] },
    columnStyles: report.columns.reduce((styles, column, index) => {
      styles[index] = { halign: numeric(column.type) ? 'right' : 'left' };
      if (index === productIndex && report.columns.length <= 9) styles[index].cellWidth = contentWidth * 0.44;
      return styles;
    }, {}),
    rowPageBreak: 'avoid',
    didParseCell: data => {
      if (data.section === 'head' && numeric(report.columns[data.column.index]?.type)) data.cell.styles.halign = 'right';
    }
  });
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);
    drawPageHeader();
    pdf.setDrawColor(214, 224, 230);
    pdf.line(margin, height - 12, width - margin, height - 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(90, 105, 115);
    pdf.text('Generated ' + generated, margin, height - 7);
    pdf.text('Page ' + page + ' of ' + pageCount, width - margin, height - 7, { align: 'right' });
  }
  return pdf;
}

export function downloadReportPdf(report, companyName) {
  buildReportPdf(report, companyName).save(report.fileName + '.pdf');
}
