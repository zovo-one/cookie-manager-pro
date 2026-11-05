importScripts("service-worker.js");

// Zovo what's new page, hook v2 (sprint 1030). It opens a tab only on an extension update, at most
// once in 30 days across all Zovo update tabs of this extension, and never on install or on a
// Chrome update. The opt-out checkbox on the page sets zovoWhatsNewOptOut.
// A first run without zovoLastUpdateTabAt (the 1021 hook did not store a time) writes the time and
// opens no tab, so this version never opens a second tab soon after the 1021 one.
(() => {
  const ZOVO_GAP_MS = 30 * 864e5;
  const zovoKeys = ['zovoWhatsNewShown', 'zovoLastUpdateTabAt', 'zovoWhatsNewOptOut'];
  chrome.runtime.onInstalled.addListener((d) => {
    if (!d || (d.reason !== 'update' && d.reason !== 'install')) return;
    if (!chrome.storage || !chrome.storage.local) return;
    const v = chrome.runtime.getManifest().version;
    chrome.storage.local.get(zovoKeys, (r) => {
      if (chrome.runtime.lastError || !r) return;
      const now = Date.now();
      const last = Number(r.zovoLastUpdateTabAt);
      if (d.reason === 'install' || !Number.isFinite(last) || last <= 0) {
        // Seed. No tab now. The next update 30 days or more later may open one.
        chrome.storage.local.set({ zovoLastUpdateTabAt: now, zovoWhatsNewShown: v }, () => void chrome.runtime.lastError);
        return;
      }
      if (d.previousVersion === v) return;
      if (r.zovoWhatsNewOptOut === true) return;
      if (r.zovoWhatsNewShown === v) return;
      if (last > now || now - last < ZOVO_GAP_MS) return;
      // Write the flags first, so a crash cannot open a second tab.
      chrome.storage.local.set({ zovoLastUpdateTabAt: now, zovoWhatsNewShown: v }, () => {
        if (chrome.runtime.lastError) return;
        chrome.tabs.create({ url: chrome.runtime.getURL('zovo-whats-new/index.html'), active: false }, () => void chrome.runtime.lastError);
      });
    });
  });
})();
