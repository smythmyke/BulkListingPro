const ExcelJS = require('exceljs');
const path = require('path');

const CATEGORIES = [
  'Guides & How Tos', 'Planner Templates', 'Journal Templates', 'Digital Prints',
  'Social Media Templates', 'Contract & Agreement Templates', 'Personal Finance Templates',
  'Bookkeeping Templates', 'Menu Templates', 'Newsletter Templates', 'Gift Tag Templates',
  'Greeting Card Templates', 'Event Program Templates', 'Calendars & Planners', 'Templates',
  'Flashcards', 'Study Guides', 'Worksheets', 'Architectural & Drafting Templates',
  'Chore Chart Templates', 'Drawing & Illustration', 'Digital Patterns', 'Planners & Templates',
];

const REQUIRED_COLUMNS = ['title', 'description', 'price', 'category'];

const COLUMNS = [
  { key: 'sku', header: 'sku', width: 15 },
  { key: 'title', header: 'title', width: 50 },
  { key: 'description', header: 'description', width: 60 },
  { key: 'price', header: 'price', width: 10 },
  { key: 'category', header: 'category', width: 25 },
  { key: 'image_1', header: 'image_1', width: 40 },
  { key: 'image_2', header: 'image_2', width: 40 },
  { key: 'image_3', header: 'image_3', width: 40 },
  { key: 'image_4', header: 'image_4', width: 40 },
  { key: 'image_5', header: 'image_5', width: 40 },
  { key: 'digital_file_1', header: 'digital_file_1', width: 40 },
  { key: 'digital_file_name_1', header: 'digital_file_name_1', width: 30 },
  { key: 'tag_1', header: 'tag_1', width: 20 },
  { key: 'tag_2', header: 'tag_2', width: 20 },
  { key: 'tag_3', header: 'tag_3', width: 20 },
  { key: 'tag_4', header: 'tag_4', width: 20 },
  { key: 'tag_5', header: 'tag_5', width: 20 },
  { key: 'tag_6', header: 'tag_6', width: 20 },
  { key: 'tag_7', header: 'tag_7', width: 20 },
  { key: 'tag_8', header: 'tag_8', width: 20 },
  { key: 'tag_9', header: 'tag_9', width: 20 },
  { key: 'tag_10', header: 'tag_10', width: 20 },
  { key: 'tag_11', header: 'tag_11', width: 20 },
  { key: 'tag_12', header: 'tag_12', width: 20 },
  { key: 'tag_13', header: 'tag_13', width: 20 },
  { key: 'quantity', header: 'quantity', width: 10 },
  { key: 'listing_state', header: 'listing_state', width: 12 },
];

const IMAGE_DIR = path.resolve(__dirname, '..', 'seller-kit', 'listing-images');
const ZIP_PATH = path.resolve(__dirname, '..', 'seller-kit', 'Etsy-Seller-Kit-BulkListingPro.zip');

const description = `Launch your Etsy shop fast with 100 pre-written digital product listings across 5 proven niches — ready to upload in minutes using the free BulkListingPro Chrome extension.

WHAT'S INCLUDED:

★ 5 Niche Template Spreadsheets (20 listings each):
• Planners & Journals — daily, weekly, monthly, habit trackers, gratitude journals, and more
• Clipart & Graphics — watercolor flowers, woodland animals, holiday sets, botanical line art
• Wall Art & Printables — minimalist line art, nursery prints, gallery wall sets, quote prints
• Social Media Templates — Instagram, Pinterest, YouTube, TikTok, LinkedIn, and industry-specific
• Budget & Finance — monthly budgets, debt payoff, savings challenges, investment trackers

★ SEO Tag Library Spreadsheet:
• 500+ researched Etsy SEO tags organized by niche
• Every tag is under Etsy's 20-character limit
• Sorted by sub-niche for easy browsing

EVERY LISTING INCLUDES:
✓ Keyword-rich title (under 140 characters)
✓ 100-200 word product description
✓ 13 unique SEO tags
✓ Realistic pricing
✓ Proper Etsy category
✓ Set to draft mode so you can review before publishing

HOW TO USE:

1. Download the spreadsheet for your niche
2. Add your own product images and digital files
3. Install BulkListingPro from the Chrome Web Store (search "BulkListingPro" or visit: https://chromewebstore.google.com)
4. Import the spreadsheet into BulkListingPro
5. Click Upload — all 20 listings are created on Etsy automatically

Skip hours of writing titles, descriptions, and researching tags. These templates follow Etsy SEO best practices and are formatted to work directly with BulkListingPro's bulk upload feature.

Perfect for new Etsy sellers, digital product creators, and anyone looking to scale their shop quickly.

This is an instant digital download. No physical product will be shipped.`;

async function generate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BulkListingPro';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Products', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  sheet.columns = COLUMNS.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: REQUIRED_COLUMNS.includes(col.key) ? 'FFF56400' : 'FF666666' }
    };
  });

  sheet.addRow({
    sku: 'SELLERKIT-001',
    title: 'Etsy Seller Kit 100 Ready Made Listings With SEO Tags for 5 Niches | BulkListingPro Spreadsheet Template | Instant Download',
    description,
    price: 4.99,
    category: 'Templates',
    image_1: path.join(IMAGE_DIR, '1-hero-etsy-seller-kit.png'),
    image_2: path.join(IMAGE_DIR, '2-five-niche-templates.png'),
    image_3: path.join(IMAGE_DIR, '3-seo-tag-library.png'),
    image_4: path.join(IMAGE_DIR, '4-lifestyle-flat-lay.png'),
    image_5: path.join(IMAGE_DIR, '5-laptop-booklets-mockup.png'),
    digital_file_1: ZIP_PATH,
    digital_file_name_1: 'Etsy-Seller-Kit-BulkListingPro.zip',
    tag_1: 'etsy seller kit',
    tag_2: 'etsy SEO tags',
    tag_3: 'listing template',
    tag_4: 'etsy spreadsheet',
    tag_5: 'bulk listing',
    tag_6: 'digital products',
    tag_7: 'etsy shop starter',
    tag_8: 'SEO tag research',
    tag_9: 'etsy keywords',
    tag_10: 'printable business',
    tag_11: 'new seller kit',
    tag_12: 'instant download',
    tag_13: 'etsy planner tags',
    quantity: 999,
    listing_state: 'draft',
  });

  const categoriesSheet = workbook.addWorksheet('Categories');
  categoriesSheet.columns = [
    { header: 'Category Name', key: 'name', width: 35 },
  ];
  CATEGORIES.forEach(cat => categoriesSheet.addRow({ name: cat }));

  const categoryColIndex = COLUMNS.findIndex(c => c.key === 'category') + 1;
  sheet.getCell(2, categoryColIndex).dataValidation = {
    type: 'list', allowBlank: true,
    formulae: [`Categories!$A$2:$A$${CATEGORIES.length + 1}`],
    showDropDown: false
  };

  const outputPath = path.join(__dirname, '..', 'seller-kit', 'Upload-Seller-Kit-Listing.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('Upload spreadsheet created!');
  console.log(`Output: ${outputPath}`);
  console.log('');
  console.log('To upload:');
  console.log('  1. Open BulkListingPro sidepanel');
  console.log('  2. Drag and drop this file into the import area');
  console.log('  3. Click Start Upload');
}

generate().catch(console.error);
