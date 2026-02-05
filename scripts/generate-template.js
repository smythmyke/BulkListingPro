const ExcelJS = require('exceljs');
const path = require('path');

const CATEGORIES = [
  'Guides & How Tos',
  'Planner Templates',
  'Journal Templates',
  'Digital Prints',
  'Social Media Templates',
  'Contract & Agreement Templates',
  'Personal Finance Templates',
  'Bookkeeping Templates',
  'Menu Templates',
  'Newsletter Templates',
  'Gift Tag Templates',
  'Greeting Card Templates',
  'Event Program Templates',
  'Calendars & Planners',
  'Templates',
  'Flashcards',
  'Study Guides',
  'Worksheets',
  'Architectural & Drafting Templates',
  'Chore Chart Templates',
  'Drawing & Illustration',
  'Digital Patterns',
  'Planners & Templates',
];

const CATEGORY_DESCRIPTIONS = {
  'Guides & How Tos': 'eBooks, tutorials, instructional guides',
  'Planner Templates': 'Daily, weekly, monthly planners',
  'Journal Templates': 'Journals, diaries, reflection templates',
  'Digital Prints': 'Wall art, printable artwork',
  'Social Media Templates': 'Instagram, Facebook, Pinterest templates',
  'Contract & Agreement Templates': 'Legal contracts, agreements',
  'Personal Finance Templates': 'Budget sheets, expense trackers',
  'Bookkeeping Templates': 'Business accounting, invoices',
  'Menu Templates': 'Restaurant, event menus',
  'Newsletter Templates': 'Email newsletters',
  'Gift Tag Templates': 'Printable gift tags',
  'Greeting Card Templates': 'Birthday, holiday cards',
  'Event Program Templates': 'Wedding, party programs',
  'Calendars & Planners': 'Calendar designs',
  'Templates': 'General templates',
  'Flashcards': 'Study flashcards',
  'Study Guides': 'Educational study materials',
  'Worksheets': 'Printable worksheets',
  'Architectural & Drafting Templates': 'Design, drafting templates',
  'Chore Chart Templates': 'Household chore trackers',
  'Drawing & Illustration': 'Digital art, illustrations, drawings',
  'Digital Patterns': 'Sewing, knitting, crochet patterns',
  'Planners & Templates': 'Combined planners and template bundles',
};

const REQUIRED_COLUMNS = ['title', 'description', 'price', 'category'];

const COLUMNS = [
  { key: 'sku', header: 'sku', width: 15, note: 'Optional. Your internal reference code for tracking.' },
  { key: 'title', header: 'title', width: 50, note: 'Required. Max 140 characters. This is displayed as the listing title on Etsy.' },
  { key: 'description', header: 'description', width: 60, note: 'Required. Full product description. No character limit.' },
  { key: 'price', header: 'price', width: 10, note: 'Required. Number only, no $ sign. Minimum $0.20.\nExample: 5.99' },
  { key: 'category', header: 'category', width: 25, note: 'Required. Use the dropdown to select a category.\nSee the Categories sheet for the full list.' },
  { key: 'image_1', header: 'image_1', width: 40, note: 'Optional. Local file path or URL to primary product image.\nSee File Paths Help sheet.' },
  { key: 'image_2', header: 'image_2', width: 40, note: 'Optional. Additional image (up to 5 total).' },
  { key: 'image_3', header: 'image_3', width: 40, note: 'Optional. Additional image (up to 5 total).' },
  { key: 'image_4', header: 'image_4', width: 40, note: 'Optional. Additional image (up to 5 total).' },
  { key: 'image_5', header: 'image_5', width: 40, note: 'Optional. Additional image (up to 5 total).' },
  { key: 'digital_file_1', header: 'digital_file_1', width: 40, note: 'Optional. Local file path or URL to the downloadable file.\nSee File Paths Help sheet.' },
  { key: 'digital_file_name_1', header: 'digital_file_name_1', width: 30, note: 'Optional. Display name shown to the buyer for the download.' },
  { key: 'tag_1', header: 'tag_1', width: 20, note: 'Optional. Max 20 characters. Search tag to help buyers find your listing.' },
  { key: 'tag_2', header: 'tag_2', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_3', header: 'tag_3', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_4', header: 'tag_4', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_5', header: 'tag_5', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_6', header: 'tag_6', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_7', header: 'tag_7', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_8', header: 'tag_8', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_9', header: 'tag_9', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_10', header: 'tag_10', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_11', header: 'tag_11', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_12', header: 'tag_12', width: 20, note: 'Optional. Max 20 characters.' },
  { key: 'tag_13', header: 'tag_13', width: 20, note: 'Optional. Max 20 characters. You can use up to 13 tags total.' },
  { key: 'quantity', header: 'quantity', width: 10, note: 'Optional. Defaults to 999 for digital products.' },
  { key: 'listing_state', header: 'listing_state', width: 12, note: 'Optional. "draft" or "active". Defaults to draft.' },
];

