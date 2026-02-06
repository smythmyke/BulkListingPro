const ExcelJS = require('exceljs');
const path = require('path');

const CATEGORIES = [
  'Digital Prints',
  'Guides & How Tos',
  'Drawing & Illustration',
  'Digital Patterns',
  'Planners & Templates',
  'Clip Art & Image Files',
  'Cutting Machine Files (SVG)',
  'Embroidery Machine Files',
  '3D Printer Files',
  'Knitting Machine Files',
  'Social Media Templates',
  'Resume Templates',
  'Greeting Card Templates',
  'Menu Templates',
  'Event Program Templates',
  'Newsletter Templates',
  'Personal Finance Templates',
  'Bookkeeping Templates',
  'Contract & Agreement Templates',
  'Flashcards',
  'Study Guides',
  'Worksheets',
  'Fonts',
  'Photography',
];

const CATEGORY_DESCRIPTIONS = {
  'Digital Prints': 'Wall art, printable artwork',
  'Guides & How Tos': 'eBooks, tutorials, instructional guides',
  'Drawing & Illustration': 'Digital art, illustrations, drawings',
  'Digital Patterns': 'Sewing, knitting, crochet patterns',
  'Planners & Templates': 'Daily, weekly, monthly planners and templates',
  'Clip Art & Image Files': 'Clipart, PNG bundles, graphic elements',
  'Cutting Machine Files (SVG)': 'SVG files for Cricut, Silhouette',
  'Embroidery Machine Files': 'PES, DST embroidery designs',
  '3D Printer Files': 'STL, OBJ 3D print models',
  'Knitting Machine Files': 'Machine knitting patterns',
  'Social Media Templates': 'Instagram, Facebook, Pinterest templates',
  'Resume Templates': 'CV and resume designs',
  'Greeting Card Templates': 'Birthday, holiday cards',
  'Menu Templates': 'Restaurant, event menus',
  'Event Program Templates': 'Wedding, party programs',
  'Newsletter Templates': 'Email newsletters',
  'Personal Finance Templates': 'Budget sheets, expense trackers',
  'Bookkeeping Templates': 'Business accounting, invoices',
  'Contract & Agreement Templates': 'Legal contracts, agreements',
  'Flashcards': 'Study flashcards',
  'Study Guides': 'Educational study materials',
  'Worksheets': 'Printable worksheets',
  'Fonts': 'Typefaces, font families',
  'Photography': 'Stock photos, photo bundles',
};

const OPTIONS = {
  who_made: ['I did', 'A member of my shop', 'Another company or person'],
  what_is_it: ['A finished product', 'A supply or tool to make things'],
  ai_content: ['Created by me', 'With an AI generator'],
  when_made: ['Made to order', '2020 - 2026', '2010 - 2019', '2007 - 2009', 'Before 2007'],
  renewal: ['Automatic', 'Manual'],
  listing_state: ['Draft', 'Active'],
};

const THEME = {
  required: 'FFF56400',
  optional: 'FF666666',
  example: 'FFFFF9C4',
  exampleText: 'FF666666',
  white: 'FFFFFFFF',
  categoryHeader: 'FF1565C0',
  instructionHeader: 'FF6A1B9A',
  optionsHeader: 'FF2E7D32',
  filePathHeader: 'FFF56400',
};

const REQUIRED_COLUMNS = ['title', 'description', 'price', 'category'];

