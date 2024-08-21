// popup_translations.js

export function updateTranslatedText() {
  document.getElementById('blockedStreamsOnPageText').textContent = chrome.i18n.getMessage('__MSG_popup_page_block__');
  document.getElementById('blockedTotalCountText').textContent = chrome.i18n.getMessage('__MSG_popup_lifetime_block__');
  document.getElementById('blockedWebsitesText').textContent = chrome.i18n.getMessage('__MSG_popup_website_block__');
  document.getElementById('configureButton').title = chrome.i18n.getMessage('__MSG_popup_options_tooltip__');

  document.querySelector('.title').textContent = chrome.i18n.getMessage('__MSG_app_title__');
  document.querySelector('.description').textContent = chrome.i18n.getMessage('__MSG_popup_description__');
}