async function generateTemplate() {
  console.log('Generating BulkListingPro Template...\n');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BulkListingPro';
  workbook.created = new Date();

  // ========== SHEET 1: Products ==========
  const productsSheet = workbook.addWorksheet('Products', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  productsSheet.columns = COLUMNS.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width
  }));

  const headerRow = productsSheet.getRow(1);
  headerRow.height = 25;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    if (REQUIRED_COLUMNS.includes(col.key)) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF56400' }
      };
    } else {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF666666' }
      };
    }
    if (col.note) {
      cell.note = col.note;
    }
  });

  productsSheet.addRow({
    sku: 'PLAN-2026-001',
    title: 'Daily Planner 2026 Printable PDF - Minimalist Hourly Schedule With Weekly Goals and Habit Tracker - Instant Download for GoodNotes and iPad',
    description: 'Stay organized all year with this beautifully designed 2026 daily planner! Includes hourly scheduling, weekly goal setting, and habit tracking pages. Compatible with GoodNotes, Notability, and other PDF annotation apps. Also prints perfectly on US Letter and A4 paper.\n\nWhat\'s included:\n- 365 daily planner pages\n- 52 weekly review pages\n- 12 monthly overview pages\n- Printable on US Letter & A4',
    price: 4.99,
    category: 'Planner Templates',
    image_1: 'C:\\Users\\YourName\\Images\\planner-cover.jpg',
    image_2: 'C:\\Users\\YourName\\Images\\planner-daily.jpg',
    image_3: 'C:\\Users\\YourName\\Images\\planner-weekly.jpg',
    image_4: '',
    image_5: '',
    digital_file_1: 'C:\\Users\\YourName\\Files\\Daily-Planner-2026.zip',
    digital_file_name_1: 'Daily-Planner-2026.zip',
    tag_1: 'daily planner 2026',
    tag_2: 'digital planner',
    tag_3: 'printable planner',
    tag_4: 'GoodNotes planner',
    tag_5: 'habit tracker',
    tag_6: 'hourly schedule',
    tag_7: 'minimalist planner',
    tag_8: 'iPad planner',
    tag_9: 'instant download',
    tag_10: 'weekly goals',
    tag_11: 'PDF planner',
    tag_12: 'productivity',
    tag_13: 'digital download',
    quantity: 999,
    listing_state: 'draft'
  });

  const exampleRow = productsSheet.getRow(2);
  exampleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF9C4' }
  };
  exampleRow.font = { italic: true, color: { argb: 'FF666666' } };

  // Note in sku cell
  productsSheet.getCell('A2').note = 'DELETE THIS ROW - it is just an example';

  // Category dropdown
  const categoryColIndex = COLUMNS.findIndex(c => c.key === 'category') + 1;
  for (let row = 2; row <= 501; row++) {
    productsSheet.getCell(row, categoryColIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Categories!$A$2:$A$${CATEGORIES.length + 1}`],
      showDropDown: false,
      errorTitle: 'Invalid Category',
      error: 'Please select a category from the dropdown list.',
      showErrorMessage: true
    };
  }

  // listing_state dropdown
  const listingStateColIndex = COLUMNS.findIndex(c => c.key === 'listing_state') + 1;
  for (let row = 2; row <= 501; row++) {
    productsSheet.getCell(row, listingStateColIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"draft,active"'],
      showDropDown: false,
      errorTitle: 'Invalid State',
      error: 'Please select draft or active.',
      showErrorMessage: true
    };
  }

  // Title validation - max 140 characters
  const titleColIndex = COLUMNS.findIndex(c => c.key === 'title') + 1;
  for (let row = 2; row <= 501; row++) {
    productsSheet.getCell(row, titleColIndex).dataValidation = {
      type: 'textLength',
      operator: 'lessThanOrEqual',
      allowBlank: true,
      formulae: [140],
      showErrorMessage: true,
      errorTitle: 'Title Too Long',
      error: 'Title must be 140 characters or fewer.'
    };
  }

  // Tag validation - max 20 characters each
  for (let tagNum = 1; tagNum <= 13; tagNum++) {
    const tagColIndex = COLUMNS.findIndex(c => c.key === `tag_${tagNum}`) + 1;
    for (let row = 2; row <= 501; row++) {
      productsSheet.getCell(row, tagColIndex).dataValidation = {
        type: 'textLength',
        operator: 'lessThanOrEqual',
        allowBlank: true,
        formulae: [20],
        showErrorMessage: true,
        errorTitle: 'Tag Too Long',
        error: 'Each tag must be 20 characters or fewer.'
      };
    }
  }

  // Price column number format
  const priceColIndex = COLUMNS.findIndex(c => c.key === 'price') + 1;
  for (let row = 2; row <= 501; row++) {
    productsSheet.getCell(row, priceColIndex).numFmt = '#,##0.00';
    productsSheet.getCell(row, priceColIndex).dataValidation = {
      type: 'decimal',
      operator: 'greaterThanOrEqual',
      allowBlank: true,
      formulae: [0.20],
      showErrorMessage: true,
      errorTitle: 'Invalid Price',
      error: 'Price must be a number of at least $0.20.'
    };
  }

  // ========== SHEET 2: Categories ==========
  const categoriesSheet = workbook.addWorksheet('Categories');

  categoriesSheet.columns = [
    { header: 'Category Name', key: 'name', width: 35 },
    { header: 'Description', key: 'desc', width: 50 }
  ];

  const catHeader = categoriesSheet.getRow(1);
  catHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  catHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1565C0' }
  };

  CATEGORIES.forEach(cat => {
    categoriesSheet.addRow({
      name: cat,
      desc: CATEGORY_DESCRIPTIONS[cat] || ''
    });
  });

  // ========== SHEET 3: Instructions ==========
  const instructionsSheet = workbook.addWorksheet('Instructions');

  instructionsSheet.columns = [
    { header: 'Column', key: 'column', width: 20 },
    { header: 'Required', key: 'required', width: 10 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'Example', key: 'example', width: 40 }
  ];

  const instrHeader = instructionsSheet.getRow(1);
  instrHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instrHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6A1B9A' }
  };

  const instructions = [
    { column: 'sku', required: 'No', description: 'Your internal reference code for tracking', example: 'PLAN-001' },
    { column: 'title', required: 'Yes', description: 'Product title shown on Etsy (max 140 chars)', example: 'Daily Planner Template Printable PDF' },
    { column: 'description', required: 'Yes', description: 'Full product description', example: 'Beautiful daily planner...' },
    { column: 'price', required: 'Yes', description: 'Price in USD (minimum $0.20)', example: '5.99' },
    { column: 'category', required: 'Yes', description: 'Select from dropdown (see Categories sheet)', example: 'Planner Templates' },
    { column: 'image_1', required: 'No', description: 'Primary product image - local path or Dropbox URL', example: 'C:\\Images\\product.jpg' },
    { column: 'image_2-5', required: 'No', description: 'Additional images (up to 5 total)', example: '' },
    { column: 'digital_file_1', required: 'No', description: 'The downloadable file - local path or Dropbox URL', example: 'C:\\Files\\product.zip' },
    { column: 'digital_file_name_1', required: 'No', description: 'Display name shown to buyer', example: 'My-Planner.zip' },
    { column: 'tag_1 to tag_13', required: 'No', description: 'Search tags (max 13, each max 20 chars)', example: 'planner, printable' },
    { column: 'quantity', required: 'No', description: 'Stock quantity (default: 999)', example: '999' },
    { column: 'listing_state', required: 'No', description: 'draft (default) or active', example: 'draft' },
  ];

  instructions.forEach(instr => {
    instructionsSheet.addRow(instr);
  });

  instructionsSheet.addRow({});
  instructionsSheet.addRow({ column: '--- FILE PATHS ---' });
  instructionsSheet.addRow({ column: 'Local files:', description: 'Right-click file > "Copy as path" > Paste into spreadsheet' });
  instructionsSheet.addRow({ column: 'Dropbox:', description: 'Share > Copy link > Change ?dl=0 to ?dl=1 at the end' });
  instructionsSheet.addRow({ column: 'Google Drive:', description: 'Only works for small files (<25MB). Use format: https://drive.google.com/uc?export=download&id=FILE_ID' });

  // ========== SHEET 4: File Paths Help ==========
  const filePathsSheet = workbook.addWorksheet('File Paths Help');

  filePathsSheet.columns = [
    { header: 'Source', key: 'source', width: 20 },
    { header: 'How to Get Path/URL', key: 'how', width: 80 }
  ];

  const fpHeader = filePathsSheet.getRow(1);
  fpHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  fpHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF56400' }
  };

  filePathsSheet.addRow({ source: 'Windows Local', how: '1. Navigate to file in File Explorer' });
  filePathsSheet.addRow({ source: '', how: '2. Hold Shift + Right-click the file' });
  filePathsSheet.addRow({ source: '', how: '3. Select "Copy as path"' });
  filePathsSheet.addRow({ source: '', how: '4. Paste into spreadsheet (remove quotes if present)' });
  filePathsSheet.addRow({});
  filePathsSheet.addRow({ source: 'Dropbox', how: '1. Right-click file in Dropbox' });
  filePathsSheet.addRow({ source: '', how: '2. Click "Share" or "Copy link"' });
  filePathsSheet.addRow({ source: '', how: '3. Change ?dl=0 to ?dl=1 at the end of the URL' });
  filePathsSheet.addRow({ source: '', how: 'Example: https://www.dropbox.com/s/abc123/file.zip?dl=1' });
  filePathsSheet.addRow({});
  filePathsSheet.addRow({ source: 'Google Drive', how: '1. Right-click file > "Get link" > "Anyone with link"' });
  filePathsSheet.addRow({ source: '', how: '2. Copy the file ID from the URL' });
  filePathsSheet.addRow({ source: '', how: '3. Use: https://drive.google.com/uc?export=download&id=YOUR_FILE_ID' });
  filePathsSheet.addRow({ source: '', how: 'WARNING: Files over 25MB will show a virus scan warning that breaks automation' });

  // ========== Save ==========
  const outputPath = path.join(__dirname, '..', 'templates', 'BulkListingPro-template.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('Template generated successfully!');
  console.log(`Output: ${outputPath}\n`);
  console.log('Sheets:');
  console.log('  1. Products - Data entry with dropdowns and validation');
  console.log('  2. Categories - 23 category options');
  console.log('  3. Instructions - Column guide');
  console.log('  4. File Paths Help - How to get file paths/URLs');
}

generateTemplate().catch(console.error);
