import { updateTranslatedText } from './popup_translations.js';

// Add an event listener to the DOMContentLoaded event
document.addEventListener("DOMContentLoaded", async function () {
  // Select HTML elements
  const toggleButton = document.querySelector(".icon-container");
  const refreshButton = document.getElementById("refreshButton");
  const configureButton = document.getElementById("configureButton");

  const currentWebsiteText = document.getElementById("currentWebsite");
  const blockedStreamsOnPageElement = document.getElementById("blockedStreamsOnPage");
  const blockedTotalCountElement = document.getElementById("blockedTotalCount");
  const blockedWebsitesElement = document.getElementById("blockedWebsites");

  // Initialize translated texts
  updateTranslatedText();

  let scriptEnabled = true; // Flag to indicate if the script is enabled
  let requireRefresh = false; // Flag to indicate if a page refresh is required
  let baseDomainIgnore = false; // Flag to indicate if the base domain is to be ignored
  let blockedStreamsOnPage = 0; // Count of blocked streams on the current page
  let intervalId; // ID for the interval to update blocked stream info

  // Get the current active tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  // Send a message to the content script to get the current state
  const currentStateResponse = await browser.tabs.sendMessage(tabs[0].id, { action: "getCurrentState" });

  if (currentStateResponse) {
    scriptEnabled = currentStateResponse.state;
    requireRefresh = currentStateResponse.refresh;
    baseDomainIgnore = currentStateResponse.baseDomainIgnore;

    // Display the current website URL
    currentWebsiteText.textContent = currentStateResponse.currentHost;
  }

  // Update the icon based on the script state
  updateIcon(scriptEnabled);

  // Initialize the blocked streams information
  await updateBlockedStreamInfo();

  // Start an interval to periodically update blocked stream information
  startBlockedStreamUpdateInterval();

  /**
   * Start the interval for updating blocked stream information.
   * This function ensures that there is no active interval before setting up a new one.
   */
  function startBlockedStreamUpdateInterval() {
    // Check if there's already an active interval
    if (intervalId) {
      return;
    }

    // Set up the interval to update blocked stream info every second
    intervalId = setInterval(updateBlockedStreamInfo, 1000);
  }

  /**
   * Stop the interval for updating blocked stream information.
   * This function clears the interval and resets the intervalId.
   */
  function stopBlockedStreamUpdateInterval() {
    // Check if there's an active interval
    if (!intervalId) {
      return;
    }

    // Clear the interval
    clearInterval(intervalId);
    intervalId = null; // Reset intervalId to indicate no active interval
  }

  /**
   * Update the blocked stream information displayed in the popup.
   * Fetches current blocked streams count, total blocked streams, and the most blocked website.
   */
  async function updateBlockedStreamInfo() {
    // Get the active tab
    const blockedStreamsTabs = await browser.tabs.query({ active: true, currentWindow: true });
    // Send a message to get the number of blocked streams on the page
    const blockedStreamsCountResponse = await browser.tabs.sendMessage(blockedStreamsTabs[0].id, { action: "getBlockedStreamsCount" });

    if (blockedStreamsCountResponse && blockedStreamsCountResponse.action === "updateBlockedStreams") {
      updateBlockStreamsOnPage(blockedStreamsCountResponse.count);
      blockedStreamsOnPage = blockedStreamsCountResponse.count;
    }

    // Get the total blocked streams count
    const blockedTotal = await browser.tabs.query({ active: true, currentWindow: true });
    const blockedTotalResponse = await browser.tabs.sendMessage(blockedTotal[0].id, { action: "getblockedTotal" });

    if (blockedTotalResponse && blockedTotalResponse.action === "updateBlockedTotal") {
      updateBlockStreamsTotal(blockedTotalResponse.count);
    }

    // Get the most blocked website
    const mostBlockedWebsiteResponse = await browser.tabs.sendMessage(blockedTotal[0].id, { action: "getMostBlockedWebsite" });

    if (mostBlockedWebsiteResponse && mostBlockedWebsiteResponse.action === "updateMostBlockedWebsite") {
      updateMostBlockedWebsites(mostBlockedWebsiteResponse.name, mostBlockedWebsiteResponse.count);
    }
  }

  /**
   * Update the displayed count of blocked streams on the current page.
   * @param {number} count - The number of blocked streams to display.
   */
  function updateBlockStreamsOnPage(count) {
    blockedStreamsOnPageElement.textContent = count;
  }
  
  /**
   * Update the displayed total count of blocked streams across all pages.
   * @param {number} count - The total number of blocked streams to display.
   */
  function updateBlockStreamsTotal(count) {
    blockedTotalCountElement.textContent = count;
  }
  
  /**
   * Update the display for the most blocked website.
   * @param {string|null} name - The name of the most blocked website, or null if none.
   * @param {number} count - The count of blocks for the most blocked website.
   */
  function updateMostBlockedWebsites(name, count) {
    if (name === null) {
      blockedWebsitesElement.textContent = "-";
      return;
    }

    blockedWebsitesElement.textContent = name + " (" + count + ")";
  }

  /**
   * Update the icon and its tooltip based on the script's state.
   * @param {boolean} state - The state of the script (enabled/disabled).
   */
  function updateIcon(state) {
    const icon = document.querySelector(".icon-color");
    const scriptToggleButton = document.getElementById("scriptToggleButton");
    
    // Set the script toggle icon color
    icon.style.color = state ? "Mediumslateblue" : "DarkGray";
    
    // Set the script toggle icon tooltip
    scriptToggleButton.title = state ? chrome.i18n.getMessage('__MSG_popup_script_on__') : chrome.i18n.getMessage('__MSG_popup_script_off__');
    
    // Toggle visibility of the refresh button based on whether a refresh is required
    refreshButton.classList.toggle("hidden", !requireRefresh);
  }

  // Event listener for toggling the script state
  if (!baseDomainIgnore) {
    toggleButton.addEventListener("click", async function () {
        // Update blocked stream info after toggling the script state
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

  /**
   * Handle the click event for the refresh button.
   * Sends a message to reset the require_refresh variable and reloads the tab if needed.
   */
  refreshButton.addEventListener("click", async () => {
    const refreshTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const refreshTabsResponse = await browser.tabs.sendMessage(refreshTabs[0].id, { action: "refreshPage" });
    
    if (refreshTabsResponse && !refreshTabsResponse.state) {
        // Get the active tab's ID
        browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
          const tabId = tabs[0].id;
          // Reload the tab
          browser.tabs.reload(tabId).then(function () {
              // Close the popup window after reloading the tab
              window.close();
            });
        });
      }
  });

  /**
   * Handle the click event for the configure button.
   * Opens the extension options page.
   */
  configureButton.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });
});
