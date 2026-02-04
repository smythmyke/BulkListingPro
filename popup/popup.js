/**
 * BulkListingPro Popup Script
 * Quick status view and sidepanel opener
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loggedInEl = document.getElementById('logged-in');
  const loggedOutEl = document.getElementById('logged-out');
  const creditCount = document.getElementById('credit-count');
  const openSidepanelBtn = document.getElementById('open-sidepanel');
  const signInBtn = document.getElementById('sign-in');

  // Check auth status
  const authResponse = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });

  if (authResponse.authenticated) {
    loggedInEl.classList.remove('hidden');
    loggedOutEl.classList.add('hidden');

    // Get credits
    const creditsResponse = await chrome.runtime.sendMessage({ type: 'CHECK_CREDITS' });
    if (creditsResponse.success) {
      creditCount.textContent = creditsResponse.credits.available;
    }
  } else {
    loggedInEl.classList.add('hidden');
    loggedOutEl.classList.remove('hidden');
  }

  // Open sidepanel
  openSidepanelBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });

  // Sign in
  signInBtn.addEventListener('click', async () => {
    // Open sidepanel for sign in flow
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });
});

// Add hidden class helper
document.querySelectorAll('.hidden').forEach(el => {
  el.style.display = 'none';
});

// Override hidden class
const style = document.createElement('style');
style.textContent = '.hidden { display: none !important; }';
document.head.appendChild(style);
