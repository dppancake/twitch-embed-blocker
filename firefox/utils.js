// utils.js

/**
 * Retrieves the domain of the current active tab.
 * 
 * @returns {Promise<string>} - A promise that resolves to the domain of the current tab.
 */
export function getCurrentTabDomain() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError));
          return;
        }
  
        if (tabs.length > 0) {
          const tab = tabs[0];
          const url = new URL(tab.url);
          const domain = url.hostname;
          resolve(domain);
        } else {
          reject(new Error('No active tab found.'));
        }
      });
    });
  }  

/**
 * Extracts the base domain from a hostname.
 * For example, 'sub.example.com' will return 'example.com'.
 * 
 * @param {string} hostname - The full hostname.
 * @returns {string} - The base domain.
 */
export function getBaseDomain(hostname) {
    const parts = hostname.split('.').reverse();
    if (parts.length > 1) {
      // For most cases, return the last two parts (e.g., example.com)
      return parts[1] + '.' + parts[0];
    }
    return hostname; // For cases like 'localhost'
  }  

    /**
     * Checks if the current tab domain is in the blocklist
     * 
     * @param {string} domain - The domain to check.
     * @param {Array<string>} blockedDomains - List of blocked domains.
     * @returns {boolean} - True if the current tab domain is in the list of blocked domains
     */
    export function isTabDomainBlocked(domain, blockedDomains) {
        // Extract the base domain from the current domain
        const baseDomain = getBaseDomain(domain);

        // Check if the exact base domain is in the blocked domains list
        const isBlockedBaseDomain = blockedDomains.includes(baseDomain);

        // Check if the domain is a subdomain of any blocked domain
        let isBlockedSubDomain = false;
        for (const blockedDomain of blockedDomains) {
            const baseBlockedDomain = getBaseDomain(blockedDomain);
            if (baseBlockedDomain === baseDomain) {
                isBlockedSubDomain = true;
                break;
            }
        }
        
        // Return true if either the base domain or a subdomain is blocked
        return isBlockedBaseDomain || isBlockedSubDomain;
    }
    
  /**
   * Gets the channel name from an iframe src URL.
   * 
   * @param {string} src - The iframe src URL.
   * @returns {string} - The channel name, if available.
   */
  export function getChannelFromSrc(src) {
    return new URL(src).searchParams.get('channel');
  }
  
  /**
   * Gets the key of the JSON object with the highest value.
   * 
   * @param {Object} obj - The object to check.
   * @returns {string} - The key with the highest value.
   */
  export function getKeyWithHighestValue(obj) {
    let highestValue = -Infinity;
    let keyWithHighestValue = null;
  
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === "number") {
        if (obj[key] > highestValue) {
          highestValue = obj[key];
          keyWithHighestValue = key;
        }
      }
    }
  
    return keyWithHighestValue;
  }
  