const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const plannersListings = require('./seller-kit-data/planners');
const clipartListings = require('./seller-kit-data/clipart');
const wallArtListings = require('./seller-kit-data/wall-art');
const socialMediaListings = require('./seller-kit-data/social-media');
const budgetListings = require('./seller-kit-data/budget');
const seoTags = require('./seller-kit-data/seo-tags');

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

function tagsToObj(tags) {
  const obj = {};
  tags.forEach((tag, i) => { obj[`tag_${i + 1}`] = tag; });
  return obj;
}

function expandListing(listing) {
  const { tags, ...rest } = listing;
  return { ...rest, ...tagsToObj(tags) };
}

async function createNicheWorkbook(listings, outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BulkListingPro';
  workbook.created = new Date();

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
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF56400' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF666666' } };
    }
    if (col.note) cell.note = col.note;
  });

  listings.forEach(listing => {
    productsSheet.addRow(expandListing(listing));
  });

  const categoryColIndex = COLUMNS.findIndex(c => c.key === 'category') + 1;
  const listingStateColIndex = COLUMNS.findIndex(c => c.key === 'listing_state') + 1;
  const titleColIndex = COLUMNS.findIndex(c => c.key === 'title') + 1;
  const priceColIndex = COLUMNS.findIndex(c => c.key === 'price') + 1;

  for (let row = 2; row <= 501; row++) {
    productsSheet.getCell(row, categoryColIndex).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: [`Categories!$A$2:$A$${CATEGORIES.length + 1}`],
      showDropDown: false, errorTitle: 'Invalid Category',
      error: 'Please select a category from the dropdown list.', showErrorMessage: true
    };
    productsSheet.getCell(row, listingStateColIndex).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"draft,active"'],
      showDropDown: false, errorTitle: 'Invalid State',
      error: 'Please select draft or active.', showErrorMessage: true
    };
    productsSheet.getCell(row, titleColIndex).dataValidation = {
      type: 'textLength', operator: 'lessThanOrEqual', allowBlank: true,
      formulae: [140], showErrorMessage: true,
      errorTitle: 'Title Too Long', error: 'Title must be 140 characters or fewer.'
    };
    productsSheet.getCell(row, priceColIndex).numFmt = '#,##0.00';
    productsSheet.getCell(row, priceColIndex).dataValidation = {
      type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true,
      formulae: [0.20], showErrorMessage: true,
      errorTitle: 'Invalid Price', error: 'Price must be a number of at least $0.20.'
    };
  }

  for (let tagNum = 1; tagNum <= 13; tagNum++) {
    const tagColIndex = COLUMNS.findIndex(c => c.key === `tag_${tagNum}`) + 1;
    for (let row = 2; row <= 501; row++) {
      productsSheet.getCell(row, tagColIndex).dataValidation = {
        type: 'textLength', operator: 'lessThanOrEqual', allowBlank: true,
        formulae: [20], showErrorMessage: true,
        errorTitle: 'Tag Too Long', error: 'Each tag must be 20 characters or fewer.'
      };
    }
  }

  const categoriesSheet = workbook.addWorksheet('Categories');
  categoriesSheet.columns = [
    { header: 'Category Name', key: 'name', width: 35 },
    { header: 'Description', key: 'desc', width: 50 }
  ];
  const catHeader = categoriesSheet.getRow(1);
  catHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  catHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
  CATEGORIES.forEach(cat => {
    categoriesSheet.addRow({ name: cat, desc: CATEGORY_DESCRIPTIONS[cat] || '' });
  });

  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.columns = [
    { header: 'Column', key: 'column', width: 20 },
    { header: 'Required', key: 'required', width: 10 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'Example', key: 'example', width: 40 }
  ];
  const instrHeader = instructionsSheet.getRow(1);
  instrHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instrHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6A1B9A' } };
  [
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
  ].forEach(row => instructionsSheet.addRow(row));

  const filePathsSheet = workbook.addWorksheet('File Paths Help');
  filePathsSheet.columns = [
    { header: 'Source', key: 'source', width: 20 },
    { header: 'How to Get Path/URL', key: 'how', width: 80 }
  ];
  const fpHeader = filePathsSheet.getRow(1);
  fpHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  fpHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF56400' } };
  filePathsSheet.addRow({ source: 'Windows Local', how: '1. Navigate to file in File Explorer' });
  filePathsSheet.addRow({ source: '', how: '2. Hold Shift + Right-click the file' });
  filePathsSheet.addRow({ source: '', how: '3. Select "Copy as path"' });
  filePathsSheet.addRow({ source: '', how: '4. Paste into spreadsheet (remove quotes if present)' });
  filePathsSheet.addRow({});
  filePathsSheet.addRow({ source: 'Dropbox', how: '1. Right-click file in Dropbox' });
  filePathsSheet.addRow({ source: '', how: '2. Click "Share" or "Copy link"' });
  filePathsSheet.addRow({ source: '', how: '3. Change ?dl=0 to ?dl=1 at the end of the URL' });
  filePathsSheet.addRow({});
  filePathsSheet.addRow({ source: 'Google Drive', how: '1. Right-click file > "Get link" > "Anyone with link"' });
  filePathsSheet.addRow({ source: '', how: '2. Copy the file ID from the URL' });
  filePathsSheet.addRow({ source: '', how: '3. Use: https://drive.google.com/uc?export=download&id=YOUR_FILE_ID' });

  await workbook.xlsx.writeFile(outputPath);
}