const COLUMNS = [
  { key: 'sku', header: 'sku', width: 15, note: 'Optional. Your internal reference code for tracking.' },
  { key: 'title', header: 'title', width: 50, note: 'Required. Max 140 characters. This is displayed as the listing title on Etsy.' },
  { key: 'description', header: 'description', width: 60, note: 'Required. Full product description. No character limit.' },
  { key: 'price', header: 'price', width: 10, note: 'Required. Number only, no $ sign. Minimum $0.20.\nExample: 5.99' },
  { key: 'category', header: 'category', width: 28, note: 'Required. Use the dropdown to select a category.\nSee the Categories sheet for the full list.' },
  { key: 'who_made', header: 'who_made', width: 28, note: 'Optional. Use dropdown. Who made this product?\nDefault: I did' },
  { key: 'what_is_it', header: 'what_is_it', width: 34, note: 'Optional. Use dropdown. Is it a finished product or supply?\nDefault: A finished product' },
  { key: 'ai_content', header: 'ai_content', width: 22, note: 'Optional. Use dropdown. Was AI used to create this?\nDefault: Created by me' },
  { key: 'when_made', header: 'when_made', width: 16, note: 'Optional. Use dropdown. When was this made?\nDefault: Made to order' },
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
  { key: 'materials', header: 'materials', width: 30, note: 'Optional. Comma-separated list of materials.\nExample: cotton, linen, paper' },
  { key: 'quantity', header: 'quantity', width: 10, note: 'Optional. Stock quantity (1-999). Defaults to 999 for digital products.' },
  { key: 'renewal', header: 'renewal', width: 14, note: 'Optional. Use dropdown. Auto-renew when expired?\nDefault: Automatic ($0.20/renewal)' },
  { key: 'listing_state', header: 'listing_state', width: 14, note: 'Optional. Use dropdown. Save as draft or publish?\nDefault: Draft' },
];

