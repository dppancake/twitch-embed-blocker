import { updateTranslatedText } from './popup_translations.js';
import { getCurrentTabDomain } from '/utils.js';

document.addEventListener("DOMContentLoaded", async function () {
  const toggleButton = document.querySelector(".icon-container");
  const refreshButton = document.getElementById("refreshButton");
  const configureButton = document.getElementById("configureButton");

  const currentWebsiteText = document.getElementById("currentWebsite");

  const blockedStreamsOnPageElement = document.getElementById("blockedStreamsOnPage");
  const blockedTotalCountElement = document.getElementById("blockedTotalCount");
  const blockedWebsitesElement = document.getElementById("blockedWebsites");

  // Initialize texts
  updateTranslatedText();

  let scriptEnabled = true;
  let requireRefresh = false;
  let baseDomainIgnore = false;
  let blockedStreamsOnPage = 0;
  let intervalId;
  
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentStateResponse = await browser.tabs.sendMessage(tabs[0].id, { action: "getCurrentState" });

  if (currentStateResponse) {
    scriptEnabled = currentStateResponse.state;
    requireRefresh = currentStateResponse.refresh;
    baseDomainIgnore = currentStateResponse.baseDomainIgnore;
  }

  // Set the current website url
  currentWebsiteText.textContent = await getCurrentTabDomain();

  // Initialize icon state
	updateIcon(scriptEnabled);

  // Initialize the blocked streams info
  await updateBlockedStreamInfo();

  // Set interval for block stream information update
  startBlockedStreamUpdateInterval();

  // Function to start the interval
  function startBlockedStreamUpdateInterval() {
    // Check if there's already an active interval
    if (intervalId) {
      return;
    }

    // Set up the interval and save the ID
    intervalId = setInterval(updateBlockedStreamInfo, 1000);
  }

  // Function to stop the interval
  function stopBlockedStreamUpdateInterval() {
    // Check if there's an active interval
    if (!intervalId) {
      return;
    }

    // Clear the interval
    clearInterval(intervalId);
    intervalId = null; // Reset intervalId to indicate no active interval
  }

  async function updateBlockedStreamInfo() {
    const blockedStreamsTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const blockedStreamsCountResponse = await browser.tabs.sendMessage(blockedStreamsTabs[0].id, { action: "getBlockedStreamsCount" });

    if (blockedStreamsCountResponse && blockedStreamsCountResponse.action === "updateBlockedStreams") {
      updateBlockStreamsOnPage(blockedStreamsCountResponse.count);
      blockedStreamsOnPage = blockedStreamsCountResponse.count;
    }

    const blockedTotal = await browser.tabs.query({ active: true, currentWindow: true });
    const blockedTotalResponse = await browser.tabs.sendMessage(blockedTotal[0].id, { action: "getblockedTotal" });

    if (blockedTotalResponse && blockedTotalResponse.action === "updateBlockedTotal") {
      updateBlockStreamsTotal(blockedTotalResponse.count);
    }

    const mostBlockedWebsiteResponse = await browser.tabs.sendMessage(blockedTotal[0].id, { action: "getMostBlockedWebsite" });

    if (mostBlockedWebsiteResponse && mostBlockedWebsiteResponse.action === "updateMostBlockedWebsite") {
      updateMostBlockedWebsites(mostBlockedWebsiteResponse.name, mostBlockedWebsiteResponse.count);
    }
  }

  // Update the current blocked stream count for this page
	function updateBlockStreamsOnPage(count) {
	  blockedStreamsOnPageElement.textContent = count;
	}
	
	// Update the current blocked stream life time count
	function updateBlockStreamsTotal(count) {
	  blockedTotalCountElement.textContent = count;
	}
	
  // Update the most blocked streamer display
	function updateMostBlockedWebsites(name, count) {
    if (name === null) {
      blockedWebsitesElement.textContent = "-";
      return;
    }

	  blockedWebsitesElement.textContent = name + " (" + count + ")";
	}

  // Update the icon based on the script state
  function updateIcon(state) {
    const icon = document.querySelector(".icon-color");
	  const scriptToggleButton = document.getElementById("scriptToggleButton");
	
	  // Set the script toggle icon color
    icon.style.color = state ? "Mediumslateblue" : "DarkGray";
	
	  // Set the script toggle icon tooltip
	  scriptToggleButton.title = state ? chrome.i18n.getMessage('__MSG_popup_script_on__') : chrome.i18n.getMessage('__MSG_popup_script_off__');
	
	  // Toggle the 'hidden' class for the refreshButton
    refreshButton.classList.toggle("hidden", !requireRefresh);
  }

  // Event listener for toggling the script state
  if (!baseDomainIgnore) {
    toggleButton.addEventListener("click", async function () {
        // Call the function to update blocked stream info after toggling
		    await updateBlockedStreamInfo();
        
        scriptEnabled = !scriptEnabled;

        if (blockedStreamsOnPage > 0) {
          requireRefresh = !scriptEnabled;
        }

        updateIcon(scriptEnabled);
        
        if (scriptEnabled === true) {
          startBlockedStreamUpdateInterval();
        } else {
          stopBlockedStreamUpdateInterval();
        }
        
        await browser.tabs.sendMessage(tabs[0].id, { action: "toggleScript", refresh: requireRefresh });
    });
  } else {
    toggleButton.style.cursor = "default";
  }

  refreshButton.addEventListener("click", async () => {
    // Send a message to content script to reset the require_refresh variable
    const refreshTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const refreshTabsResponse = await browser.tabs.sendMessage(refreshTabs[0].id, { action: "refreshPage" });
    
    if (refreshTabsResponse && !refreshTabsResponse.state) {
        // Get the active tab's ID
        browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
          const tabId = tabs[0].id;
          // Reload the tab
          browser.tabs.reload(tabId).then(function () {
              // Close the popup window
              window.close();
            });
        });
      }
  });

  configureButton.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });
});
