// popup_translations.js

export function updateTranslatedText() {
  document.getElementById('blockedStreamsOnPageText').textContent = chrome.i18n.getMessage('popup_page_block');
  document.getElementById('blockedTotalCountText').textContent = chrome.i18n.getMessage('popup_lifetime_block');
  document.getElementById('blockedWebsitesText').textContent = chrome.i18n.getMessage('popup_website_block');
  document.getElementById('configureButton').title = chrome.i18n.getMessage('popup_options_tooltip');

  document.querySelector('.title').textContent = chrome.i18n.getMessage('app_title');
  document.querySelector('.description').textContent = chrome.i18n.getMessage('popup_description');
}
