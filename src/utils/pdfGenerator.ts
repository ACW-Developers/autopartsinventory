import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceiptItem {
  name: string;
  partNumber: string;
  brand?: string | null;
  yearRange?: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  total: number;
  cashier: string;
  businessName: string;
}

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 220] // Receipt paper size - slightly taller for more details
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.businessName, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt: ${data.receiptNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(data.date, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Customer: ${data.customerName}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Divider
  doc.setLineWidth(0.1);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  // Items
  doc.setFontSize(7);
  data.items.forEach(item => {
    // Item name
    doc.setFont('helvetica', 'bold');
    doc.text(item.name, 5, y);
    y += 3;
    
    // Part number and details
    doc.setFont('helvetica', 'normal');
    let detailLine = item.partNumber;
    if (item.brand) detailLine += ` | ${item.brand}`;
    if (item.yearRange) detailLine += ` | ${item.yearRange}`;
    doc.text(`  ${detailLine}`, 5, y);
    y += 3;
    
    // Quantity and price
    doc.text(`  ${item.quantity} x $${item.price.toFixed(2)}`, 5, y);
    doc.text(`$${item.total.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
    y += 5;
  });

  // Divider
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  // Totals
  doc.setFontSize(8);
  doc.text('Subtotal:', 5, y);
  doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
  y += 4;

  if (data.discount > 0) {
    doc.text(`Discount (${data.discountCode || 'Applied'}):`, 5, y);
    doc.text(`-$${data.discount.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', 5, y);
  doc.text(`$${data.total.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
  y += 6;

  // Divider
  doc.setFont('helvetica', 'normal');
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  // Footer
  doc.setFontSize(7);
  doc.text(`Cashier: ${data.cashier}`, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

  return doc;
}

interface SalesReportData {
  period: string;
  businessName: string;
  generatedAt: string;
  salesData: Array<{ date: string; total: number; transactions: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
}

export function generateSalesReportPDF(data: SalesReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.businessName, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sales Report - ${data.period}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.text(`Generated: ${data.generatedAt}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Summary Cards
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(15, y, 55, 25, 3, 3, 'F');
  doc.roundedRect(75, y, 55, 25, 3, 3, 'F');
  doc.roundedRect(135, y, 55, 25, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Total Revenue', 42.5, y + 8, { align: 'center' });
  doc.text('Transactions', 102.5, y + 8, { align: 'center' });
  doc.text('Avg Order Value', 162.5, y + 8, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`$${data.totalRevenue.toFixed(2)}`, 42.5, y + 18, { align: 'center' });
  doc.text(`${data.totalTransactions}`, 102.5, y + 18, { align: 'center' });
  doc.text(`$${data.averageOrderValue.toFixed(2)}`, 162.5, y + 18, { align: 'center' });

  y += 35;

  // Sales by Date Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Daily Sales Breakdown', 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Transactions', 'Revenue']],
    body: data.salesData.map(row => [
      row.date,
      row.transactions.toString(),
      `$${row.total.toFixed(2)}`
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Top Products Table
  if (data.topProducts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Top Selling Products', 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Product', 'Qty Sold', 'Revenue']],
      body: data.topProducts.map(row => [
        row.name,
        row.quantity.toString(),
        `$${row.revenue.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 15, right: 15 },
    });
  }

  return doc;
}

interface InventoryReportData {
  businessName: string;
  generatedAt: string;
  items: Array<{
    partNumber: string;
    partName: string;
    category: string;
    brand?: string;
    yearRange?: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    stockValue: number;
    status: string;
  }>;
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
}

export function generateInventoryReportPDF(data: InventoryReportData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.businessName, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Inventory Report', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.text(`Generated: ${data.generatedAt}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Summary
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(20, y, 80, 20, 3, 3, 'F');
  doc.roundedRect(110, y, 80, 20, 3, 3, 'F');
  doc.roundedRect(200, y, 80, 20, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Total Items', 60, y + 7, { align: 'center' });
  doc.text('Total Stock Value', 150, y + 7, { align: 'center' });
  doc.text('Low Stock Items', 240, y + 7, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`${data.totalItems}`, 60, y + 15, { align: 'center' });
  doc.text(`$${data.totalValue.toFixed(2)}`, 150, y + 15, { align: 'center' });
  doc.text(`${data.lowStockCount}`, 240, y + 15, { align: 'center' });

  y += 30;

  // Inventory Table with brand and year
  autoTable(doc, {
    startY: y,
    head: [['Part #', 'Name', 'Brand', 'Year', 'Category', 'Qty', 'Cost', 'Price', 'Value', 'Status']],
    body: data.items.map(item => [
      item.partNumber,
      item.partName,
      item.brand || '-',
      item.yearRange || '-',
      item.category,
      item.quantity.toString(),
      `$${item.costPrice.toFixed(2)}`,
      `$${item.sellingPrice.toFixed(2)}`,
      `$${item.stockValue.toFixed(2)}`,
      item.status
    ]),
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: 10, right: 10 },
    styles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 40 },
      2: { cellWidth: 22 },
      3: { cellWidth: 18 },
      4: { cellWidth: 28 },
      5: { cellWidth: 15 },
      6: { cellWidth: 18 },
      7: { cellWidth: 18 },
      8: { cellWidth: 22 },
      9: { cellWidth: 20 }
    }
  });

  return doc;
}