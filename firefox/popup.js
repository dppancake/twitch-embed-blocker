// popup.js

document.addEventListener("DOMContentLoaded", async function () {
  const toggleButton = document.querySelector(".icon-container");
  const refreshButton = document.getElementById("refreshButton");
  const moreButton = document.getElementById("moreButton");

  // Current state element
  let scriptEnabled = true; // Default state, will be updated based on storage;
  let require_refresh = false; // Default state, will remember if a refresh needs to be executed for this page;
  let blocked_streams_on_page = 0;

  // Request current state from content script
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentStateResponse = await browser.tabs.sendMessage(tabs[0].id, { action: "getCurrentState" });

  if (currentStateResponse) {
    scriptEnabled = currentStateResponse.state;
	require_refresh = currentStateResponse.refresh;
  }

  // Function to update blocked stream information
  async function updateBlockedStreamInfo() {
    // Request blocked stream on this page count
    const blockedStreamsTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const blockedStreamsCountResponse = await browser.tabs.sendMessage(blockedStreamsTabs[0].id, { action: "getBlockedStreamsCount" });

    if (blockedStreamsCountResponse && blockedStreamsCountResponse.count) {
      updateBlockStreams(blockedStreamsCountResponse.count);
	  blocked_streams_on_page = blockedStreamsCountResponse.count;
    }

    // Request blocked stream count lifetime
    const blockedStreamsLifeTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const blockedStreamsLifeResponse = await browser.tabs.sendMessage(blockedStreamsLifeTabs[0].id, { action: "getBlockedStreamsLifeCount" });

    if (blockedStreamsLifeResponse && blockedStreamsLifeResponse.count) {
      updateBlockStreamsLife(blockedStreamsLifeResponse.count);
    }

    // Request the most blocked streamer
    const blockedStreamerTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const blockedStreamerResponse = await browser.tabs.sendMessage(blockedStreamerTabs[0].id, { action: "getMostBlockedStreamer" });

    if (blockedStreamerResponse && blockedStreamerResponse.name && blockedStreamerResponse.count) {
      updateBlockStreamer(blockedStreamerResponse.name, blockedStreamerResponse.count);
    }
  }

  // Call the function to update blocked stream info on page load
  await updateBlockedStreamInfo();

  // Update the icon based on the script state
  function updateIcon(state) {
    const icon = document.querySelector(".icon-color");
	const scriptToggleButton = document.getElementById("scriptToggleButton");
	
	// Set the script toggle icon color
    icon.style.color = state ? "Mediumslateblue" : "DarkGray";
	
	// Set the script toggle icon tooltip
	scriptToggleButton.title = state ? chrome.i18n.getMessage('popup_script_on') : chrome.i18n.getMessage('popup_script_off');
	
	// Toggle the 'hidden' class for the refreshButton
    refreshButton.classList.toggle("hidden", !require_refresh);
  }
  
   // Function to get the current domain
	async function getCurrentDomain(placeholder) {
	  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
	  if (tabs && tabs[0]) {
		const url = new URL(tabs[0].url);
		return url.hostname;
	  }
	  return placeholder || "";
	}
	
    // Update the current blocked stream count for this page
	function updateBlockStreams(count) {
	  const blockedStreamsCountElement = document.getElementById("blockedStreamsCount");
	  blockedStreamsCountElement.textContent = count;
	}
	
	// Update the current blocked stream life time count
	function updateBlockStreamsLife(count) {
	  const blockedStreamsLifeCountElement = document.getElementById("blockedStreamsLifeCount");
	  blockedStreamsLifeCountElement.textContent = count;
	}
	
    // Update the most blocked streamer display
	function updateBlockStreamer(name, count) {
	  const blockedStreamerElement = document.getElementById("blockedStreamerCount");
	  blockedStreamerElement.textContent = name + " (" + count + ")";
	}
	
	// Set the current domain url
	const website_info = document.getElementById("currentWebsite");
	current_domain = await getCurrentDomain("_");
	website_info.textContent = current_domain;

	// Initialize icon state
	updateIcon(scriptEnabled);
	
	
  // Event listener for toggling the script state
  if (current_domain !== "www.twitch.tv") {
	toggleButton.addEventListener("click", async function () {
		scriptEnabled = !scriptEnabled;
		
		if (blocked_streams_on_page > 0) {
		   require_refresh = !scriptEnabled;
		}

		updateIcon(scriptEnabled);

		// Send message to content script to toggle script state
		const toggleTabs = await browser.tabs.query({ active: true, currentWindow: true });
		await browser.tabs.sendMessage(toggleTabs[0].id, { action: "toggleScript", refresh: require_refresh });
		
		// Call the function to update blocked stream info after toggling
		await updateBlockedStreamInfo();
	  });
  } else {
	toggleButton.style.cursor = "default";  
  }
  
  // Event listener for refreshing the page
  refreshButton.addEventListener("click", async function () {  
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
  
// Function to toggle the footer bar's visibility
	function toggleFooterBar() {
	  // Get references to the footer bar and the "More" button
	  const footerBar = document.querySelector(".footer-bar");

	  footerBar.classList.toggle("hidden");
	  const isHidden = footerBar.classList.contains("hidden");
	  moreButton.innerText = isHidden ? chrome.i18n.getMessage('popup_show_more') : chrome.i18n.getMessage('popup_show_less');
	  moreButton.setAttribute("data-state", isHidden ? "closed" : "open");
	}

	// Add a click event listener to the "More" button
	moreButton.addEventListener("click", toggleFooterBar);
});

