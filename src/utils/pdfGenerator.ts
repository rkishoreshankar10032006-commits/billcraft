import { jsPDF } from 'jspdf';
import { Invoice, BusinessSettings } from '../types';
import { formatDate } from './formatters';

export function generateInvoicePDF(invoice: Invoice, settings: BusinessSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Header background accent bar
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, y, pageWidth - 2 * margin, 24, 'F');

  // Business Name in header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings.companyName || 'BillCraft Digital', margin + 6, y + 10);

  // Tagline or INVOICE label
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate-300
  if (settings.tagline) {
    doc.text(settings.tagline, margin + 6, y + 16);
  }

  // Invoice label on top right of header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - margin - 6, y + 11, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin - 6, y + 17, { align: 'right' });

  y += 32;

  // Two columns: Left (Seller Details) & Right (Invoice Details & Status)
  const leftColX = margin + 2;
  const rightColX = pageWidth / 2 + 10;

  // Seller Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('BILLED FROM:', leftColX, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(settings.companyName, leftColX, y);

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const addressLines = doc.splitTextToSize(`${settings.address}, ${settings.city}, ${settings.state} - ${settings.postalCode}, ${settings.country}`, 75);
  doc.text(addressLines, leftColX, y);
  y += addressLines.length * 4;

  doc.text(`Email: ${settings.email}`, leftColX, y);
  y += 4;
  doc.text(`Phone: ${settings.phone}`, leftColX, y);
  if (settings.taxId) {
    y += 4;
    doc.text(`GSTIN / Tax ID: ${settings.taxId}`, leftColX, y);
  }

  // Right Column: Invoice Dates & Status
  let rightY = margin + 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('INVOICE DETAILS:', rightColX, rightY);

  rightY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const drawDetailRow = (label: string, value: string, curY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, rightColX, curY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value, rightColX + 32, curY);
  };

  drawDetailRow('Invoice Date:', formatDate(invoice.issueDate), rightY);
  rightY += 4.5;
  drawDetailRow('Due Date:', formatDate(invoice.dueDate), rightY);
  rightY += 4.5;
  drawDetailRow('Payment Terms:', invoice.paymentTerms || 'Net 30', rightY);
  rightY += 4.5;
  drawDetailRow('Status:', invoice.status.toUpperCase(), rightY);

  // Align vertical position after both columns
  y = Math.max(y, rightY) + 8;

  // Customer / Bill To Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text('BILL TO / CUSTOMER:', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName, margin + 4, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const custAddr = invoice.customerBillingAddress || 'Address on file';
  doc.text(custAddr, margin + 4, y + 15);

  let custContact = `Email: ${invoice.customerEmail}`;
  if (invoice.customerPhone) custContact += `  |  Phone: ${invoice.customerPhone}`;
  if (invoice.customerTaxId) custContact += `  |  Tax ID: ${invoice.customerTaxId}`;
  doc.text(custContact, margin + 4, y + 19.5);

  y += 30;

  // Items Table Header
  const tableX = margin;
  const tableWidth = pageWidth - 2 * margin;

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(tableX, y, tableWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(tableX, y + 8, tableX + tableWidth, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const colX = {
    num: tableX + 3,
    desc: tableX + 12,
    qty: tableX + 90,
    price: tableX + 110,
    disc: tableX + 130,
    tax: tableX + 148,
    total: tableX + tableWidth - 3,
  };

  doc.text('#', colX.num, y + 5.5);
  doc.text('Item & Description', colX.desc, y + 5.5);
  doc.text('Qty', colX.qty, y + 5.5, { align: 'center' });
  doc.text('Price', colX.price, y + 5.5, { align: 'right' });
  doc.text('Disc%', colX.disc, y + 5.5, { align: 'right' });
  doc.text('Tax%', colX.tax, y + 5.5, { align: 'right' });
  doc.text('Total', colX.total, y + 5.5, { align: 'right' });

  y += 9;

  // Item Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const currency = invoice.currencySymbol || '₹';

  invoice.items.forEach((item, index) => {
    // Check page overflow
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    const rowBg = index % 2 === 1 ? 250 : 255;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(tableX, y, tableWidth, 7, 'F');

    doc.setTextColor(100, 116, 139);
    doc.text(String(index + 1), colX.num, y + 4.8);

    doc.setTextColor(15, 23, 42);
    // Truncate long descriptions if needed
    const desc = item.description.length > 45 ? item.description.substring(0, 42) + '...' : item.description;
    doc.text(desc, colX.desc, y + 4.8);

    doc.text(String(item.quantity), colX.qty, y + 4.8, { align: 'center' });
    doc.text(`${currency}${item.unitPrice.toFixed(2)}`, colX.price, y + 4.8, { align: 'right' });
    doc.text(item.discountPercent ? `${item.discountPercent}%` : '-', colX.disc, y + 4.8, { align: 'right' });
    doc.text(`${item.taxRate}%`, colX.tax, y + 4.8, { align: 'right' });
    doc.text(`${currency}${item.amount.toFixed(2)}`, colX.total, y + 4.8, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(tableX, y + 7, tableX + tableWidth, y + 7);

    y += 7.5;
  });

  y += 4;

  // Summary and Totals (Right-aligned)
  const totalsWidth = 75;
  const totalsX = tableX + tableWidth - totalsWidth;

  const drawTotalLine = (label: string, value: string, isBold: boolean = false, isHighlight: boolean = false) => {
    if (isHighlight) {
      doc.setFillColor(238, 242, 255); // Indigo-50
      doc.roundedRect(totalsX - 3, y - 3.5, totalsWidth + 3, 7.5, 1, 1, 'F');
      doc.setTextColor(79, 70, 229); // Indigo-600
    } else {
      doc.setTextColor(isBold ? 15 : 71, isBold ? 23 : 85, isBold ? 42 : 105);
    }
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isHighlight ? 9.5 : 8.5);
    doc.text(label, totalsX, y + 1);
    doc.text(value, colX.total, y + 1, { align: 'right' });
    y += 5.5;
  };

  drawTotalLine('Subtotal:', `${currency}${invoice.subtotal.toFixed(2)}`);

  if (invoice.discountTotal > 0) {
    drawTotalLine(`Discount (${invoice.discountValue}${invoice.discountType === 'percentage' ? '%' : ''}):`, `-${currency}${invoice.discountTotal.toFixed(2)}`);
  }

  if (invoice.taxTotal > 0) {
    drawTotalLine('Tax / GST Total:', `${currency}${invoice.taxTotal.toFixed(2)}`);
  }

  drawTotalLine('Grand Total:', `${currency}${invoice.grandTotal.toFixed(2)}`, true, true);

  if (invoice.amountPaid > 0) {
    drawTotalLine('Amount Paid:', `${currency}${invoice.amountPaid.toFixed(2)}`, true);
    drawTotalLine('Balance Due:', `${currency}${invoice.balanceDue.toFixed(2)}`, true);
  }

  // Left side notes and bank details
  const leftBottomY = y - (invoice.amountPaid > 0 ? 32 : 22);
  let noteY = leftBottomY;

  if (invoice.bankDetails || settings.bankDetails) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('PAYMENT INSTRUCTIONS / BANK DETAILS:', tableX, noteY);
    noteY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const bankLines = doc.splitTextToSize(invoice.bankDetails || settings.bankDetails, 85);
    doc.text(bankLines, tableX, noteY);
    noteY += bankLines.length * 3.5 + 3;
  }

  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('NOTES:', tableX, noteY);
    noteY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(invoice.notes, 85);
    doc.text(noteLines, tableX, noteY);
  }

  // Footer bar on every page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(
    `${settings.companyName}  •  ${settings.email}  •  ${settings.phone}  •  Generated by BillCraft`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // Save the PDF
  doc.save(`${invoice.invoiceNumber}.pdf`);
}
