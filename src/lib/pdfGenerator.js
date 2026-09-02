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

export function generateInvoicePDF(doc, companySettings = {}, customer = null, paperSize = 'A4') {
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
    const prodName = it.product?.name || it.product_name || it.item_code || 'Product Item';
    const subNote = it.warranty_note || (isW ? 'Warranty Replacement' : '') || it.notes || '';
    const desc = subNote ? `${prodName}\n${subNote}` : prodName;

    const qty = it.qty || 1;
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

  pdf.save(`${doc.doc_no || 'Invoice'}.pdf`);
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

export function generatePurchaseInvoicePDF(purchaseDoc, companySettings = {}) {
  const pdf = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const businessName = companySettings.business_name || 'GS WHOLESALE COMPUTER PRODUCTS';
  const tagline = companySettings.tagline || 'Direct Importers & Wholesale Distribution';
  const phone = companySettings.phone || '+94 77 123 4567';
  const address = companySettings.address || 'Colombo, Sri Lanka';

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(businessName, 14, 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(tagline, 14, 23);
  pdf.text(`${address} | Tel: ${phone}`, 14, 28);

  // Document Badge
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('PURCHASE DOCUMENT', pdf.internal.pageSize.getWidth() - 14, 18, { align: 'right' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Doc No: ${purchaseDoc.doc_no || purchaseDoc.grn_no || '-'}`, pdf.internal.pageSize.getWidth() - 14, 24, { align: 'right' });
  pdf.text(`Date: ${formatDate(purchaseDoc.receipt_date)}`, pdf.internal.pageSize.getWidth() - 14, 29, { align: 'right' });
  if (purchaseDoc.shipment_no) {
    pdf.text(`Transit Ref: ${purchaseDoc.shipment_no}`, pdf.internal.pageSize.getWidth() - 14, 34, { align: 'right' });
  }

  // Divider
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(14, 38, pdf.internal.pageSize.getWidth() - 14, 38);

  // Supplier Block
  pdf.setFont('helvetica', 'bold');
  pdf.text('SUPPLIER / VENDOR:', 14, 45);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${purchaseDoc.supplier_name || 'Supplier'}`, 14, 50);
  if (purchaseDoc.payment_type) {
    pdf.text(`Payment Terms: ${purchaseDoc.payment_type.toUpperCase()}`, 14, 55);
  }

  // Table
  const tableData = (purchaseDoc.items || []).map((item, idx) => {
    const cost = item.final_landed_unit_cost_lkr || item.unit_cost_lkr || item.foreign_unit_cost || 0;
    const qty = item.received_sellable_qty || item.shipped_qty || item.qty || 0;
    return [
      idx + 1,
      item.product_name || item.product?.name || item.product_id || 'Product',
      `${qty} Units`,
      formatCurrency(cost),
      formatCurrency(qty * cost)
    ];
  });

  autoTable(pdf, {
    startY: 62,
    head: [['#', 'Item Description', 'Received Qty', 'Unit Cost (LKR)', 'Line Total (LKR)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [40, 169, 230], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 36, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' }
    }
  });

  const finalY = pdf.lastAutoTable.finalY + 8;
  const rightX = pdf.internal.pageSize.getWidth() - 14;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Total Purchase Amount (LKR):`, rightX - 65, finalY + 2);
  pdf.text(formatCurrency(purchaseDoc.total_amount_lkr || purchaseDoc.total_landed_lkr || 0), rightX, finalY + 2, { align: 'right' });

  // Footer notes & signature
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.text('Stock verified and entered into inventory warehouse balances.', 14, finalY + 20);
  pdf.text('Store Manager Signature: _______________________', rightX - 75, finalY + 20);

  pdf.save(`${purchaseDoc.doc_no || purchaseDoc.grn_no || 'Purchase_Doc'}.pdf`);
}

