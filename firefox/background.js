// Default domains to block
const DEFAULT_DOMAINS = [
  "player.twitch.tv",
  "embed.twitch.tv",
  "minnit.org"
];

// Map to track script state (enabled/disabled) for each website
const scriptStatePerWebsite = {};

// Map tabId to website hostname
const mapTabIdToWebsite = {};

/**
 * Get the list of blocked domains from storage, or return default domains if none are stored.
 * @returns {Promise<string[]>} A promise that resolves to an array of blocked domains.
 */
async function getBlockedDomains() {
  const { blockedDomains } = await chrome.storage.local.get({ blockedDomains: DEFAULT_DOMAINS });
  return blockedDomains || []; // Ensure it returns an empty array if nothing is stored
}

// Initialize script state when the extension starts
chrome.runtime.onStartup.addListener(async () => {
  await initializeScriptState();
});

/**
 * Handle messages from content scripts to update the script state for a specific domain.
 * @param {Object} message - The message object containing the action and domain state.
 * @param {Object} sender - The sender of the message.
 * @returns {Promise<void>} Resolves when the script state is updated.
 */
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === "updateScriptState") {
    await updateScriptState(message.domain, message.enabled);
  }
});

/**
 * Initialize the script state by setting default states for known domains and current tabs.
 * @returns {Promise<void>} Resolves when the script state is initialized.
 */
async function initializeScriptState() {
  const blockedDomains = await getBlockedDomains(); // Get the list of blocked domains
  
  // Get a list of all open tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const hostname = new URL(tab.url).hostname;
    scriptStatePerWebsite[hostname] = true; // Set default state to enabled for all tabs
  }

  // Ensure default domains are included with the enabled state
  for (const domain of DEFAULT_DOMAINS) {
    scriptStatePerWebsite[domain] = true;
  }
}

/**
 * Update the script state (enabled/disabled) for a specific domain.
 * @param {string} domain - The domain for which the script state is being updated.
 * @param {boolean} enabled - Whether the script is enabled or disabled for the domain.
 * @returns {Promise<void>} Resolves when the script state is updated.
 */
async function updateScriptState(domain, enabled) {
  scriptStatePerWebsite[domain] = enabled; // Update the state in the map
}

/**
 * Listener function to block requests based on URL and script state.
 * @param {Object} details - The details of the web request.
 * @param {string} details.url - The URL of the request.
 * @param {string} details.documentUrl - The URL of the document initiating the request.
 * @param {number} details.tabId - The ID of the tab making the request.
 * @returns {Object} An object indicating whether the request should be canceled.
 */
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    const url = new URL(details.url);
    const documentURL = new URL(details.documentUrl);
    const blockedDomains = await getBlockedDomains(); // Fetch blocked domains dynamically
    
    // Get base domains for comparison
    const baseDocumentDomain = getBaseDomain(documentURL.hostname);
    const baseUrlDomain = getBaseDomain(url.hostname);

    // Determine the script state based on the base domain
    let scriptState = scriptStatePerWebsite[baseDocumentDomain];
    
    if (scriptState === undefined) {
      scriptState = scriptStatePerWebsite[mapTabIdToWebsite[details.tabId]];
    }
    
    // Default to enabled if script state for the base domain is not found
    if (scriptState === undefined) {
      scriptState = true;
    }

    if (!scriptState) {
      return; // Allow the request if the script is disabled for this website
    }

    // Check if the current URL domain is in the blocklist
    if (isTabDomainBlocked(baseUrlDomain, blockedDomains)) {
      return; // Allow requests if the domain is in the blocklist but shouldn't block on specific sites
    }

    if (isDomainBlocked(baseUrlDomain, blockedDomains)) {
      console.log(`Blocking request to ${url.hostname} because it's a blocked domain.`);
      return { cancel: true }; // Cancel the request if it matches a blocked domain
    }
  },
  { urls: ["<all_urls>"], types: ["sub_frame"] }, // Match requests to sub-frames
  ["blocking"]
);