console.log("Starting embed blocker...");

async function loadUtils() {
  const src = chrome.runtime.getURL("utils.js");
  const utils = await import(src);
  return utils;
}

// Example usage:
loadUtils().then(utils => {
    let blockedStreams = 0;
    let blockedTotal = 0;
    let blockedWebsites = {};
    let requireRefresh = false;
    let initialRemove = true;
    let baseDomainIgnore = false;

    const currentHostname = window.location.hostname;

    const DEFAULT_DOMAINS = [
      "player.twitch.tv",
      "embed.twitch.tv",
      "minnit.org"
    ];

    let blockedDomainsList = [];

    // Load blocked domains from storage, or use default domains
    async function loadBlockedDomains() {
      const { blockedDomains } = await browser.storage.local.get({ blockedDomains: DEFAULT_DOMAINS });
      blockedDomainsList = blockedDomains;
    }

    // Load script state from storage for the current domain
    async function loadScriptState(initial=false) {
      await loadBlockedDomains();
        
      const { enabled } = await browser.storage.local.get("enabled");
      scriptEnabled = enabled && enabled[currentHostname] !== undefined ? enabled[currentHostname] : true;

      // Disable script when the current tab domain is in the blocklist. Shouldn't block twitch calls when on www.twitch.tv :)
      if (utils.isTabDomainBlocked(currentHostname, blockedDomainsList)) {
        if (initial) {
          console.log(`Embed blocking is disabled because the current domain (${currentHostname}) is on the block list.`);
        }
        
        scriptEnabled = false;
        baseDomainIgnore = true;
      } else {
        if (initial) {
          console.log(`Embed blocking for ${currentHostname} is ${scriptEnabled ? 'enabled' : 'disabled'}.`);
        }
      }

      await updateScriptState(currentHostname, scriptEnabled);
      return scriptEnabled;
    }

    // Function to update script state
    async function updateScriptState(domain, enabled) {
      await browser.runtime.sendMessage({ action: "updateScriptState", domain: domain, enabled: enabled });
    }

    // Load data from storage
    async function loadDataFromStorage(initial=false) {
      const { blockedTotalSinceInstall, blockedWebsitesCount } = await browser.storage.local.get(["blockedTotalSinceInstall", "blockedWebsitesCount"]);

      if (initial) {
        blockedTotal = (blockedTotalSinceInstall + blockedTotal) || 0;
        blockedWebsites = Object.keys({ ...blockedWebsites, ...blockedWebsitesCount }).reduce((result, key) => {
          result[key] = (blockedWebsites[key] || 0) + (blockedWebsitesCount[key] || 0);
          return result;
        }, {});

        // Now update the storage with the complete statistics
        await updateStreamBlocksCount();
        await browser.storage.local.set({ blockedWebsitesCount: blockedWebsites });
      } else {
        blockedTotal = blockedTotalSinceInstall;
        blockedWebsites = blockedWebsitesCount;
      }
    }

    // Remove embedded streams based on blocked domains
    async function removeEmbeddedStreams() {
      await loadBlockedDomains();
      const iframes = document.querySelectorAll("iframe");
      for (const iframe of iframes) {
        const src = iframe.getAttribute("src");
        if (src && isEmbeddedStream(src)) {
          iframe.remove();

          // Only increment the statistics on blocking after the first load
          // Some websites, like fextralife, keep trying to restore the iframe, which would incredement the statistics exponantionally.
          if (initialRemove) {
            console.log(`Blocked iframe with src: ${src}`);
            initialRemove = false;

            blockedStreams++;
            blockedTotal++;

            await updateStreamBlocksCount();
            await updateWebsiteBlockCount();
          } 
        }
      }
    }

    // Function to check if a URL is a Twitch embedded stream
    function isEmbeddedStream(url) {
      return blockedDomainsList.some((domain) => url.includes(domain));
    }

    // Update blocked stream counts in storage
    async function updateStreamBlocksCount() {
      await browser.storage.local.set({ blockedTotalSinceInstall: blockedTotal });
    }

    // Update blocked streamer count in storage
    async function updateWebsiteBlockCount() {
      if (currentHostname) {
        blockedWebsites[currentHostname] = blockedWebsites[currentHostname] ? blockedWebsites[currentHostname] + 1 : 1;
        await browser.storage.local.set({ blockedWebsitesCount: blockedWebsites });
      }
    }

    // Toggle the script state for the current domain
    async function toggleScriptState() {
      const { enabled } = await browser.storage.local.get("enabled");

      const scriptEnabled = enabled && enabled[currentHostname] !== undefined ? !enabled[currentHostname] : false;

      const newEnabledState = {
        ...enabled,
        [currentHostname]: scriptEnabled,
      };

      await browser.storage.local.set({ enabled: newEnabledState });

      if (scriptEnabled) {
        removeEmbeddedStreams()
          .then(() => {
            observer.observe(document.body, { childList: true, subtree: true });
          });
      } else {
        observer.disconnect(document.body, { childList: true, subtree: true });
      }
      
      await updateScriptState(currentHostname, scriptEnabled);
    }

    // Function to check if new domains were added after launch
    async function checkNewDomains() {
      old_length = blockedDomainsList.length;

      await loadBlockedDomains();

      new_length = blockedDomainsList.length;

      if (old_length !== new_length) {
        removeEmbeddedStreams();
      }
    }

    // Observe changes in the document's body
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          removeEmbeddedStreams();
        }
      }
    });

    // Initial removal of streams
    loadScriptState(true).then(async (scriptEnabled) => {
      if (scriptEnabled) {
        removeEmbeddedStreams()
          .then(() => loadDataFromStorage(true)) // Ensure this runs after removeEmbeddedStreams
          .then(() => {            
            observer.observe(document.body, { childList: true, subtree: true });
            console.log("Attached observer to check for streams being added after page load.");

            setInterval(checkNewDomains, 2000);
          });
      }
    });

    // Listen for messages from popup and respond accordingly
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "toggleScript") {
        toggleScriptState().then(() => {
          sendResponse({ action: "scriptToggled" });
          requireRefresh = message.refresh;
        });
        return true;
      } else if (message.action === "getBlockedStreamsCount") {
        sendResponse({ action: "updateBlockedStreams", count: blockedStreams });
      } else if (message.action === "getblockedTotal") {
        loadDataFromStorage().then(() => {
          sendResponse({ action: "updateBlockedTotal", count: blockedTotal });
        });
        return true;
      } else if (message.action === "getMostBlockedWebsite") {
        loadDataFromStorage().then(() => {
          const mostBlockedWebsite = utils.getKeyWithHighestValue(blockedWebsites);
          sendResponse({ action: "updateMostBlockedWebsite", name: mostBlockedWebsite, count: blockedWebsites[mostBlockedWebsite] });
        });
        return true;
      } else if (message.action === "getCurrentState") {
        loadScriptState().then((scriptEnabled) => {
          sendResponse({ action: "updateCurrentState", state: scriptEnabled, refresh: requireRefresh, base_domain_ignore: baseDomainIgnore });
        });
        return true;
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
});