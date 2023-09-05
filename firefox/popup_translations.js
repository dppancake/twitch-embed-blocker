// popup_translations.js

// Function to update the translated text in the popup
function updateTranslatedText() {
  // Set the text for the description box
  document.querySelector('.description').textContent = chrome.i18n.getMessage('popup_description');
  
  // Set the text for current blocked streams on the page box
  document.getElementById('blockedStreamsText').textContent = chrome.i18n.getMessage('popup_page_block');
  
  // Set the text for the description box
  document.getElementById('blockedStreamsLifeCountText').textContent = chrome.i18n.getMessage('popup_lifetime_block');
  
  // Set the text for the description box
  document.getElementById('blockedStreamerText').textContent = chrome.i18n.getMessage('popup_streamer_block');
  
  // Set the initial text for the more button (show more options button)
  document.getElementById('moreButton').textContent = chrome.i18n.getMessage('popup_show_more');
    
  // Set the options button tooltip
  document.querySelector('.options-button').title = chrome.i18n.getMessage('popup_options_tooltip');
}

// Call the function to update the translated text
updateTranslatedText();
