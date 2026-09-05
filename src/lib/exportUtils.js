import * as XLSX from 'xlsx';

export function exportToExcel(data, fileName = 'export') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function firstCell(row, keys) {
  if (!row || typeof row !== 'object') return '';
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const target = k.toLowerCase().replace(/[\s_\-\/\.]/g, '');
    const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/[\s_\-\/\.]/g, '') === target);
    if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
      return row[foundKey];
    }
  }
  return '';
}

export function downloadProductExcelTemplate() {
  const sampleData = [
    {
      'SKU/Code': 'SSD-NVME-512G',
      'Name': 'Lexar NM620 M.2 NVMe SSD 512GB',
      'Category': 'Storage / SSD',
      'Barcode': '843367123456',
      'Model': 'NM620-512GB',
      'Cost Price (LKR)': 8500,
      'Wholesale Price (LKR)': 10500,
      'Dealer Price (LKR)': 9900,
      'Low Stock Level': 10,
      'Status': 'active'
    },
    {
      'SKU/Code': 'RAM-DDR4-16G-3200',
      'Name': 'Kingston FURY Beast 16GB DDR4 3200MHz',
      'Category': 'Memory / Desktop RAM',
      'Barcode': '740617319876',
      'Model': 'KF432C16BB/16',
      'Cost Price (LKR)': 9200,
      'Wholesale Price (LKR)': 11800,
      'Dealer Price (LKR)': 11200,
      'Low Stock Level': 15,
      'Status': 'active'
    },
    {
      'SKU/Code': 'GPU-RTX4060-8G',
      'Name': 'ASUS Dual GeForce RTX 4060 OC 8GB',
      'Category': 'Components / Graphic Cards',
      'Barcode': '471108154321',
      'Model': 'DUAL-RTX4060-O8G',
      'Cost Price (LKR)': 108000,
      'Wholesale Price (LKR)': 122000,
      'Dealer Price (LKR)': 118000,
      'Low Stock Level': 3,
      'Status': 'active'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'GS_Wholesale_Product_Import_Template.xlsx');
}

export function normalizeWhatsAppPhone(phone, defaultCountryCode = '94') {
  let cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) return '';
  if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.slice(2);
  if (cleanPhone.startsWith('0')) cleanPhone = `${defaultCountryCode}${cleanPhone.slice(1)}`;
  else if (cleanPhone.length === 9) cleanPhone = `${defaultCountryCode}${cleanPhone}`;
  return cleanPhone;
}

const formatWhatsAppCurrency = (amount) => Number(amount || 0).toLocaleString('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function buildWhatsAppInvoiceMessage(doc, businessName = 'GS WHOLESALE') {
  return [
    `*${businessName}*`,
    `Invoice: ${doc.doc_no || '-'}`,
    `Date: ${doc.doc_date || '-'}`,
    `Customer: ${doc.customer_name || 'Valued Customer'}`,
    `--------------------------------`,
    `Total: Rs. ${formatWhatsAppCurrency(doc.grand_total)}`,
    `Paid: Rs. ${formatWhatsAppCurrency(doc.paid_amount)}`,
    `Balance Due: Rs. ${formatWhatsAppCurrency(doc.balance_due)}`,
    doc.due_date ? `Due Date: ${doc.due_date}` : '',
    `--------------------------------`,
    `The invoice PDF is attached.`,
    `Thank you for your business!`
  ].filter(Boolean).join('\n');
}

export function buildWhatsAppSettlementMessage(payment, businessName = 'GS WHOLESALE') {
  const isCheque = payment.payment_method === 'cheque';
  return [
    `*${businessName}*`,
    isCheque ? `Cheque payment received` : `Payment received`,
    `Customer: ${payment.customer_name || 'Valued Customer'}`,
    `Receipt: ${payment.payment_no || '-'}`,
    `Date: ${payment.payment_date || '-'}`,
    `Paid: Rs. ${formatWhatsAppCurrency(payment.amount)}`,
    `Remaining Balance: Rs. ${formatWhatsAppCurrency(payment.remaining_balance)}`,
    payment.reference ? `Reference: ${payment.reference}` : '',
    isCheque ? `Note: This cheque is pending bank clearance.` : '',
    `Thank you. Your payment has been recorded.`
  ].filter(Boolean).join('\n');
}

export function generateWhatsAppMessageLink(phone, message) {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  if (!cleanPhone) return null;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppInvoiceLink(doc, customerPhone, businessName = 'GS WHOLESALE') {
  return generateWhatsAppMessageLink(customerPhone, buildWhatsAppInvoiceMessage(doc, businessName));
}

function downloadSharedFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareWhatsAppContent({ phone, title, text, file = null }) {
  const shareData = {
    title: title || 'GS Wholesale',
    text,
    ...(file ? { files: [file] } : {})
  };

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles = !file || (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));
    if (canShareFiles) {
      await navigator.share(shareData);
      return { method: 'native-share' };
    }
  }

  if (file) downloadSharedFile(file);
  const url = generateWhatsAppMessageLink(phone, text);
  if (!url) throw new Error('Add a WhatsApp or phone number for this customer first.');
  window.open(url, '_blank', 'noopener,noreferrer');

  return { method: file ? 'download-and-whatsapp' : 'whatsapp-link' };
}
