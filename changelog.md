# CHANGELOG.md

## 1.5 (2024-08-22)
Made some changes to the localization and format of the text strings.


## 1.4 (2024-08-21)
This update brings increased flexibility to the Twitch Blocker. With the growing number of streaming services embedded across various websites, which have similar effects to Twitch, I have expanded the blocker to handle a wider range of domains and blocking methods.
More customization and blocking methods will come, when I have the time for it.

Changes:

  - Updated the statistics to track the most frequently blocked websites instead of the most blocked streams. -> [390bbbd](https://github.com/dppancake/twitch-embed-blocker/commit/390bbbd86f36c689275121f1206ae99b26e8ee63)

Features:

  - Added Minnit.org to the list of blocked domains, as it is commonly used alongside Fextralife. -> [390bbbd](https://github.com/dppancake/twitch-embed-blocker/commit/390bbbd86f36c689275121f1206ae99b26e8ee63)
  - Introduced a configuration menu that allows users to manually edit the domains to be blocked.  -> [390bbbd](https://github.com/dppancake/twitch-embed-blocker/commit/390bbbd86f36c689275121f1206ae99b26e8ee63)
  - Added placeholder favicon for domain list -> [ee94597](https://github.com/dppancake/twitch-embed-blocker/commit/ee94597c8b44bd6a14a49905fa574febd570df35)

Fixes:

  - Enhanced blocking functionality by continuously monitoring and re-checking for iframe embeds after the DOM has fully loaded. -> [390bbbd](https://github.com/dppancake/twitch-embed-blocker/commit/390bbbd86f36c689275121f1206ae99b26e8ee63)
  - Removed script injection for utils in favour of including it in a bundle. -> [ee94597](https://github.com/dppancake/twitch-embed-blocker/commit/ee94597c8b44bd6a14a49905fa574febd570df35)

## 1.3 (2023-09-04)

Features:

  - Added translations for the following languages: Nederlands, Deutsch, Español, Français, Italiano, Português -> [feb73c5](https://github.com/dppancake/twitch-embed-blocker/commit/feb73c524a0dc42ae00a6a74fb0b95c0ba5943c3)

Fixes:

  - Fixed a bug that caused the refresh button to not appear after turning Twitch Blocker off for a specific domain -> [feb73c5](https://github.com/dppancake/twitch-embed-blocker/commit/feb73c524a0dc42ae00a6a74fb0b95c0ba5943c3)
  - Fixed a bug that caused Twitch Blocker to not exclude a domain from blocking after clicking on the turn off button -> [feb73c5](https://github.com/dppancake/twitch-embed-blocker/commit/feb73c524a0dc42ae00a6a74fb0b95c0ba5943c3)

## 1.2 (2023-08-29)
First release of the extension on firefox only.

Features:

  - Blocks Embedded Twitch streams if enabled for that website/domain (default: True)
  - Keeps track of the total blocked streams on the current page, the total after installation and per channel. All locally stored.

## 1.1 (2023-08-29 | unreleased)
Also a non-public version that fixed several bugs and introduced the statistics feature in the popup screen.
    
## 1.0 (2023-08-29 | unreleased)
Initial release of the extension for firefox. This was a non-public version.
