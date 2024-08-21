console.log("Starting embed blocker...");

// Initialize counters and flags
let blockedStreams = 0; // Number of streams blocked in the current session
let blockedTotal = 0; // Total number of streams blocked since installation
let blockedWebsites = {}; // Dictionary of websites and their blocked stream counts
let requireRefresh = false; // Flag indicating if a page refresh is needed
let initialRemove = true; // Flag to control whether initial removal statistics should be logged
let baseDomainIgnore = false; // Flag to determine if the base domain should be ignored

const currentHostname = window.location.hostname; // Current page's hostname

// Default domains to block if no custom domains are set
const DEFAULT_DOMAINS = [
  "player.twitch.tv",
  "embed.twitch.tv",
  "minnit.org"
];

let blockedDomainsList = []; // List of blocked domains loaded from storage

/**
 * Load blocked domains from storage or use default domains if none are found.
 * @returns {Promise<void>} Resolves when the blocked domains are loaded.
 */
async function loadBlockedDomains() {
  const { blockedDomains } = await browser.storage.local.get({ blockedDomains: DEFAULT_DOMAINS });
  blockedDomainsList = blockedDomains; // Update the blocked domains list
}

/**
 * Load script state from storage and determine if blocking is enabled for the current domain.
 * @param {boolean} [initial=false] - If true, log the initial state of script enabling.
 * @returns {Promise<boolean>} Resolves with a boolean indicating if the script is enabled.
 */
async function loadScriptState(initial=false) {
  await loadBlockedDomains(); // Ensure blocked domains are loaded

  const { enabled } = await browser.storage.local.get("enabled");
  // Check if the script is enabled for the current domain
  scriptEnabled = enabled && enabled[currentHostname] !== undefined ? enabled[currentHostname] : true;

  // If the current domain is in the blocklist, disable script functionality
  if (isTabDomainBlocked(currentHostname, blockedDomainsList)) {
    if (initial) {
      console.log(`Embed blocking is disabled because the current domain (${currentHostname}) is on the block list.`);
    }
    
    scriptEnabled = false;
    baseDomainIgnore = true; // Flag indicating the base domain should be ignored
  } else {
    if (initial) {
      console.log(`Embed blocking for ${currentHostname} is ${scriptEnabled ? 'enabled' : 'disabled'}.`);
    }
  }

  await updateScriptState(currentHostname, scriptEnabled); // Notify background script of state change
  return scriptEnabled; // Return the current state of the script
}

/**
 * Update the script state in storage and notify the background script.
 * @param {string} domain - The domain for which the script state is being updated.
 * @param {boolean} enabled - Whether the script is enabled or disabled for the given domain.
 * @returns {Promise<void>} Resolves when the script state is updated.
 */
async function updateScriptState(domain, enabled) {
  await browser.runtime.sendMessage({ action: "updateScriptState", domain: domain, enabled: enabled });
}

/**
 * Load data related to blocked streams and websites from storage.
 * @param {boolean} [initial=false] - If true, combine and update the initial blocked data.
 * @returns {Promise<void>} Resolves when the data is loaded and updated.
 */
async function loadDataFromStorage(initial=false) {
  const { blockedTotalSinceInstall, blockedWebsitesCount } = await browser.storage.local.get(["blockedTotalSinceInstall", "blockedWebsitesCount"]);

  if (initial) {
    // Combine existing blocked data with new data
    blockedTotal = (blockedTotalSinceInstall + blockedTotal) || 0;
    blockedWebsites = Object.keys({ ...blockedWebsites, ...blockedWebsitesCount }).reduce((result, key) => {
      result[key] = (blockedWebsites[key] || 0) + (blockedWebsitesCount[key] || 0);
      return result;
    }, {});

    // Update storage with combined statistics
    await updateStreamBlocksCount();
    await browser.storage.local.set({ blockedWebsitesCount: blockedWebsites });
  } else {
    blockedTotal = blockedTotalSinceInstall;
    blockedWebsites = blockedWebsitesCount;
  }
}

/**
 * Remove iframes that match blocked domains and update statistics.
 * @returns {Promise<void>} Resolves when the removal process and statistics update are complete.
 */
async function removeEmbeddedStreams() {
  await loadBlockedDomains(); // Ensure blocked domains are up-to-date
  const iframes = document.querySelectorAll("iframe");
  for (const iframe of iframes) {
    const src = iframe.getAttribute("src");
    if (src && isEmbeddedStream(src)) {
      iframe.remove(); // Remove the iframe if it matches a blocked domain

      // Increment statistics only on initial removal
      if (initialRemove) {
        console.log(`Blocked iframe with src: ${src}`);
        initialRemove = false;

        blockedStreams++;
        blockedTotal++;

        await updateStreamBlocksCount(); // Update the total blocked streams count
        await updateWebsiteBlockCount(); // Update the count for the current website
      } 
    }
  }
}

/**
 * Check if the given URL is from a blocked domain.
 * @param {string} url - The URL to check.
 * @returns {boolean} True if the URL matches a blocked domain, otherwise false.
 */
