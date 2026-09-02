import fs from 'fs';
import * as XLSX from 'xlsx';

const csvContent = fs.readFileSync('aronium_products_import.csv', 'utf8');
const workbook = XLSX.read(csvContent, { type: 'string' });
XLSX.writeFile(workbook, 'aronium_products_import.xlsx');
console.log('Successfully generated aronium_products_import.xlsx');
