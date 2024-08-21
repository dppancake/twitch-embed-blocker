import { updateTranslatedText } from './options_translations.js';

// Select HTML elements
const domainListTextarea = document.getElementById('domainList');
const addDomainButton = document.getElementById('addDomain');
const domainListContainer = document.getElementById('domainListContainer');
const resetButton = document.getElementById('resetButton');

// Regex for validating domain format, including subdomains
const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;

// Default domains to block
const defaultDomains = [
  "player.twitch.tv",
  "embed.twitch.tv",
  "minnit.org"
];

/**
 * Get the favicon URL for a given domain or return a placeholder if not available.
 * @param {string} domain - The domain to get the favicon for.
 * @returns {Promise<string>} - The favicon URL or a placeholder path.
 */
function getFaviconUrl(domain) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;
  const faviconPlaceholder = "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://firefox.com&size=16"
  return fetch(faviconUrl).then(response => {
    if (response.ok) {
      return faviconUrl;
    } else {
      return faviconPlaceholder; // Replace with the correct placeholder path
    }
  }).catch(() => {
    return faviconPlaceholder; // Replace with the correct placeholder path
  });
}

/**
 * Load blocked domains from storage, returning default domains if none are found.
 * @returns {Promise<string[]>} - The list of blocked domains.
 */
async function getBlockedDomains() {
  const { blockedDomains = [] } = await browser.storage.local.get('blockedDomains');
  return blockedDomains.length > 0 ? blockedDomains : defaultDomains;
}

/**
 * Check if a domain is already in the blocklist.
 * @param {string[]} blockedDomains - The list of currently blocked domains.
 * @param {string} newDomain - The domain to check for.
 * @returns {boolean} - True if the domain is already blocked, false otherwise.
 */
function isDomainAlreadyBlocked(blockedDomains, newDomain) {
  return blockedDomains.some(blockedDomain => {
    // Case-insensitive comparison
    return blockedDomain.toLowerCase() === newDomain.toLowerCase();
  });
}

/**
 * Display the list of blocked domains on the options page, including favicons and remove buttons.
 */
async function displayBlockedDomains() {
  const blockedDomains = await getBlockedDomains();
  domainListContainer.innerHTML = '';

  for (const domain of blockedDomains) {
    const faviconUrl = await getFaviconUrl(domain);
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <img src="${faviconUrl}" alt="" class="favicon">
      <span>${domain}</span>
      ${defaultDomains.includes(domain) ? '' : '<button class="remove-btn" data-domain="' + domain + '">' + chrome.i18n.getMessage('__MSG_options_remove_domain_button__') + '</button>'}
    `;

    // Attach event handler for the remove button
    if (!defaultDomains.includes(domain)) {
      listItem.querySelector('.remove-btn').addEventListener('click', () => {
        removeDomain(domain);
      });
    }

    domainListContainer.appendChild(listItem);
  }
}

/**
 * Add new domains to the blocklist.
 * Domains are read from the textarea and validated before being added.
 */
async function addDomain() {
  const newDomainsInput = domainListTextarea.value.trim();
  const newDomains = newDomainsInput.split(/\r?\n/);

  const blockedDomains = await getBlockedDomains();

  for (const newDomain of newDomains) {
    if (domainRegex.test(newDomain)) {
      if (!isDomainAlreadyBlocked(blockedDomains, newDomain)) {
        blockedDomains.push(newDomain);
        await browser.storage.local.set({ blockedDomains });
        domainListTextarea.value = ''; // Clear the textarea after adding
      } else {
        alert(chrome.i18n.getMessage('__MSG_options_already_on_blocklist__').replace("%s", newDomain));
      }
    } else {
      alert(chrome.i18n.getMessage('__MSG_options_domains_invalid_format__').replace("%s", newDomain));
    }
  }
  displayBlockedDomains();
}

/**
 * Remove a specific domain from the blocklist.
 * @param {string} domainToRemove - The domain to remove from the blocklist.
 */
async function removeDomain(domainToRemove) {
  let blockedDomains = await getBlockedDomains();
  blockedDomains = blockedDomains.filter(domain => domain !== domainToRemove);

  await browser.storage.local.set({ blockedDomains });
  displayBlockedDomains();
}

/**
 * Reset the blocklist to default domains.
 */
async function resetBlockedDomains() {
  await browser.storage.local.set({ blockedDomains: defaultDomains });
  displayBlockedDomains();
}

// Initialize the options page on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  updateTranslatedText(); // Update texts according to current language
  displayBlockedDomains(); // Display the list of blocked domains

  // Add event listeners for the add domain and reset buttons
  addDomainButton.addEventListener("click", addDomain);
  resetButton.addEventListener("click", resetBlockedDomains);
});
