import { updateTranslatedText } from './options_translations.js';

const domainListTextarea = document.getElementById('domainList');
const addDomainButton = document.getElementById('addDomain');
const domainListContainer = document.getElementById('domainListContainer');
const resetButton = document.getElementById('resetButton');

// Updated domain regex to allow subdomains
const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;

const defaultDomains = [
  "player.twitch.tv",
  "embed.twitch.tv",
  "minnit.org"
];

// Function to get favicon URL or return placeholder if not available
function getFaviconUrl(domain) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;
  return fetch(faviconUrl).then(response => {
    if (response.ok) {
      return faviconUrl;
    } else {
      return '/path/to/placeholder-favicon.png'; // Replace with the correct placeholder path
    }
  }).catch(() => {
    return '/path/to/placeholder-favicon.png'; // Replace with the correct placeholder path
  });
}

// Load blocked domains from storage
async function getBlockedDomains() {
  const { blockedDomains = [] } = await browser.storage.local.get('blockedDomains');
  return blockedDomains.length > 0 ? blockedDomains : defaultDomains;
}

// Function to check if the provided domain is already in the blocklist
function isDomainAlreadyBlocked(blockedDomains, newDomain) {
  return blockedDomains.some(blockedDomain => {
    // Use a case-insensitive comparison to check if the new domain matches any blocked domain
    return blockedDomain.toLowerCase() === newDomain.toLowerCase();
  });
}

// Display the blocked domains in the options page with favicons and remove buttons
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

    // Attach remove button event handler
    if (!defaultDomains.includes(domain)) {
      listItem.querySelector('.remove-btn').addEventListener('click', () => {
        removeDomain(domain);
      });
    }

    domainListContainer.appendChild(listItem);
  }
}

// Add a new domain to the blocked list
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

// Remove a domain from the blocked list
async function removeDomain(domainToRemove) {
  let blockedDomains = await getBlockedDomains();
  blockedDomains = blockedDomains.filter(domain => domain !== domainToRemove);

  await browser.storage.local.set({ blockedDomains });
  displayBlockedDomains();
}

// Reset blocked domains to default
async function resetBlockedDomains() {
  await browser.storage.local.set({ blockedDomains: defaultDomains });
  displayBlockedDomains();
}

// Initialize the options page
document.addEventListener("DOMContentLoaded", async () => {
  updateTranslatedText();
  displayBlockedDomains();

  addDomainButton.addEventListener("click", addDomain);
  resetButton.addEventListener("click", resetBlockedDomains);
});
