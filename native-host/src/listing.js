const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const config = require('../config/default');
const { interruptibleDelay: delay, checkAbort } = require('./abort');

async function createListing(cdp, product, options = {}) {
  const { dryRun = false } = options;

  console.log(`Creating listing: ${product.title?.substring(0, 50)}...`);

  if (dryRun) {
    return { success: true, dryRun: true };
  }

  try {
    await cdp.navigate(config.etsy.newListing);
    await delay(2000);

    const category = product.category || config.listingDefaults.defaultCategory;
    await selectCategory(cdp, category);

    await fillItemDetails(cdp, product);

    await fillAboutTab(cdp, product);

    await fillPriceTab(cdp, product);

    await fillTags(cdp, product);

    await saveListing(cdp, product.listing_state !== 'active');

    return { success: true, title: product.title };

  } catch (error) {
    console.error(`Failed to create listing: ${error.message}`);
    return { success: false, error: error.message, title: product.title };
  }
}

async function selectCategory(cdp, categoryName) {
  await delay(500);

  await cdp.evaluate(`
    (() => {
      const input = document.querySelector('#wt-portals #category-field-search') ||
                    document.querySelector('input[placeholder*="Search for a category"]');
      if (input) {
        input.click();
        input.focus();
      }
    })()
  `);
  await delay(200);

  await typeText(cdp, categoryName);
  await delay(500);

  await cdp.evaluate(`
    (() => {
      const option = document.querySelector('#wt-portals li[role="option"]');
      if (option) option.click();
    })()
  `);
  await delay(200);

  await clickByText(cdp, 'Continue', '#wt-portals');
  await delay(500);
}

async function fillItemDetails(cdp, product) {
  await clickByText(cdp, 'Digital files');
  await delay(500);

  await clickByText(cdp, 'I did');
  await delay(300);

  await clickByText(cdp, 'A finished product');
  await delay(300);

  await cdp.evaluate(`
    (() => {
      const select = document.querySelector('#when-made-select');
      if (select) {
        select.value = '2020_2026';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await delay(300);

  await clickByText(cdp, 'Created by me');
  await delay(300);

  await clickByText(cdp, 'Continue');
  await delay(1000);
}

async function fillAboutTab(cdp, product) {
  if (product.title) {
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('input[name="title"]') ||
                      document.querySelector('textarea[name="title"]');
        if (input) {
          input.value = '';
          input.focus();
        }
      })()
    `);
    await typeText(cdp, product.title);
    await delay(300);
  }

  await uploadPhotos(cdp, product);

  await uploadDigitalFile(cdp, product);

  if (product.description) {
    await cdp.evaluate(`
      (() => {
        const desc = document.querySelector('textarea[name="description"]');
        if (desc) {
          desc.scrollIntoView({ block: 'center' });
          desc.focus();
        }
      })()
    `);
    await delay(500);

    await cdp.evaluate(`
      (() => {
        const desc = document.querySelector('textarea[name="description"]');
        if (desc) {
          desc.value = ${JSON.stringify(product.description)};
          desc.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await delay(300);
  }
}

async function uploadPhotos(cdp, product) {
  const imageFields = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'];
  const tempDir = path.join(__dirname, '..', 'data', 'temp-images');
  const localPaths = [];

  for (const field of imageFields) {
    const imagePath = product[field];
    if (!imagePath) continue;

    try {
      const ext = path.extname(imagePath) || '.png';
      const filename = `${product.sku || 'img'}-${field}${ext}`;
      const resolvedPath = await resolveFilePath(imagePath, tempDir, filename);

      if (resolvedPath) {
        localPaths.push(resolvedPath);
      }
    } catch (err) {
      console.warn(`Warning: Failed to get ${field}: ${err.message}`);
    }
  }

  if (localPaths.length === 0) {
    return;
  }

  try {
    await cdp.setFileInput('input[type="file"]', localPaths);
    await delay(3000);
  } catch (err) {
    console.warn(`Warning: Failed to upload images: ${err.message}`);
  }
}

async function uploadDigitalFile(cdp, product) {
  const digitalFilePath = product.digital_file_1;
  if (!digitalFilePath) {
    return;
  }

  const tempDir = path.join(__dirname, '..', 'data', 'temp-files');

  try {
    const ext = path.extname(digitalFilePath) || '.zip';
    const filename = product.digital_file_name_1 || `${product.sku || 'file'}${ext}`;
    const localPath = await resolveFilePath(digitalFilePath, tempDir, filename);

    if (!localPath) {
      console.warn('Warning: Could not resolve digital file path');
      return;
    }

    await cdp.evaluate(`
      (() => {
        const section = [...document.querySelectorAll('*')].find(el =>
          el.textContent.includes('Digital files') && el.tagName !== 'SCRIPT'
        );
        if (section) section.scrollIntoView({ block: 'center' });
      })()
    `);
    await delay(500);

    const fileInputs = await cdp.evaluate(`
      document.querySelectorAll('input[type="file"]').length
    `);

    if (fileInputs > 1) {
      await cdp.setFileInput('input[type="file"]:last-of-type', [localPath]);
    } else {
      await clickByText(cdp, 'Add file');
      await delay(500);
      await cdp.setFileInput('input[type="file"]', [localPath]);
    }

    await delay(3000);
  } catch (err) {
    console.warn(`Warning: Failed to upload digital file: ${err.message}`);
  }
}

async function fillPriceTab(cdp, product) {
  await clickByText(cdp, 'Price');
  await delay(1000);

  if (product.price) {
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('input[name="price"]') ||
                      document.querySelector('input[id*="price"]');
        if (input) {
          input.value = '';
          input.focus();
        }
      })()
    `);
    await typeText(cdp, String(product.price));
    await delay(300);
  }

  const quantity = product.quantity || config.listingDefaults.quantity;
  await cdp.evaluate(`
    (() => {
      const input = document.querySelector('input[name="quantity"]') ||
                    document.querySelector('input[id*="quantity"]');
      if (input) {
        input.value = '';
        input.focus();
        input.value = '${quantity}';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await delay(300);
}

async function fillTags(cdp, product) {
  const tagArray = [];
  for (let i = 1; i <= 13; i++) {
    const tag = product[`tag_${i}`];
    if (tag) tagArray.push(tag);
  }

  if (tagArray.length === 0) {
    return;
  }

  await cdp.evaluate(`
    (() => {
      const tagsLabel = [...document.querySelectorAll('*')].find(el =>
        el.textContent === 'Tags' && el.tagName !== 'SCRIPT'
      );
      if (tagsLabel) tagsLabel.scrollIntoView({ block: 'center' });
    })()
  `);
  await delay(500);

  for (const tag of tagArray.slice(0, 13)) {
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('#listing-tags-input') ||
                      document.querySelector('input[placeholder*="tag"]');
        if (input) {
          input.focus();
          input.value = '';
        }
      })()
    `);
    await delay(100);

    await typeText(cdp, tag);

    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('#listing-tags-input') ||
                      document.querySelector('input[placeholder*="tag"]');
        if (input) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        }
      })()
    `);
    await delay(300);
  }
}

async function saveListing(cdp, asDraft = true) {
  await cdp.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll('button')].find(b =>
        b.textContent.includes('Save as draft')
      );
      if (btn) btn.scrollIntoView({ block: 'center' });
    })()
  `);
  await delay(500);

  if (asDraft) {
    await clickByText(cdp, 'Save as draft');
  } else {
    await clickByText(cdp, 'Publish');
    await delay(1000);
    await clickByText(cdp, 'Publish', '[role="dialog"]');
  }

  const confirmed = await waitForSuccessMessage(cdp, 15000);
  if (!confirmed) {
    throw new Error('Save confirmation not detected');
  }
}

