import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';
import { getDefaultLogoDataUrl } from './defaultLogo';

const fmtNum = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRs = (num) => `Rs.${fmtNum(num)}`;

const formatBillDate = (dStr) => {
  if (!dStr) return '-';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

export const resolveProductName = (it, products = []) => {
  if (!it) return 'Product Item';
  if (it.product?.name) return it.product.name;
  if (it.product_name && !it.product_name.includes('0000-') && it.product_name.length > 1) return it.product_name;
  if (it.name) return it.name;
  if (it.product_id && Array.isArray(products) && products.length > 0) {
    const found = products.find(p => String(p.id) === String(it.product_id));
    if (found?.name) return found.name;
  }
  if (it.item_code) return it.item_code;
  return 'Product Item';
};

export const resolveItemCode = (it, products = []) => {
  if (!it) return '';
  if (it.product?.item_code) return it.product.item_code;
  if (it.item_code) return it.item_code;
  if (it.product_id && Array.isArray(products) && products.length > 0) {
    const found = products.find(p => String(p.id) === String(it.product_id));
    if (found?.item_code) return found.item_code;
  }
  return '';
};

export function generateInvoicePDF(doc, companySettings = {}, customer = null, paperSize = 'A4', products = [], options = {}) {
  const docConfig = paperSize === 'A5' ? { orientation: 'landscape', format: 'a5' } : { orientation: 'portrait', format: 'a4' };
  const pdf = new jsPDF(docConfig);

  const businessName = companySettings.business_name || 'Gatronix Store - Wholesale';
  const addressLine1 = companySettings.address_line1 || '43/H1, Kandy Road';
  const addressLine2 = companySettings.address_line2 || '20260 Madawala Bazaar';
  const phone = companySettings.phone || '0766600466';
  const email = companySettings.email || 'gatronix11@gmail.com';
  const footerText = companySettings.footer_text || 'Created with Gatronix POS - www.gatronix.com';

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Header Left: Document Title & Company Contact Info
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(20, 20, 20);

  const docTitle = doc.doc_type === 'quotation'
    ? 'WHOLESALE QUOTATION'
    : (doc.doc_type === 'reserved_order' || doc.doc_type === 'sales_order' || doc.status === 'reserved')
      ? 'WHOLESALE RESERVATION'
      : (companySettings.doc_title || 'WHOLESALE INVOICE');

  pdf.text(docTitle, margin, 18);

  pdf.setFontSize(10.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(businessName, margin, 25);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(50, 50, 50);

  let curY = 30;
  if (addressLine1) {
    pdf.text(addressLine1, margin, curY);
    curY += 4.5;
  }
  if (addressLine2) {
    pdf.text(addressLine2, margin, curY);
    curY += 4.5;
  }
  pdf.text(`Phone:             ${phone}`, margin, curY);
  curY += 4.5;
  pdf.text(`Email:             ${email}`, margin, curY);

  // 2. Header Right: Company Logo Image (uploaded or default Gatronix G logo)
  const logoData = companySettings.logo_url || getDefaultLogoDataUrl();
  if (logoData) {
    try {
      const logoSize = 38;
      const logoX = pageWidth - margin - logoSize;
      pdf.addImage(logoData, 'PNG', logoX, 12, logoSize, logoSize);
    } catch (e) {
      console.warn('Could not add logo image to PDF:', e);
    }
  }

  // 3. Bill To & Document Metadata Row
  const metaY = Math.max(curY + 8, 54);

  // Left: Bill To
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text('Bill to', margin, metaY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  const custName = customer?.business_name || doc.customer?.business_name || doc.customer_name || 'Cash / Counter Customer';
  pdf.text(custName, margin, metaY + 5.5);

  let custSubY = metaY + 10;
  const custAddr = customer?.billing_address || doc.customer?.billing_address;
  if (custAddr) {
    pdf.setFontSize(8.5);
    pdf.setTextColor(80, 80, 80);
    pdf.text(custAddr, margin, custSubY);
  }

  // Right: Metadata table
  const metaColLabelX = pageWidth - margin - 75;
  const metaColValX = pageWidth - margin - 35;

  pdf.setFontSize(9);
  pdf.setTextColor(40, 40, 40);

  pdf.text('Invoice No.:', metaColLabelX, metaY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.doc_no || '-', metaColValX, metaY);

  pdf.text('Date:', metaColLabelX, metaY + 5);
  pdf.text(formatBillDate(doc.doc_date), metaColValX, metaY + 5);

  pdf.text('Due date:', metaColLabelX, metaY + 10);
  pdf.text(formatBillDate(doc.due_date || doc.doc_date), metaColValX, metaY + 10);

  pdf.text('Payment status:', metaColLabelX, metaY + 15);
  const statusStr = (doc.status === 'reserved' || doc.payment_status === 'reserved')
    ? 'Reserved'
    : (doc.payment_status === 'paid')
      ? 'Paid'
      : (doc.payment_status === 'partial')
        ? 'Partial'
        : 'Unpaid';
  pdf.text(statusStr, metaColValX, metaY + 15);

  // 4. Line Items Table (Clean bordered grid matching screenshot)
  const tableStartY = metaY + 22;

  const tableData = (doc.items || []).map(it => {
    const isW = !!it.is_warranty_replacement;
    const prodName = resolveProductName(it, products);
    const itemCode = resolveItemCode(it, products);
    const titleWithCode = (itemCode && !prodName.includes(itemCode)) ? `${prodName} [${itemCode}]` : prodName;
    const subNote = it.warranty_note || (isW ? 'Warranty Replacement' : '') || it.notes || '';
    const desc = subNote ? `${titleWithCode}\n${subNote}` : titleWithCode;

    const qty = Number(it.qty) || 1;
    const unitPrice = isW ? 0 : Number(it.unit_price || 0);
    const discountAmt = Number(it.discount_amount || 0);
    const lineTotal = isW ? 0 : Number(it.line_total || ((qty * unitPrice) - discountAmt));

    const discountStr = it.discount_pct
      ? `${Number(it.discount_pct).toFixed(2)}%`
      : discountAmt > 0
        ? fmtNum(discountAmt)
        : '0.00%';

    return [
      desc,
      qty.toString(),
      fmtNum(unitPrice),
      discountStr,
      fmtNum(lineTotal)
    ];
  });

  const grandTotal = Number(doc.grand_total || 0);
  const paidAmount = Number(doc.paid_amount || 0);
  const amountDue = Number(doc.balance_due ?? (grandTotal - paidAmount));

  autoTable(pdf, {
    startY: tableStartY,
    head: [['Item', 'Qty.', 'Unit price', 'Discount', 'Total']],
    body: tableData,
    foot: [
      [
        { content: 'Total', colSpan: 4, styles: { halign: 'left', fontStyle: 'bold', fillColor: [248, 248, 248] } },
        { content: fmtRs(grandTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 248, 248] } }
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: 0.15,
      lineColor: [210, 210, 210],
      cellPadding: 3.5
    },
    bodyStyles: {
      textColor: [20, 20, 20],
      fontSize: 8.5,
      lineWidth: 0.15,
      lineColor: [220, 220, 220],
      cellPadding: 3.5
    },
    footStyles: {
      textColor: [0, 0, 0],
      fontSize: 9.5,
      lineWidth: 0.15,
      lineColor: [210, 210, 210],
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // 5. Payment Breakdown Block (Aligned on right, exactly as in screenshot)
  const afterTableY = pdf.lastAutoTable.finalY + 8;
  const payBlockX = pageWidth - margin - 85;
  const payValX = pageWidth - margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text('Payment method:', payBlockX, afterTableY);

  // Method label: Credit / Cash / Bank / Cheque / COD
  let methodLabel = 'Credit:';
  if (doc.payment_lines && doc.payment_lines.length > 0) {
    const m = doc.payment_lines[0].method;
    methodLabel = m === 'cash' ? 'Cash:' : m === 'bank' ? 'Bank:' : m === 'cheque' ? 'Cheque:' : m === 'cod' ? 'COD (Cash on Delivery):' : 'Credit:';
  } else if (doc.payment_method) {
    const m = doc.payment_method;
    methodLabel = m === 'cash' ? 'Cash:' : m === 'bank' ? 'Bank:' : m === 'cheque' ? 'Cheque:' : m === 'cod' ? 'COD (Cash on Delivery):' : 'Credit:';
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(methodLabel, payBlockX, afterTableY + 6);
  pdf.text(fmtRs(grandTotal), payValX, afterTableY + 6, { align: 'right' });

  pdf.text('Paid amount:', payBlockX, afterTableY + 12);
  pdf.text(fmtRs(paidAmount), payValX, afterTableY + 12, { align: 'right' });

  pdf.setFont('helvetica', 'bold');
  pdf.text('Amount due:', payBlockX, afterTableY + 18);
  pdf.text(fmtRs(amountDue), payValX, afterTableY + 18, { align: 'right' });

  // Divider line
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(payBlockX, afterTableY + 22, payValX, afterTableY + 22);

  // Outstanding customer balance
  const rawCustomerBal = Number(
    doc.customer_receivable !== undefined && doc.customer_receivable !== null
      ? doc.customer_receivable
      : customer?.current_receivable !== undefined && customer?.current_receivable !== null
        ? customer.current_receivable
        : doc.customer?.current_receivable !== undefined && doc.customer?.current_receivable !== null
          ? doc.customer.current_receivable
          : 0
  );
  const outstandingBal = Math.max(rawCustomerBal, amountDue);

  pdf.setFont('helvetica', 'normal');
  pdf.text('Outstanding balance:', payBlockX, afterTableY + 28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtRs(outstandingBal), payValX, afterTableY + 28, { align: 'right' });

  // 6. Signatures (Near bottom of page)
  const sigY = pageHeight - 32;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(80, 80, 80);

  pdf.text('.......................................................................', margin + 10, sigY);
  pdf.text('Authorized By', margin + 30, sigY + 5);

  pdf.text('.......................................................................', pageWidth - margin - 75, sigY);
  pdf.text('Customer Signature', pageWidth - margin - 55, sigY + 5);

  // 7. Page Footer
  const footY = pageHeight - 12;
  pdf.setFontSize(8);
  pdf.setTextColor(140, 140, 140);
  pdf.text(footerText, margin, footY);
  pdf.text(`Page 1`, pageWidth - margin, footY, { align: 'right' });

  const fileName = `${doc.doc_no || 'Invoice'}.pdf`;
  if (options.output === 'file') {
    return new File([pdf.output('blob')], fileName, { type: 'application/pdf' });
  }
  if (options.output === 'blob') return pdf.output('blob');

  pdf.save(fileName);
  return pdf;
}

export function createInvoicePDFFile(doc, companySettings = {}, customer = null, paperSize = 'A4', products = []) {
  return generateInvoicePDF(doc, companySettings, customer, paperSize, products, { output: 'file' });
}

export function generateStatementPDF(customer, invoices, payments, companySettings = {}) {
  const pdf = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const businessName = companySettings.business_name || 'GS WHOLESALE COMPUTER PRODUCTS';

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(businessName, 14, 18);
  pdf.setFontSize(10);
  pdf.text('CUSTOMER STATEMENT OF ACCOUNT', pdf.internal.pageSize.getWidth() - 14, 18, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Customer: ${customer.business_name} (${customer.customer_code})`, 14, 28);
  pdf.text(`Credit Limit: ${formatCurrency(customer.credit_limit)} | Credit Days: ${customer.credit_days} Days`, 14, 33);
  pdf.text(`Outstanding Balance: ${formatCurrency(customer.current_receivable)}`, 14, 38);

  const tableData = (invoices || []).map(inv => [
    formatDate(inv.doc_date),
    inv.doc_no,
    inv.due_date ? formatDate(inv.due_date) : '-',
    formatCurrency(inv.grand_total),
    formatCurrency(inv.paid_amount),
    formatCurrency(inv.balance_due),
    inv.status?.toUpperCase()
  ]);

  autoTable(pdf, {
    startY: 45,
    head: [['Date', 'Invoice #', 'Due Date', 'Total', 'Paid', 'Balance', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [40, 169, 230] },
    styles: { fontSize: 8.5 }
  });

  pdf.save(`Statement_${customer.customer_code}.pdf`);
}

// ==============================================================================
// 2. PURCHASE DOCUMENT - PDF GENERATOR (FOR DOWNLOAD)
// ==============================================================================
export function buildPurchasePDF(purchaseDoc, companySettings = {}, products = []) {
  const pdf = new jsPDF({ orientation: 'portrait', format: 'a4' });

  const businessName = companySettings.business_name || 'Gatronix Store - Wholesale';
  const addressLine1 = companySettings.address_line1 || '43/H1, Kandy Road';
  const addressLine2 = companySettings.address_line2 || '20260 Madawala Bazaar';
  const phone = companySettings.phone || '0766600466';
  const email = companySettings.email || 'gatronix11@gmail.com';
  const footerText = companySettings.footer_text || 'Created with Gatronix POS - www.gatronix.com';

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Header Left: Document Title & Company Info
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(20, 20, 20);
  pdf.text('WHOLESALE GOODS RECEIVED NOTE (GRN)', margin, 18);

  pdf.setFontSize(10.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(businessName, margin, 25);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(50, 50, 50);

  let curY = 30;
  if (addressLine1) {
    pdf.text(addressLine1, margin, curY);
    curY += 4.5;
  }
  if (addressLine2) {
    pdf.text(addressLine2, margin, curY);
    curY += 4.5;
  }
  pdf.text(`Phone:             ${phone}`, margin, curY);
  curY += 4.5;
  pdf.text(`Email:             ${email}`, margin, curY);

  // 2. Header Right: Company Logo Image
  const logoData = companySettings.logo_url || getDefaultLogoDataUrl();
  if (logoData) {
    try {
      const logoSize = 38;
      const logoX = pageWidth - margin - logoSize;
      pdf.addImage(logoData, 'PNG', logoX, 12, logoSize, logoSize);
    } catch (e) {
      console.warn('Could not add logo image to purchase PDF:', e);
    }
  }

  // 3. Vendor / Supplier Details & Document Metadata
  const metaY = Math.max(curY + 8, 54);

  // Left: Supplier
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text('Supplier / Vendor', margin, metaY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  const suppName = purchaseDoc.supplier_name || purchaseDoc.supplier?.name || 'Local / Overseas Supplier';
  pdf.text(suppName, margin, metaY + 5.5);

  let suppTerms = purchaseDoc.payment_type ? `Terms: ${String(purchaseDoc.payment_type).toUpperCase()}` : '';
  if (suppTerms) {
    pdf.setFontSize(8.5);
    pdf.setTextColor(80, 80, 80);
    pdf.text(suppTerms, margin, metaY + 10);
  }

  // Right: Metadata table
  const metaColLabelX = pageWidth - margin - 75;
  const metaColValX = pageWidth - margin - 35;

  pdf.setFontSize(9);
  pdf.setTextColor(40, 40, 40);

  pdf.text('GRN / Doc No.:', metaColLabelX, metaY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(purchaseDoc.doc_no || purchaseDoc.grn_no || '-', metaColValX, metaY);

  pdf.text('Receipt Date:', metaColLabelX, metaY + 5);
  pdf.text(formatDate(purchaseDoc.receipt_date), metaColValX, metaY + 5);

  if (purchaseDoc.shipment_no) {
    pdf.text('Transit Ref:', metaColLabelX, metaY + 10);
    pdf.text(purchaseDoc.shipment_no, metaColValX, metaY + 10);
  }

  pdf.text('Status:', metaColLabelX, metaY + 15);
  pdf.text(purchaseDoc.status === 'draft' ? 'Draft' : 'Received into Stock', metaColValX, metaY + 15);

  // 4. Line Items Table
  const tableStartY = metaY + 22;

  const tableData = (purchaseDoc.items || []).map((it, idx) => {
    const prodName = resolveProductName(it, products);
    const itemCode = resolveItemCode(it, products);
    const titleWithCode = (itemCode && !prodName.includes(itemCode)) ? `${prodName} [${itemCode}]` : prodName;

    const qty = Number(it.received_sellable_qty || it.shipped_qty || it.qty || 0);
    const unitCost = Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.foreign_unit_cost || 0);
    const lineTotal = Number(it.line_total_lkr || (qty * unitCost));

    return [
      (idx + 1).toString(),
      titleWithCode,
      `${qty} Units`,
      fmtNum(unitCost),
      fmtNum(lineTotal)
    ];
  });

  const totalAmount = Number(purchaseDoc.total_amount_lkr || purchaseDoc.total_landed_lkr || 0);

  autoTable(pdf, {
    startY: tableStartY,
    head: [['#', 'Item Description & SKU', 'Received Qty', 'Unit Cost (LKR)', 'Line Total (LKR)']],
    body: tableData,
    foot: [
      [
        { content: 'Total Purchase Amount', colSpan: 4, styles: { halign: 'left', fontStyle: 'bold', fillColor: [248, 248, 248] } },
        { content: fmtRs(totalAmount), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 248, 248] } }
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: 0.15,
      lineColor: [210, 210, 210],
      cellPadding: 3.5
    },
    bodyStyles: {
      textColor: [20, 20, 20],
      fontSize: 8.5,
      lineWidth: 0.15,
      lineColor: [220, 220, 220],
      cellPadding: 3.5
    },
    footStyles: {
      textColor: [0, 0, 0],
      fontSize: 9.5,
      lineWidth: 0.15,
      lineColor: [210, 210, 210],
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 36, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // 5. Verification & Signatures
  const afterTableY = pdf.lastAutoTable.finalY + 8;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8.5);
  pdf.setTextColor(90, 90, 90);
  pdf.text('Stock verified and entered into warehouse inventory balances.', margin, afterTableY + 4);

  const sigY = pageHeight - 32;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(80, 80, 80);

  pdf.text('.......................................................................', margin + 10, sigY);
  pdf.text('Stock Verified By', margin + 30, sigY + 5);

  pdf.text('.......................................................................', pageWidth - margin - 75, sigY);
  pdf.text('Store Manager Signature', pageWidth - margin - 60, sigY + 5);

  // 6. Page Footer
  const footY = pageHeight - 12;
  pdf.setFontSize(8);
  pdf.setTextColor(140, 140, 140);
  pdf.text(footerText, margin, footY);
  pdf.text(`Page 1`, pageWidth - margin, footY, { align: 'right' });

  return pdf;
}

export function generatePurchaseInvoicePDF(purchaseDoc, companySettings = {}, products = []) {
  const pdf = buildPurchasePDF(purchaseDoc, companySettings, products);
  pdf.save(`${purchaseDoc.doc_no || purchaseDoc.grn_no || 'Purchase_Doc'}.pdf`);
}

// ==============================================================================
// 3. NATIVE BROWSER PRINT CATALOG FUNCTIONS (OPENS PRINT DIALOG WITHOUT DOWNLOAD)
// ==============================================================================
function triggerBrowserPrint(htmlContent, title = 'Document') {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.title = title;
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const printAction = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to popup window:', e);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        printWin.print();
      }
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };

  setTimeout(printAction, 300);
}

export function printInvoiceDocument(doc, companySettings = {}, customer = null, paperSize = 'A4', products = []) {
  const businessName = companySettings.business_name || 'Gatronix Store - Wholesale';
  const addressLine1 = companySettings.address_line1 || '43/H1, Kandy Road';
  const addressLine2 = companySettings.address_line2 || '20260 Madawala Bazaar';
  const phone = companySettings.phone || '0766600466';
  const email = companySettings.email || 'gatronix11@gmail.com';
  const footerText = companySettings.footer_text || 'Created with Gatronix POS - www.gatronix.com';
  const logoData = companySettings.logo_url || getDefaultLogoDataUrl();

  const custName = customer?.business_name || doc.customer?.business_name || doc.customer_name || 'Cash / Counter Customer';
  const custAddr = customer?.billing_address || doc.customer?.billing_address || '';
  const custPhone = customer?.phone || doc.customer?.phone || doc.customer_phone || '';

  const grandTotal = Number(doc.grand_total || 0);
  const paidAmount = Number(doc.paid_amount || 0);
  const amountDue = Number(doc.balance_due ?? (grandTotal - paidAmount));
  const rawCustomerBal = Number(
    doc.customer_receivable !== undefined && doc.customer_receivable !== null
      ? doc.customer_receivable
      : customer?.current_receivable !== undefined && customer?.current_receivable !== null
        ? customer.current_receivable
        : 0
  );
  const outstandingBal = Math.max(rawCustomerBal, amountDue);

  const docTitle = doc.doc_type === 'quotation'
    ? 'WHOLESALE QUOTATION'
    : (doc.doc_type === 'reserved_order' || doc.doc_type === 'sales_order' || doc.status === 'reserved')
      ? 'WHOLESALE RESERVATION'
      : (companySettings.doc_title || 'WHOLESALE INVOICE');

  const statusStr = (doc.status === 'reserved' || doc.payment_status === 'reserved')
    ? 'Reserved'
    : (doc.payment_status === 'paid')
      ? 'Paid'
      : (doc.payment_status === 'partial')
        ? 'Partial'
        : 'Unpaid';

  let methodLabel = 'Credit';
  if (doc.payment_lines && doc.payment_lines.length > 0) {
    const m = doc.payment_lines[0].method;
    methodLabel = m === 'cash' ? 'Cash' : m === 'bank' ? 'Bank' : m === 'cheque' ? 'Cheque' : m === 'cod' ? 'COD (Cash on Delivery)' : 'Credit';
  } else if (doc.payment_method) {
    const m = doc.payment_method;
    methodLabel = m === 'cash' ? 'Cash' : m === 'bank' ? 'Bank' : m === 'cheque' ? 'Cheque' : m === 'cod' ? 'COD (Cash on Delivery)' : 'Credit';
  }

  const itemsRows = (doc.items || []).map((it, idx) => {
    const isW = !!it.is_warranty_replacement;
    const prodName = resolveProductName(it, products);
    const itemCode = resolveItemCode(it, products);
    const qty = Number(it.qty) || 1;
    const unitPrice = isW ? 0 : Number(it.unit_price || 0);
    const discountAmt = Number(it.discount_amount || 0);
    const lineTotal = isW ? 0 : Number(it.line_total || ((qty * unitPrice) - discountAmt));
    const subNote = it.warranty_note || (isW ? 'Warranty Replacement' : '') || it.notes || '';

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>
          <strong>${prodName}</strong>
          ${itemCode ? `<div style="font-size: 11px; color: #555;">Item Code: ${itemCode}</div>` : ''}
          ${subNote ? `<div style="font-size: 11px; color: #16a34a;">🛡️ ${subNote}</div>` : ''}
        </td>
        <td style="text-align: center;">${qty}</td>
        <td style="text-align: right;">${isW ? 'Rs. 0.00' : fmtRs(unitPrice)}</td>
        <td style="text-align: right;">${discountAmt > 0 ? fmtRs(discountAmt) : '-'}</td>
        <td style="text-align: right; font-weight: 700;">${isW ? 'Rs. 0.00' : fmtRs(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${doc.doc_no || 'Invoice'}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 14mm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 0; color: #1a1a1a; background: #fff; font-size: 12.5px; line-height: 1.4; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
          .doc-title { font-size: 18px; font-weight: 800; color: #111; margin: 0 0 4px 0; }
          .company-name { font-size: 14px; font-weight: 700; color: #222; margin: 0 0 2px 0; }
          .company-meta { font-size: 11.5px; color: #555; line-height: 1.45; }
          .logo-box { max-width: 140px; max-height: 65px; object-fit: contain; }
          .meta-grid { display: flex; justify-content: space-between; gap: 20px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
          .meta-block { flex: 1; }
          .meta-label { font-size: 10px; font-weight: 700; color: #777; text-transform: uppercase; margin-bottom: 3px; }
          .meta-val { font-size: 12.5px; font-weight: 600; color: #111; }
          .meta-sub { font-size: 11px; color: #555; margin-top: 2px; }
          table.doc-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          table.doc-table th { background: #f4f4f4; border: 1px solid #ddd; padding: 7px 8px; text-align: left; font-weight: 700; color: #333; font-size: 11.5px; }
          table.doc-table td { border: 1px solid #e0e0e0; padding: 7px 8px; vertical-align: top; }
          table.doc-table tfoot td { font-weight: 700; background: #fafafa; border: 1px solid #ddd; padding: 7px 8px; font-size: 12.5px; }
          .payment-summary { display: flex; justify-content: flex-end; margin-bottom: 25px; }
          .summary-box { width: 320px; font-size: 12px; }
          .summary-line { display: flex; justify-content: space-between; padding: 3px 0; }
          .summary-line.total { border-top: 1px solid #ccc; font-weight: 700; font-size: 13.5px; padding-top: 5px; }
          .summary-line.highlight { font-weight: 700; color: #b91c1c; }
          .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding-top: 10px; }
          .sig-box { width: 180px; text-align: center; font-size: 11px; color: #666; }
          .sig-line { border-top: 1px dashed #999; margin-bottom: 5px; }
          .footer-text { margin-top: 20px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div>
            <div class="doc-title">${docTitle}</div>
            <div class="company-name">${businessName}</div>
            <div class="company-meta">
              ${addressLine1 ? `<div>${addressLine1}</div>` : ''}
              ${addressLine2 ? `<div>${addressLine2}</div>` : ''}
              <div>Phone: ${phone} | Email: ${email}</div>
            </div>
          </div>
          ${logoData ? `<img src="${logoData}" alt="Logo" class="logo-box" />` : ''}
        </div>

        <div class="meta-grid">
          <div class="meta-block">
            <div class="meta-label">Bill To</div>
            <div class="meta-val">${custName}</div>
            ${custAddr ? `<div class="meta-sub">${custAddr}</div>` : ''}
            ${custPhone ? `<div class="meta-sub">Tel: ${custPhone}</div>` : ''}
          </div>
          <div class="meta-block" style="text-align: right;">
            <div class="meta-label">Invoice Details</div>
            <div class="meta-val">No: ${doc.doc_no || '-'}</div>
            <div class="meta-sub">Date: ${formatBillDate(doc.doc_date)}</div>
            <div class="meta-sub">Due Date: ${formatBillDate(doc.due_date || doc.doc_date)}</div>
            <div class="meta-sub">Status: <strong>${statusStr}</strong></div>
          </div>
        </div>

        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Item Description</th>
              <th style="width: 60px; text-align: center;">Qty.</th>
              <th style="width: 100px; text-align: right;">Unit Price</th>
              <th style="width: 85px; text-align: right;">Discount</th>
              <th style="width: 110px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right;">Total</td>
              <td style="text-align: right;">${fmtRs(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="payment-summary">
          <div class="summary-box">
            <div class="summary-line">
              <span>Payment Method:</span>
              <strong>${methodLabel}</strong>
            </div>
            <div class="summary-line">
              <span>Paid Amount:</span>
              <span>${fmtRs(paidAmount)}</span>
            </div>
            <div class="summary-line total">
              <span>Amount Due:</span>
              <span>${fmtRs(amountDue)}</span>
            </div>
            <div class="summary-line highlight" style="border-top: 1px dashed #ddd; margin-top: 4px; padding-top: 4px;">
              <span>Total Customer Outstanding:</span>
              <span>${fmtRs(outstandingBal)}</span>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>Authorized By</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>Customer Signature</div>
          </div>
        </div>

        <div class="footer-text">
          ${footerText} &bull; Page 1 of 1
        </div>
      </body>
    </html>
  `;

  triggerBrowserPrint(html, doc.doc_no || 'Invoice');
}

export function printPurchaseDocument(purchaseDoc, companySettings = {}, products = []) {
  const businessName = companySettings.business_name || 'Gatronix Store - Wholesale';
  const addressLine1 = companySettings.address_line1 || '43/H1, Kandy Road';
  const addressLine2 = companySettings.address_line2 || '20260 Madawala Bazaar';
  const phone = companySettings.phone || '0766600466';
  const email = companySettings.email || 'gatronix11@gmail.com';
  const footerText = companySettings.footer_text || 'Created with Gatronix POS - www.gatronix.com';
  const logoData = companySettings.logo_url || getDefaultLogoDataUrl();

  const suppName = purchaseDoc.supplier_name || purchaseDoc.supplier?.name || 'Local / Overseas Supplier';
  const totalAmount = Number(purchaseDoc.total_amount_lkr || purchaseDoc.total_landed_lkr || 0);

  const itemsRows = (purchaseDoc.items || []).map((it, idx) => {
    const prodName = resolveProductName(it, products);
    const itemCode = resolveItemCode(it, products);
    const qty = Number(it.received_sellable_qty || it.shipped_qty || it.qty || 0);
    const unitCost = Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.foreign_unit_cost || 0);
    const lineTotal = Number(it.line_total_lkr || (qty * unitCost));

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>
          <strong>${prodName}</strong>
          ${itemCode ? `<div style="font-size: 11px; color: #555;">Item Code: ${itemCode}</div>` : ''}
        </td>
        <td style="text-align: center;">${qty} Units</td>
        <td style="text-align: right;">${fmtRs(unitCost)}</td>
        <td style="text-align: right; font-weight: 700;">${fmtRs(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${purchaseDoc.doc_no || purchaseDoc.grn_no || 'Purchase_Receipt'}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 14mm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 0; color: #1a1a1a; background: #fff; font-size: 12.5px; line-height: 1.4; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
          .doc-title { font-size: 18px; font-weight: 800; color: #111; margin: 0 0 4px 0; }
          .company-name { font-size: 14px; font-weight: 700; color: #222; margin: 0 0 2px 0; }
          .company-meta { font-size: 11.5px; color: #555; line-height: 1.45; }
          .logo-box { max-width: 140px; max-height: 65px; object-fit: contain; }
          .meta-grid { display: flex; justify-content: space-between; gap: 20px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
          .meta-block { flex: 1; }
          .meta-label { font-size: 10px; font-weight: 700; color: #777; text-transform: uppercase; margin-bottom: 3px; }
          .meta-val { font-size: 12.5px; font-weight: 600; color: #111; }
          .meta-sub { font-size: 11px; color: #555; margin-top: 2px; }
          table.doc-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          table.doc-table th { background: #f4f4f4; border: 1px solid #ddd; padding: 7px 8px; text-align: left; font-weight: 700; color: #333; font-size: 11.5px; }
          table.doc-table td { border: 1px solid #e0e0e0; padding: 7px 8px; vertical-align: top; }
          table.doc-table tfoot td { font-weight: 700; background: #fafafa; border: 1px solid #ddd; padding: 7px 8px; font-size: 12.5px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
          .sig-box { width: 180px; text-align: center; font-size: 11px; color: #666; }
          .sig-line { border-top: 1px dashed #999; margin-bottom: 5px; }
          .footer-text { margin-top: 25px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div>
            <div class="doc-title">WHOLESALE GOODS RECEIVED NOTE (GRN)</div>
            <div class="company-name">${businessName}</div>
            <div class="company-meta">
              ${addressLine1 ? `<div>${addressLine1}</div>` : ''}
              ${addressLine2 ? `<div>${addressLine2}</div>` : ''}
              <div>Phone: ${phone} | Email: ${email}</div>
            </div>
          </div>
          ${logoData ? `<img src="${logoData}" alt="Logo" class="logo-box" />` : ''}
        </div>

        <div class="meta-grid">
          <div class="meta-block">
            <div class="meta-label">Supplier / Vendor</div>
            <div class="meta-val">${suppName}</div>
            ${purchaseDoc.payment_type ? `<div class="meta-sub">Terms: ${String(purchaseDoc.payment_type).toUpperCase()}</div>` : ''}
          </div>
          <div class="meta-block" style="text-align: right;">
            <div class="meta-label">Receipt Details</div>
            <div class="meta-val">GRN No: ${purchaseDoc.doc_no || purchaseDoc.grn_no || '-'}</div>
            <div class="meta-sub">Date: ${formatDate(purchaseDoc.receipt_date)}</div>
            ${purchaseDoc.shipment_no ? `<div class="meta-sub">Transit Ref: ${purchaseDoc.shipment_no}</div>` : ''}
            <div class="meta-sub">Status: <strong>${purchaseDoc.status === 'draft' ? 'Draft' : 'Received into Stock'}</strong></div>
          </div>
        </div>

        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Item Description & Code</th>
              <th style="width: 90px; text-align: center;">Received Qty</th>
              <th style="width: 120px; text-align: right;">Unit Cost (LKR)</th>
              <th style="width: 130px; text-align: right;">Line Total (LKR)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right;">Total Purchase Amount</td>
              <td style="text-align: right;">${fmtRs(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="font-size: 11px; font-style: italic; color: #666; margin: 10px 0 20px;">
          Stock verified and entered into warehouse inventory balances.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>Stock Verified By</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>Store Manager Signature</div>
          </div>
        </div>

        <div class="footer-text">
          ${footerText} &bull; Page 1 of 1
        </div>
      </body>
    </html>
  `;

  triggerBrowserPrint(html, purchaseDoc.doc_no || purchaseDoc.grn_no || 'Purchase_Doc');
}