async function createSeoTagLibrary(outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BulkListingPro';
  workbook.created = new Date();

  const niches = [
    { name: 'Planners & Journals', tags: seoTags.planners },
    { name: 'Clipart & Graphics', tags: seoTags.clipart },
    { name: 'Wall Art & Printables', tags: seoTags.wallArt },
    { name: 'Social Media Templates', tags: seoTags.socialMedia },
    { name: 'Budget & Finance', tags: seoTags.budget },
  ];

  niches.forEach(({ name, tags }) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: 'Tag', key: 'tag', width: 25 },
      { header: 'Character Count', key: 'charCount', width: 16 },
      { header: 'Sub-Niche', key: 'subNiche', width: 25 },
    ];

    const hdr = sheet.getRow(1);
    hdr.height = 25;
    hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF56400' } };
    hdr.alignment = { vertical: 'middle', horizontal: 'center' };

    tags.forEach(({ tag, subNiche }) => {
      sheet.addRow({ tag, charCount: tag.length, subNiche });
    });
  });

  await workbook.xlsx.writeFile(outputPath);
}

async function generateSellerKit() {
  const outputDir = path.join(__dirname, '..', 'seller-kit');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('Generating Etsy Seller Kit...\n');

  const niches = [
    { name: 'Planners-and-Journals-20-Listings', listings: plannersListings },
    { name: 'Clipart-and-Graphics-20-Listings', listings: clipartListings },
    { name: 'Wall-Art-and-Printables-20-Listings', listings: wallArtListings },
    { name: 'Social-Media-Templates-20-Listings', listings: socialMediaListings },
    { name: 'Budget-and-Finance-20-Listings', listings: budgetListings },
  ];

  for (const { name, listings } of niches) {
    const filePath = path.join(outputDir, `${name}.xlsx`);
    await createNicheWorkbook(listings, filePath);
    console.log(`  Created: ${name}.xlsx (${listings.length} listings)`);
  }

  const seoPath = path.join(outputDir, 'Etsy-SEO-Tag-Library-500-Tags.xlsx');
  await createSeoTagLibrary(seoPath);
  const totalTags = Object.values(seoTags).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`  Created: Etsy-SEO-Tag-Library-500-Tags.xlsx (${totalTags} tags)`);

  console.log('\nSeller kit generated successfully!');
  console.log(`Output directory: ${outputDir}`);
}

generateSellerKit().catch(console.error);
