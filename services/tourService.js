const TOUR_KEYS = {
  sidepanel: 'bulklistingpro_tour_sidepanel_done',
  editor: 'bulklistingpro_tour_editor_done'
};

const TOUR_STARTERS = {
  sidepanel: () => startSidepanelTour(),
  editor: () => startEditorTour()
};

function createDriver(tourId) {
  return window.driver.js.driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayClickBehavior: () => {},
    overlayOpacity: 0.6,
    stagePadding: 8,
    stageRadius: 8,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    progressText: '{{current}} / {{total}}',
    popoverClass: 'blp-tour-popover',
    onDestroyed: () => markComplete(tourId)
  });
}

export async function shouldAutoStart(tourId) {
  try {
    const key = TOUR_KEYS[tourId];
    if (!key) return false;
    const data = await chrome.storage.local.get(key);
    return !data[key];
  } catch {
    return false;
  }
}

export async function markComplete(tourId) {
  try {
    const key = TOUR_KEYS[tourId];
    if (key) await chrome.storage.local.set({ [key]: true });
  } catch (e) {
    console.warn('Failed to mark tour complete:', e);
  }
}

export function showTourIntro(tourId) {
  const overlay = document.createElement('div');
  overlay.className = 'welcome-modal-overlay';
  overlay.innerHTML = `
    <div class="welcome-modal tour-intro-modal">
      <div class="tour-intro-header">
        <h3>Welcome to BulkListingPro</h3>
        <p>The fastest way to list digital products on Etsy.</p>
      </div>
      <div class="tour-intro-features">
        <div class="tour-intro-feature">
          <span class="tour-intro-icon">&#x2728;</span>
          <div>
            <strong>AI Listing Assistance</strong>
            <span>Generate optimized titles, descriptions, and tags with one click.</span>
          </div>
        </div>
        <div class="tour-intro-feature">
          <span class="tour-intro-icon">&#x26A1;</span>
          <div>
            <strong>Listing Automation</strong>
            <span>Import a spreadsheet and upload hundreds of listings hands-free.</span>
          </div>
        </div>
        <div class="tour-intro-feature">
          <span class="tour-intro-icon">&#x1F50D;</span>
          <div>
            <strong>Competitor Research</strong>
            <span>Capture tags, titles, and prices from any Etsy listing instantly.</span>
          </div>
        </div>
      </div>
      <div class="welcome-modal-buttons">
        <button class="btn btn-primary" id="tour-intro-start">Quick Tour</button>
        <button class="btn btn-secondary" id="tour-intro-skip">Skip</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#tour-intro-start').addEventListener('click', () => {
    overlay.remove();
    const starter = TOUR_STARTERS[tourId];
    if (starter) starter();
  });

  overlay.querySelector('#tour-intro-skip').addEventListener('click', () => {
    overlay.remove();
    markComplete(tourId);
  });
}

function switchToTab(tabName) {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabName}`));
}

function getTabForElement(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const tab = el.closest('.tab-content');
  if (tab) return tab.id.replace('tab-', '');
  return null;
}

export function startSidepanelTour() {
  switchToTab('upload');

  const steps = [
    {
      element: '#credit-balance',
      popover: {
        title: 'Your Credits',
        description: 'Each listing costs 2 credits. Click here anytime to buy more.'
      }
    },
    {
      element: '#open-editor-btn',
      popover: {
        title: 'Listing Editor',
        description: 'The heart of BulkListingPro. Create, edit, and manage listings with grid view, AI tools, and tag intelligence.'
      }
    },
    {
      element: '#drop-zone',
      popover: {
        title: 'Quick Import',
        description: 'Drag a CSV or XLSX file here to load listings into the queue. Download the template for the correct format.'
      }
    },
    {
      element: '.single-listing > summary',
      popover: {
        title: 'Quick Add',
        description: 'Add a single listing with this form — good for one-offs or quick tests.'
      }
    },
    {
      element: '.upload-options',
      popover: {
        title: 'Upload Queue',
        description: 'After importing listings, they appear in a queue below. Select which to upload, choose Draft or Published, then hit Start.'
      }
    },
    {
      element: '.tab-btn[data-tab="research"]',
      popover: {
        title: 'Research Tab',
        description: 'Spy on competitor listings — extract tags, titles, and prices with one click. Build a reusable tag library.'
      }
    },
    {
      element: '.tab-btn[data-tab="account"]',
      popover: {
        title: 'Your Account',
        description: 'Check credits, share your referral code, and manage your profile.'
      }
    }
  ];

  const driverObj = createDriver('sidepanel');

  driverObj.setSteps(steps.map(step => ({
    ...step,
    onHighlightStarted: () => {
      const tab = getTabForElement(step.element);
      if (tab) switchToTab(tab);
    }
  })));

  driverObj.drive();
}

export function startEditorTour() {
  const steps = [
    {
      element: '#import-zone',
      popover: {
        title: 'Import Listings',
        description: 'Drag a CSV or XLSX file here, or click Import. Download the template for the correct format.'
      }
    },
    {
      element: '#add-listing-btn',
      popover: {
        title: 'Add Manually',
        description: 'Add a blank listing and fill in all fields — title, description, tags, price, images, and more.'
      }
    },
    {
      element: '#view-toggle',
      popover: {
        title: 'Form & Grid Views',
        description: 'Switch between card-based Form view and spreadsheet-style Grid view for quick bulk edits.'
      }
    },
    {
      element: '#search-bar',
      popover: {
        title: 'Search & Filter',
        description: 'Find listings by text, filter by category or validation status, and sort by title, price, or category.'
      }
    },
    {
      element: '#validation-badge',
      popover: {
        title: 'Validation',
        description: 'Checks for missing fields, duplicate titles, similar tags, and price outliers. Click to see the full report.'
      }
    },
    {
      element: '#more-actions-dropdown',
      popover: {
        title: 'Bulk Actions',
        description: 'Autoformat, title case, duplicate, delete, batch tags, AI Generate, and Evaluate — all in one menu.'
      }
    }
  ];

  if (document.querySelector('.ai-btn')) {
    steps.push({
      element: '.ai-btn',
      popover: {
        title: 'AI Tools',
        description: 'Generate titles, descriptions, and tags with AI. Available per-listing or in bulk from the More menu.'
      }
    });
  }

  if (document.querySelector('.tag-library-btn')) {
    steps.push({
      element: '.tag-library-btn',
      popover: {
        title: 'Tag Intelligence',
        description: 'Get suggestions by category, import competitor tags, and track tag frequency across listings.'
      }
    });
  }

  steps.push(
    {
      element: '#undo-btn',
      popover: {
        title: 'Undo & Redo',
        description: 'Every action is tracked. Ctrl+Z to undo, Ctrl+Y to redo — up to 50 steps.'
      }
    },
    {
      element: '#send-to-queue-btn',
      popover: {
        title: 'Send to Queue',
        description: 'When listings are ready, send them to the upload queue. Then start the automated upload from the sidepanel.'
      }
    }
  );

  const driverObj = createDriver('editor');
  driverObj.setSteps(steps);
  driverObj.drive();
}