function isEmbeddedStream(url) {
  return blockedDomainsList.some((domain) => url.includes(domain));
}

/**
 * Update the total count of blocked streams in storage.
 * @returns {Promise<void>} Resolves when the blocked streams count is updated in storage.
 */
async function updateStreamBlocksCount() {
  await browser.storage.local.set({ blockedTotalSinceInstall: blockedTotal });
}

/**
 * Update the blocked count for the current website in storage.
 * @returns {Promise<void>} Resolves when the count for the current website is updated in storage.
 */
async function updateWebsiteBlockCount() {
  if (currentHostname) {
    blockedWebsites[currentHostname] = blockedWebsites[currentHostname] ? blockedWebsites[currentHostname] + 1 : 1;
    await browser.storage.local.set({ blockedWebsitesCount: blockedWebsites });
  }
}

/**
 * Toggle the script state (enabled/disabled) for the current domain.
 * @returns {Promise<void>} Resolves when the script state is toggled and the appropriate actions are taken.
 */
async function toggleScriptState() {
  const { enabled } = await browser.storage.local.get("enabled");

  const scriptEnabled = enabled && enabled[currentHostname] !== undefined ? !enabled[currentHostname] : false;

  const newEnabledState = {
    ...enabled,
    [currentHostname]: scriptEnabled,
  };

  await browser.storage.local.set({ enabled: newEnabledState });

  // Enable or disable the script functionality based on the new state
  if (scriptEnabled) {
    removeEmbeddedStreams()
      .then(() => {
        observer.observe(document.body, { childList: true, subtree: true }); // Observe DOM changes
      });
  } else {
    observer.disconnect(); // Stop observing DOM changes
  }
  
  await updateScriptState(currentHostname, scriptEnabled); // Notify background script of the new state
}

/**
 * Check if the blocked domains list has changed and remove new embedded streams if necessary.
 * @returns {Promise<void>} Resolves when the check for new domains and removal of new streams is complete.
 */
async function checkNewDomains() {
  old_length = blockedDomainsList.length;

  await loadBlockedDomains();

  new_length = blockedDomainsList.length;

  if (old_length !== new_length) {
    removeEmbeddedStreams(); // Remove streams if new domains have been added
  }
}

// Observer to watch for changes in the DOM and remove new embedded streams
const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      removeEmbeddedStreams(); // Remove newly added iframes
    }
  }
});

/**
 * Initial script setup and observation.
 * @returns {Promise<void>} Resolves when the initial setup is complete, including data loading and observer attachment.
 */
loadScriptState(true).then(async (scriptEnabled) => {
  if (scriptEnabled) {
    removeEmbeddedStreams()
      .then(() => loadDataFromStorage(true)) // Ensure this runs after removing initial streams
      .then(() => {            
        observer.observe(document.body, { childList: true, subtree: true }); // Start observing DOM changes
        console.log("Attached observer to check for streams being added after page load.");

        setInterval(checkNewDomains, 2000); // Periodically check for new domains
      });
  }
});

/**
 * Handle messages from the popup or other parts of the extension.
 * @param {Object} message - The message object containing the action and any additional data.
 * @param {Object} sender - The sender of the message.
 * @param {Function} sendResponse - Function to send a response back to the sender.
 * @returns {boolean} True if the response is sent asynchronously, false otherwise.
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleScript") {
    toggleScriptState().then(() => {
      sendResponse({ action: "scriptToggled" });
      requireRefresh = message.refresh; // Flag to indicate if page refresh is needed
    });
    return true; // Indicates asynchronous response
  } else if (message.action === "getBlockedStreamsCount") {
    sendResponse({ action: "updateBlockedStreams", count: blockedStreams });
  } else if (message.action === "getblockedTotal") {
    loadDataFromStorage().then(() => {
      sendResponse({ action: "updateBlockedTotal", count: blockedTotal });
    });
    return true; // Indicates asynchronous response
  } else if (message.action === "getMostBlockedWebsite") {
    loadDataFromStorage().then(() => {
      const mostBlockedWebsite = getKeyWithHighestValue(blockedWebsites);
      sendResponse({ action: "updateMostBlockedWebsite", name: mostBlockedWebsite, count: blockedWebsites[mostBlockedWebsite] });
    });
    return true; // Indicates asynchronous response
  } else if (message.action === "getCurrentState") {
    loadScriptState().then((scriptEnabled) => {
      sendResponse({ action: "updateCurrentState", state: scriptEnabled, refresh: requireRefresh, base_domain_ignore: baseDomainIgnore, currentHost: currentHostname });
    });
    return true; // Indicates asynchronous response
  } else if (message.action === "refreshPage") {
    requireRefresh = false;
    sendResponse({ action: "updateRefreshState", state: requireRefresh });
  } else if (message.action === "updateBlockDomains") {
    if (scriptEnabled) {
      removeEmbeddedStreams()
        .then(() => sendResponse({ action: "receivedBlockDomains" }));
    }
  }
});