function applyDropdown(sheet, colKey, optionsList, errorTitle, errorMsg) {
  const colIndex = COLUMNS.findIndex(c => c.key === colKey) + 1;
  if (colIndex === 0) return;
  const formulae = ['"' + optionsList.join(',') + '"'];
  for (let row = 2; row <= 501; row++) {
    sheet.getCell(row, colIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae,
      showDropDown: false,
      errorTitle,
      error: errorMsg,
      showErrorMessage: true
    };
  }
}

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
    cell.font = { bold: true, color: { argb: THEME.white } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: REQUIRED_COLUMNS.includes(col.key) ? THEME.required : THEME.optional }
    };
    if (col.note) {
      cell.note = col.note;
    }
  });

  productsSheet.addRow({
    sku: 'PLAN-2026-001',
    title: 'Daily Planner 2026 Printable PDF - Minimalist Hourly Schedule With Weekly Goals and Habit Tracker - Instant Download',
    description: 'Stay organized all year with this beautifully designed 2026 daily planner! Includes hourly scheduling, weekly goal setting, and habit tracking pages.\n\nWhat\'s included:\n- 365 daily planner pages\n- 52 weekly review pages\n- 12 monthly overview pages\n- Printable on US Letter & A4',
    price: 4.99,
    category: 'Planners & Templates',
    who_made: 'I did',
    what_is_it: 'A finished product',
    ai_content: 'Created by me',
    when_made: 'Made to order',
    image_1: 'C:\\Users\\YourName\\Images\\planner-cover.jpg',
    image_2: 'C:\\Users\\YourName\\Images\\planner-daily.jpg',
    image_3: 'C:\\Users\\YourName\\Images\\planner-weekly.jpg',
    digital_file_1: 'C:\\Users\\YourName\\Files\\Daily-Planner-2026.zip',
    digital_file_name_1: 'Daily-Planner-2026.zip',
    tag_1: 'daily planner 2026', tag_2: 'digital planner', tag_3: 'printable planner',
    tag_4: 'GoodNotes planner', tag_5: 'habit tracker', tag_6: 'hourly schedule',
    tag_7: 'minimalist planner', tag_8: 'iPad planner', tag_9: 'instant download',
    tag_10: 'weekly goals', tag_11: 'PDF planner', tag_12: 'productivity', tag_13: 'digital download',
    materials: '',
    quantity: 999,
    renewal: 'Automatic',
    listing_state: 'Draft'
  });

  const exampleRow = productsSheet.getRow(2);
  exampleRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.example } };
    cell.font = { italic: true, color: { argb: THEME.exampleText } };
  });
  productsSheet.getCell('A2').note = 'DELETE THIS ROW - it is just an example';

  // Category dropdown (references Categories sheet)
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

  // Dropdown fields using inline lists
  applyDropdown(productsSheet, 'who_made', OPTIONS.who_made, 'Invalid Selection', 'Please select from the dropdown.');
  applyDropdown(productsSheet, 'what_is_it', OPTIONS.what_is_it, 'Invalid Selection', 'Please select from the dropdown.');
  applyDropdown(productsSheet, 'ai_content', OPTIONS.ai_content, 'Invalid Selection', 'Please select from the dropdown.');
  applyDropdown(productsSheet, 'when_made', OPTIONS.when_made, 'Invalid Selection', 'Please select from the dropdown.');
  applyDropdown(productsSheet, 'renewal', OPTIONS.renewal, 'Invalid Selection', 'Please select Automatic or Manual.');
  applyDropdown(productsSheet, 'listing_state', OPTIONS.listing_state, 'Invalid State', 'Please select Draft or Active.');

  // Title validation
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

  // Tag validation
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

  // Price validation + format
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
  catHeader.font = { bold: true, color: { argb: THEME.white } };
  catHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.categoryHeader } };

  CATEGORIES.forEach(cat => {
    categoriesSheet.addRow({ name: cat, desc: CATEGORY_DESCRIPTIONS[cat] || '' });
  });

  // ========== SHEET 3: Options ==========
  const optionsSheet = workbook.addWorksheet('Options');

  const optionEntries = [
    { field: 'Who Made It', key: 'who_made', values: OPTIONS.who_made, desc: 'Who made this product? Used in the "About this listing" section.' },
    { field: 'What Is It', key: 'what_is_it', values: OPTIONS.what_is_it, desc: 'Is this a finished product or a supply/tool?' },
    { field: 'Content Type', key: 'ai_content', values: OPTIONS.ai_content, desc: 'Was AI used to help create this product?' },
    { field: 'When Made', key: 'when_made', values: OPTIONS.when_made, desc: 'When was this product made or designed?' },
    { field: 'Renewal', key: 'renewal', values: OPTIONS.renewal, desc: 'Auto-renew listing when it expires? ($0.20 per renewal)' },
    { field: 'Listing State', key: 'listing_state', values: OPTIONS.listing_state, desc: 'Save as draft to review later, or publish immediately.' },
  ];

  optionsSheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Spreadsheet Column', key: 'column', width: 18 },
    { header: 'Valid Options', key: 'options', width: 36 },
    { header: 'Default', key: 'default', width: 20 },
    { header: 'Description', key: 'desc', width: 55 },
  ];

  const optHeader = optionsSheet.getRow(1);
  optHeader.font = { bold: true, color: { argb: THEME.white } };
  optHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.optionsHeader } };

  optionEntries.forEach(entry => {
    entry.values.forEach((val, i) => {
      optionsSheet.addRow({
        field: i === 0 ? entry.field : '',
        column: i === 0 ? entry.key : '',
        options: val,
        default: i === 0 ? entry.values[0] : '',
        desc: i === 0 ? entry.desc : '',
      });
    });
    optionsSheet.addRow({});
  });

  // ========== SHEET 4: Instructions ==========
  const instructionsSheet = workbook.addWorksheet('Instructions');

  instructionsSheet.columns = [
    { header: 'Column', key: 'column', width: 22 },
    { header: 'Required', key: 'required', width: 10 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'Example', key: 'example', width: 40 },
    { header: 'Default', key: 'default', width: 22 },
  ];

  const instrHeader = instructionsSheet.getRow(1);
  instrHeader.font = { bold: true, color: { argb: THEME.white } };
  instrHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.instructionHeader } };

  const instructions = [
    { column: 'sku', required: 'No', description: 'Your internal reference code for tracking', example: 'PLAN-001', default: '' },
    { column: 'title', required: 'Yes', description: 'Product title shown on Etsy (max 140 chars)', example: 'Daily Planner Template Printable PDF', default: '' },
    { column: 'description', required: 'Yes', description: 'Full product description', example: 'Beautiful daily planner...', default: '' },
    { column: 'price', required: 'Yes', description: 'Price in USD (minimum $0.20)', example: '5.99', default: '' },
    { column: 'category', required: 'Yes', description: 'Select from dropdown (see Categories sheet)', example: 'Planners & Templates', default: 'Digital Prints' },
    { column: 'who_made', required: 'No', description: 'Who made this product? (select from dropdown)', example: 'I did', default: 'I did' },
    { column: 'what_is_it', required: 'No', description: 'Finished product or supply? (select from dropdown)', example: 'A finished product', default: 'A finished product' },
    { column: 'ai_content', required: 'No', description: 'Was AI used to create this? (select from dropdown)', example: 'Created by me', default: 'Created by me' },
    { column: 'when_made', required: 'No', description: 'When was this made? (select from dropdown)', example: 'Made to order', default: 'Made to order' },
    { column: 'image_1', required: 'No', description: 'Primary product image - local path or URL', example: 'C:\\Images\\product.jpg', default: '' },
    { column: 'image_2 to image_5', required: 'No', description: 'Additional images (up to 5 total)', example: '', default: '' },
    { column: 'digital_file_1', required: 'No', description: 'The downloadable file - local path or URL', example: 'C:\\Files\\product.zip', default: '' },
    { column: 'digital_file_name_1', required: 'No', description: 'Display name shown to buyer after purchase', example: 'My-Planner.zip', default: '' },
    { column: 'tag_1 to tag_13', required: 'No', description: 'Search tags (max 13 tags, each max 20 chars)', example: 'planner, printable', default: '' },
    { column: 'materials', required: 'No', description: 'Materials used, comma-separated', example: 'cotton, linen, paper', default: '' },
    { column: 'quantity', required: 'No', description: 'Stock quantity (1-999)', example: '999', default: '999' },
    { column: 'renewal', required: 'No', description: 'Auto-renew when listing expires? (select from dropdown)', example: 'Automatic', default: 'Automatic' },
    { column: 'listing_state', required: 'No', description: 'Save as draft or publish? (select from dropdown)', example: 'Draft', default: 'Draft' },
  ];

  instructions.forEach(instr => instructionsSheet.addRow(instr));
  instructionsSheet.addRow({});
  instructionsSheet.addRow({ column: '--- FILE PATHS ---' });
  instructionsSheet.addRow({ column: 'Local files:', description: 'Right-click file > "Copy as path" > Paste into spreadsheet' });
  instructionsSheet.addRow({ column: 'Dropbox:', description: 'Share > Copy link > Change ?dl=0 to ?dl=1 at the end' });
  instructionsSheet.addRow({ column: 'Google Drive:', description: 'Only works for small files (<25MB). Use format: https://drive.google.com/uc?export=download&id=FILE_ID' });

  // ========== SHEET 5: File Paths Help ==========
  const filePathsSheet = workbook.addWorksheet('File Paths Help');

  filePathsSheet.columns = [
    { header: 'Source', key: 'source', width: 20 },
    { header: 'How to Get Path/URL', key: 'how', width: 80 }
  ];

  const fpHeader = filePathsSheet.getRow(1);
  fpHeader.font = { bold: true, color: { argb: THEME.white } };
  fpHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.filePathHeader } };

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
  console.log('Output: ' + outputPath + '\n');
  console.log('Sheets:');
  console.log('  1. Products     - Data entry with dropdowns and validation (' + COLUMNS.length + ' columns)');
  console.log('  2. Categories   - ' + CATEGORIES.length + ' category options');
  console.log('  3. Options      - Dropdown values reference for all selection fields');
  console.log('  4. Instructions - Column-by-column guide with defaults');
  console.log('  5. File Paths   - How to get file paths and URLs');
}

generateTemplate().catch(console.error);
