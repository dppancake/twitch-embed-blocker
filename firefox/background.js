// Default domains to block
const DEFAULT_DOMAINS = [
  "player.twitch.tv",
  "embed.twitch.tv",
  "minnit.org"
];

// Map to track script state per website
const scriptStatePerWebsite = {};

// Map tabId to website
const mapTabIdToWebsite = {};

// Function to get blocked domains from storage
async function getBlockedDomains() {
  const { blockedDomains } = await chrome.storage.local.get({ blockedDomains: DEFAULT_DOMAINS });
  return blockedDomains || []; // Ensure it returns an empty array if nothing is stored
}

// Initialize script state when the extension starts
chrome.runtime.onStartup.addListener(async () => {
  await initializeScriptState();
});

// Listen for messages from content scripts to update script state
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === "updateScriptState") {
    await updateScriptState(message.domain, message.enabled);
  }
});

// Function to initialize script state
async function initializeScriptState() {
  const blockedDomains = await getBlockedDomains();
  
  // Get a list of all tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const hostname = new URL(tab.url).hostname;
    scriptStatePerWebsite[hostname] = true; // Set default state to enabled
  }

  // Set initial blocked domains
  for (const domain of DEFAULT_DOMAINS) {
    scriptStatePerWebsite[domain] = true; // Ensure default domains are included
  }
}

// Function to update script state
async function updateScriptState(domain, enabled) {
  scriptStatePerWebsite[domain] = enabled;
}

// Dynamically import utils.js
async function importUtils() {
  const src = chrome.runtime.getURL("utils.js");
  const utils = await import(src);
  return utils;
}

chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    const url = new URL(details.url);
    const documentURL = new URL(details.documentUrl);
    const blockedDomains = await getBlockedDomains(); // Fetch blocked domains dynamically
    
    const utils = await importUtils();
    const baseDocumentDomain = utils.getBaseDomain(documentURL.hostname);
    const baseUrlDomain = utils.getBaseDomain(url.hostname);

    // Check if the base domain of the current URL is blocked
    let scriptState = scriptStatePerWebsite[baseDocumentDomain];
    
    if (scriptState === undefined) {
      scriptState = scriptStatePerWebsite[mapTabIdToWebsite[details.tabId]];
    }
    
    // If script state for the base domain is not found, default to enabled
    if (scriptState === undefined) {
      scriptState = true;
    }

    if (!scriptState) {
      return; // Allow the request if the script is disabled for this website
    }

    if (utils.isTabDomainBlocked(baseUrlDomain, blockedDomains)) {
      return; // Disable when the current tab domain is in the blocklist. Shouldn't block twitch calls when on www.twitch.tv :)
    }

    // Use the isDomainBlocked function to check if the URL should be blocked
    if (utils.isDomainBlocked(baseUrlDomain, blockedDomains)) {
      console.log(`Blocking request to ${url.hostname} because it's a blocked domain.`);
      return { cancel: true }; // Cancel the request
    }
  },
  { urls: ["<all_urls>"], types: ["sub_frame"] }, // Match sub-frame URLs
  ["blocking"]
);
