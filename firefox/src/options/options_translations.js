// options_translations.js

export function updateTranslatedText() {
  document.getElementById('pageTitle').textContent = chrome.i18n.getMessage('__MSG_options_title__');
  document.getElementById('headerTitle').textContent = chrome.i18n.getMessage('__MSG_options_title__');
  document.getElementById('blockedDomainsTitle').textContent = chrome.i18n.getMessage('__MSG_options_blocked_domains__');
  document.getElementById('domainsDescription').textContent = chrome.i18n.getMessage('__MSG_options_description__');
  document.getElementById('domainList').placeholder = chrome.i18n.getMessage('__MSG_options_blocked_domains_placeholder__');
  document.getElementById('addDomain').textContent = chrome.i18n.getMessage('__MSG_options_add_domain_button__');
  document.getElementById('resetDescription').textContent = chrome.i18n.getMessage('__MSG_options_reset_description__');
  document.getElementById('resetButton').textContent = chrome.i18n.getMessage('__MSG_options_reset_button__');
}
