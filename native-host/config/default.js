const path = require('path');

module.exports = {
  cdp: {
    host: 'localhost',
    port: 9222
  },

  etsy: {
    baseUrl: 'https://www.etsy.com',
    loginUrl: 'https://www.etsy.com/signin',
    shopManager: 'https://www.etsy.com/your/shops/me',
    listingsPage: 'https://www.etsy.com/your/shops/me/listings',
    newListing: 'https://www.etsy.com/your/shops/me/listing-editor/create'
  },

  automation: {
    delayBetweenListings: 4000,
    delayJitter: 2000,
    typingDelay: 30,
    maxRetries: 2,
    retryDelay: 5000,
    maxListingsPerSession: 50,
    screenshotOnError: true
  },

  listingDefaults: {
    type: 'digital',
    whoMade: 'i_did',
    quantity: 999,
    publishAsDraft: true,
    defaultCategory: 'Guides & How Tos'
  },

  paths: {
    tempDir: path.join(__dirname, '..', 'data', 'temp'),
    tempImages: path.join(__dirname, '..', 'data', 'temp-images'),
    tempFiles: path.join(__dirname, '..', 'data', 'temp-files'),
    logsDir: path.join(__dirname, '..', 'logs')
  }
};
