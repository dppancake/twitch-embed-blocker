// background.js

// List of domains to block
const blockedDomains = [
  "player.twitch.tv",
  "embed.twitch.tv",
];

// Map to track script state per website
const scriptStatePerWebsite = {};

// Map tabId to website
const mapTabIdToWebsite = {};

// Listen for messages from content scripts to update script state
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === "updateScriptState") {
    await updateScriptState(message.domain, message.enabled);
  }
});

// Initialize script state when the extension starts
chrome.runtime.onStartup.addListener(() => {
  initializeScriptState();
});

// Function to initialize script state
async function initializeScriptState() {
  // Get a list of all tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const hostname = new URL(tab.url).hostname;
    scriptStatePerWebsite[hostname] = true; // Set default state to enabled
  }
}

// Function to update script state
async function updateScriptState(domain, enabled) {
  scriptStatePerWebsite[domain] = enabled;
}

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    const url = new URL(details.url);
    const documentURL = new URL(details.documentUrl);
    scriptState = scriptStatePerWebsite[documentURL.hostname];
	
	if (scriptStatePerWebsite.hasOwnProperty(documentURL.hostname)) {
	   mapTabIdToWebsite[details.tabId]	= documentURL.hostname;
	} else {
	   scriptState = scriptStatePerWebsite[mapTabIdToWebsite[details.tabId]];
    }

    if (!scriptState) {
      return; // Allow the request if the script is disabled for this website
    }

    if (blockedDomains.includes(url.hostname)) {
      return { cancel: true }; // Cancel the request
    }
  },
  { urls: ["<all_urls>"], types: ["sub_frame"] }, // Match sub-frame URLs
  ["blocking"]
);
