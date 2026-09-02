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

export function generateWhatsAppInvoiceLink(doc, customerPhone, businessName = 'GS WHOLESALE') {
  if (!customerPhone) return null;
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const lines = [
    `*${businessName}*`,
    `Invoice: ${doc.doc_no}`,
    `Date: ${doc.doc_date}`,
    `Customer: ${doc.customer_name || 'Valued Customer'}`,
    `--------------------------------`,
    `Total: Rs. ${(doc.grand_total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    `Paid: Rs. ${(doc.paid_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    `Balance Due: Rs. ${(doc.balance_due || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    doc.due_date ? `Due Date: ${doc.due_date}` : '',
    `--------------------------------`,
    `Thank you for your business!`
  ].filter(Boolean).join('%0A');

  return `https://wa.me/${cleanPhone}?text=${lines}`;
}