async function waitForSuccessMessage(cdp, timeout = 15000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const found = await cdp.evaluate(`
      (() => {
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
          if (p.textContent.includes('successfully updated') ||
              p.textContent.includes('successfully saved') ||
              p.textContent.includes('successfully published')) {
            return true;
          }
        }
        return false;
      })()
    `);

    if (found) {
      return true;
    }

    await delay(500);
  }

  return false;
}

async function typeText(cdp, text) {
  for (const char of text) {
    await cdp.Input.dispatchKeyEvent({ type: 'keyDown', text: char });
    await cdp.Input.dispatchKeyEvent({ type: 'keyUp', text: char });
    await delay(config.automation.typingDelay);
  }
}

async function clickByText(cdp, text, container = '') {
  const clicked = await cdp.evaluate(`
    (() => {
      const scope = ${container ? `document.querySelector('${container}')` : 'document'} || document;
      const elements = scope.querySelectorAll('button, label, a, div[role="button"], span');
      for (const el of elements) {
        if (el.textContent.trim().includes('${text.replace(/'/g, "\\'")}')) {
          el.scrollIntoView({ block: 'center' });
          el.click();
          return true;
        }
      }
      return false;
    })()
  `);

  if (!clicked) {
    console.warn(`Warning: Could not find element with text: ${text}`);
  }

  return clicked;
}

function isUrl(filePath) {
  if (!filePath) return false;
  return filePath.startsWith('http://') || filePath.startsWith('https://');
}

function isLocalFile(filePath) {
  if (!filePath || isUrl(filePath)) return false;
  return fs.existsSync(filePath);
}

function convertDropboxUrl(url) {
  if (!url) return url;
  if (url.includes('dropbox.com')) {
    return url.replace('?dl=0', '?dl=1');
  }
  return url;
}

async function resolveFilePath(filePathOrUrl, tempDir, filename) {
  if (!filePathOrUrl) return null;

  if (filePathOrUrl.startsWith('data:')) {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const matches = filePathOrUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!matches) return null;
    const buffer = Buffer.from(matches[1], 'base64');
    const localPath = path.join(tempDir, filename);
    fs.writeFileSync(localPath, buffer);
    return localPath;
  }

  if (isLocalFile(filePathOrUrl)) {
    return filePathOrUrl;
  }

  if (isUrl(filePathOrUrl)) {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const localPath = path.join(tempDir, filename);
    const downloadUrl = convertDropboxUrl(filePathOrUrl);
    await downloadFile(downloadUrl, localPath);
    return localPath;
  }

  console.warn(`Warning: File not found: ${filePathOrUrl}`);
  return null;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        protocol.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(destPath);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(destPath);
        });
      }
    }).on('error', reject);
  });
}

module.exports = { createListing };
