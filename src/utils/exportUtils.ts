// src/utils/exportUtils.ts
import { InventoryItem } from '../pages/InventoryPage';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

// Helper to convert a date to a string in the format MM/DD/YYYY
const formatDate = (date: string): string => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

/**
 * Export inventory items to CSV format
 * @param items Items to export
 * @param filename Base filename (without extension)
 */
export const exportToCSV = (items: InventoryItem[], filename: string = 'inventory'): void => {
  // Define which columns to include and their headers
  const headers = [
    'ID',
    'Product Name',
    'Brand',
    'Category',
    'Status',
    'Size',
    'Purchase Price',
    'Market Price',
    'Est. Profit',
    'ROI (%)',
    'Purchase Date',
    'Days in Inventory',
    'SKU/Reference',
    'Shipping Cost'
  ];
  
  // Map items to rows
  const rows = items.map(item => [
    item.id,
    item.productName,
    item.brand,
    item.category,
    item.status,
    item.size || '',
    item.purchasePrice,
    item.marketPrice,
    item.estimatedProfit,
    item.roi.toFixed(2),
    formatDate(item.purchaseDate),
    item.daysInInventory,
    item.reference || '',
    item.shippingPrice || 0
  ]);
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Wrap strings with commas in quotes
      if (typeof cell === 'string' && cell.includes(',')) {
        return `"${cell}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');
  
  // Create a download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export inventory items to Excel format
 * @param items Items to export
 * @param filename Base filename (without extension)
 */
export const exportToExcel = (items: InventoryItem[], filename: string = 'inventory'): void => {
  // Define which columns to include and their headers
  const headers = [
    'ID',
    'Product Name',
    'Brand',
    'Category',
    'Status',
    'Size',
    'Purchase Price',
    'Market Price',
    'Est. Profit',
    'ROI (%)',
    'Purchase Date',
    'Days in Inventory',
    'SKU/Reference',
    'Shipping Cost'
  ];
  
  // Map items to rows
  const rows = items.map(item => [
    item.id,
    item.productName,
    item.brand,
    item.category,
    item.status,
    item.size || '',
    item.purchasePrice,
    item.marketPrice,
    item.estimatedProfit,
    item.roi.toFixed(2),
    formatDate(item.purchaseDate),
    item.daysInInventory,
    item.reference || '',
    item.shippingPrice || 0
  ]);
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Create workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  
  // Auto-size columns
  const columnsWidth = [
    { wch: 10 }, // ID
    { wch: 40 }, // Product Name
    { wch: 20 }, // Brand
    { wch: 15 }, // Category
    { wch: 10 }, // Status
    { wch: 10 }, // Size
    { wch: 15 }, // Purchase Price
    { wch: 15 }, // Market Price
    { wch: 15 }, // Est. Profit
    { wch: 12 }, // ROI (%)
    { wch: 15 }, // Purchase Date
    { wch: 18 }, // Days in Inventory
    { wch: 15 }, // SKU/Reference
    { wch: 15 }, // Shipping Cost
  ];
  
  worksheet['!cols'] = columnsWidth;
  
  // Generate Excel file
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Export inventory items to PDF format
 * @param items Items to export
 * @param filename Base filename (without extension)
 */
export const exportToPDF = (items: InventoryItem[], filename: string = 'inventory'): void => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Inventory Report', 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Define table headers and data
  const headers = [
    'ID',
    'Product Name',
    'Brand',
    'Category',
    'Status',
    'Price ($)',
    'Profit ($)',
    'ROI (%)',
    'Days In'
  ];
  
  // Map items to rows for the table
  const rows = items.map(item => [
    item.id,
    item.productName,
    item.brand,
    item.category,
    item.status,
    item.marketPrice.toFixed(2),
    item.estimatedProfit.toFixed(2),
    item.roi.toFixed(2),
    item.daysInInventory
  ]);
  
  // Generate the table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 40,
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 15 }, // ID
      1: { cellWidth: 40 }, // Product Name
      2: { cellWidth: 25 }, // Brand
      3: { cellWidth: 25 }, // Category
      4: { cellWidth: 20 }, // Status
      5: { cellWidth: 20, halign: 'right' }, // Price
      6: { cellWidth: 20, halign: 'right' }, // Profit
      7: { cellWidth: 15, halign: 'right' }, // ROI
      8: { cellWidth: 15, halign: 'right' }, // Days In
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
    margin: { top: 40 },
  });
  
  // Add summary statistics at the bottom
  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + item.marketPrice, 0);
  const totalProfit = items.reduce((sum, item) => sum + item.estimatedProfit, 0);
  const avgROI = items.length > 0 ? items.reduce((sum, item) => sum + item.roi, 0) / items.length : 0;
  
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  
  doc.setFontSize(12);
  doc.text('Summary:', 14, finalY + 20);
  
  doc.setFontSize(10);
  doc.text(`Total Items: ${totalItems}`, 14, finalY + 30);
  doc.text(`Total Market Value: $${totalValue.toFixed(2)}`, 14, finalY + 40);
  doc.text(`Total Estimated Profit: $${totalProfit.toFixed(2)}`, 14, finalY + 50);
  doc.text(`Average ROI: ${avgROI.toFixed(2)}%`, 14, finalY + 60);
  
  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }
  
  // Save the PDF
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
};