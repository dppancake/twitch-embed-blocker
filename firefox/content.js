// content.js

let blockedStreams = 0; // Counter for blocked streams
let blockedStreamsLife = 0; // Counter for blocked streams lifetime
let blockedStreamers = {};
let requireRefresh = false; // Flag for requiring a page refresh
let initial_remove = true;

// List of domains to block
const blockedDomains = [
  "player.twitch.tv",
  "embed.twitch.tv",
];

// Load script state from storage for the current domain
async function loadScriptState() {
  const currentDomain = window.location.hostname;
  
  if (currentDomain === "www.twitch.tv") {
    return false; // Disable the script for twitch.tv domain
  }
  
  const { enabled } = await browser.storage.local.get("enabled");
  const scriptEnabled = enabled && enabled[currentDomain] !== undefined ? enabled[currentDomain] : true;
  
  await updateScriptState(currentDomain, scriptEnabled);
  
  return scriptEnabled;
}

// Function to update script state
async function updateScriptState(domain, enabled) {
  await browser.runtime.sendMessage({ action: "updateScriptState", domain: domain, enabled: enabled });
}

// Load script data from storage
async function loadDataFromStorage(initial) {
  const { blocks_lifetime, blocked_streamers } = await browser.storage.local.get(["blocks_lifetime", "blocked_streamers"]);
  
  if (initial) {
	blockedStreamsLife = (blocks_lifetime + blockedStreamsLife) || 0;
	blockedStreamers = Object.keys({ ...blockedStreamers, ...blocked_streamers }).reduce((result, key) => {
	  result[key] = (blockedStreamers[key] || 0) + (blocked_streamers[key] || 0);
	  return result;
	}, {});

	// Now update the storage with the complete statistics
	await updateStreamBlocksCount();
	await browser.storage.local.set({ blocked_streamers: blockedStreamers });
  } else {
	blockedStreamsLife = blocks_lifetime;
	blockedStreamers = blocked_streamers;
  }
}

// Remove embedded Twitch streams
async function removeTwitchEmbeddedStreams() {
  const iframes = document.querySelectorAll("iframe");
  for (const iframe of iframes) {
    const src = iframe.getAttribute("src");
    if (src && isTwitchEmbeddedStream(src)) {
      iframe.remove();
      blockedStreams++;
      blockedStreamsLife++;
	  
	  if (!initial_remove) {
		  await updateStreamBlocksCount();
	  }
	  
	  await updateStreamerBlockCount(src, !initial_remove);
    }
  }
}


// Function to check if a URL is a Twitch embedded stream
function isTwitchEmbeddedStream(url) {
  return blockedDomains.some((domain) => url.includes(domain));
}

// Update blocked stream counts in storage
async function updateStreamBlocksCount() {
  await browser.storage.local.set({ blocks_lifetime: blockedStreamsLife });
}

// Parse the channel name from the iframe src
function getChannelFromSrc(src) {
  return new URL(src).searchParams.get('channel');
}

// Update blocked streamer count in storage
async function updateStreamerBlockCount(src, store) {
  const channel = getChannelFromSrc(src);
  if (channel) {
    blockedStreamers[channel] = blockedStreamers[channel] ? blockedStreamers[channel] + 1 : 1;
	
	if (store) {
	   await browser.storage.local.set({ blocked_streamers: blockedStreamers });
	}
  }
}

// Toggle the script state for the current domain
async function toggleScriptState() {
  const currentDomain = window.location.hostname;
  const { enabled } = await browser.storage.local.get("enabled");
  
  // Toggle the script state. If the storage returned undefined, make it default back to False.
  // This is likely causes by browsing to a new/unknown domain that isn't present in the local storage yet.
  const scriptEnabled = enabled && enabled[currentDomain] !== undefined ? !enabled[currentDomain] : false;

  const newEnabledState = {
    ...enabled,
    [currentDomain]: scriptEnabled,
  };
  
  await browser.storage.local.set({ enabled: newEnabledState });
  
  if (scriptEnabled) {
    removeTwitchEmbeddedStreams();
  }
  
  await updateScriptState(currentDomain, scriptEnabled);
}

// Function to get the key of a JSON object with the highest value
function getKeyWithHighestValue(obj) {
  let highestValue = -Infinity;
  let keyWithHighestValue = null;

  for (const key in obj) {
    if (obj.hasOwnProperty(key) && typeof obj[key] === "number") {
      if (obj[key] > highestValue) {
        highestValue = obj[key];
        keyWithHighestValue = key;
      }
    }
  }

  return keyWithHighestValue;
}

// Remove Twitch streams as soon as iframes are added to the page
const observer = new MutationObserver((mutationsList) => {
  loadScriptState().then((scriptEnabled) => {
	if (scriptEnabled) {
	  for (const mutation of mutationsList) {
		if (mutation.type === "childList") {
		  removeTwitchEmbeddedStreams();
		}
	  }
	}
  });
});

// Observe changes in the document's body
observer.observe(document.body, { childList: true, subtree: true });

// Initial removal of Twitch streams
loadScriptState().then(async (scriptEnabled) => {
  if (scriptEnabled) {
    await removeTwitchEmbeddedStreams();
  }
  
  if (initial_remove) {
	await loadDataFromStorage(true);
    initial_remove = false;
  }
});

// Listen for messages from popup and respond accordingly
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleScript") {
    toggleScriptState().then(() => {
      sendResponse({ action: "scriptToggled" });
	  requireRefresh = message.refresh;
    });
	return true; // Important: Return true to indicate that you will send a response asynchronously
  } else if (message.action === "getBlockedStreamsCount") {
    sendResponse({ action: "updateBlockedStreams", count: blockedStreams });
  } else if (message.action === "getBlockedStreamsLifeCount") {
	loadDataFromStorage().then(() => {
		sendResponse({ action: "updateBlockedLifeStreams", count: blockedStreamsLife });
	});
    return true; // Important: Return true to indicate that you will send a response asynchronously	
  } else if (message.action === "getMostBlockedStreamer") {
	loadDataFromStorage().then(() => {
		const mostBlockedStreamer = getKeyWithHighestValue(blockedStreamers);
		sendResponse({ action: "updateMostBlockedStreamer", name: mostBlockedStreamer, count: blockedStreamers[mostBlockedStreamer] });
	});
    return true; // Important: Return true to indicate that you will send a response asynchronously	
  } else if (message.action === "getCurrentState") {
    loadScriptState().then((scriptEnabled) => {
      sendResponse({ action: "updateCurrentState", state: scriptEnabled, refresh: requireRefresh });
    });
    return true; // Important: Return true to indicate that you will send a response asynchronously
  } else if (message.action === "refreshPage") {
    requireRefresh = false;
    sendResponse({ action: "updateRefreshState", state: requireRefresh });
  }
});
