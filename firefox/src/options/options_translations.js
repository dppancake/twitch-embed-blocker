// options_translations.js

export function updateTranslatedText() {
  document.getElementById('pageTitle').textContent = chrome.i18n.getMessage('options_title');
  document.getElementById('headerTitle').textContent = chrome.i18n.getMessage('options_title');
  document.getElementById('blockedDomainsTitle').textContent = chrome.i18n.getMessage('options_blocked_domains');
  document.getElementById('domainsDescription').textContent = chrome.i18n.getMessage('options_description');
  document.getElementById('domainList').placeholder = chrome.i18n.getMessage('options_blocked_domains_placeholder');
  document.getElementById('addDomain').textContent = chrome.i18n.getMessage('options_add_domain_button');
  document.getElementById('resetDescription').textContent = chrome.i18n.getMessage('options_reset_description');
  document.getElementById('resetButton').textContent = chrome.i18n.getMessage('options_reset_button');
}
