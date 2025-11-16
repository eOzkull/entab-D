/**
 * Background Service Worker for Tab Tamer
 * - Performs grouping and deduplication logic when triggered from the popup
 * - Stores user preferences in chrome.storage
 */

const DEFAULT_RULES = [
  { name: "Study",     color: "blue",   keywords: ["leetcode","geeksforgeeks","w3schools","mdn","stack overflow","hackerrank","interviewbit"] },
  { name: "Education", color: "green",  keywords: ["coursera","udemy","edx","khanacademy","nptel","brilliant","mit","stanford","harvard"] },
  { name: "Research",  color: "red",    keywords: ["arxiv","acm","ieee","springer","nature","science","researchgate"] },
  { name: "AI",  color: "yellow",    keywords: ["Chatgpt","Grok","Deepseek","Claude","Copilot","ollama","huggingface","gemini"] }
];

// Normalize URL for duplicate detection
function normalizeUrl(u) {
  try {
    const url = new URL(u);
    // strip common tracking params
    const toStrip = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid","igsh","ref"];
    toStrip.forEach(k => url.searchParams.delete(k));
    url.hash = ""; // ignore fragments
    // remove trailing slash
    let href = url.href;
    if (href.endsWith("/")) href = href.slice(0, -1);
    return href;
  } catch {
    return u;
  }
}

async function getRules() {
  const { rules } = await chrome.storage.sync.get({ rules: DEFAULT_RULES });
  // Ensure color defaults exist
  return (rules && Array.isArray(rules) && rules.length) ? rules : DEFAULT_RULES;
}

async function groupTabsByRules({ collapse=false } = {}) {
  const rules = await getRules();
  const tabs = await chrome.tabs.query({}); // all tabs in all windows
  const byWindow = new Map();
  tabs.forEach(t => {
    if (!byWindow.has(t.windowId)) byWindow.set(t.windowId, []);
    byWindow.get(t.windowId).push(t);
  });

  for (const [windowId, wtabs] of byWindow.entries()) {
    // Create/track groups per window
    const groupsByName = {};
    // Find existing groups to reuse
    const existingGroups = await chrome.tabGroups.query({ windowId });
    existingGroups.forEach(g => { groupsByName[g.title] = g; });

    for (const t of wtabs) {
      if (!t.url) continue;
      const host = (() => { try { return new URL(t.url).hostname.toLowerCase(); } catch { return ""; } })();
      let matchedRule = null;
      for (const r of rules) {
        const hit = r.keywords.some(k => host.includes(k.toLowerCase()));
        if (hit) { matchedRule = r; break; }
      }
      if (matchedRule) {
        // ensure group exists
        let groupId;
        if (groupsByName[matchedRule.name]) {
          groupId = groupsByName[matchedRule.name].id;
        } else {
          groupId = await chrome.tabs.group({ tabIds: [t.id], createProperties: { windowId } });
          await chrome.tabGroups.update(groupId, { title: matchedRule.name, color: matchedRule.color || "blue" });
          // refresh cache
          groupsByName[matchedRule.name] = { id: groupId, title: matchedRule.name };
          continue; // already grouped this tab
        }
        await chrome.tabs.group({ tabIds: [t.id], groupId });
      }
    }

    if (collapse) {
      const groups = await chrome.tabGroups.query({ windowId });
      for (const g of groups) {
        try { await chrome.tabGroups.update(g.id, { collapsed: true }); } catch {}
      }
    }
  }
}

async function findDuplicates() {
  const tabs = await chrome.tabs.query({});
  const firstByNorm = new Map();
  const dups = []; // {original, duplicate}

  for (const t of tabs) {
    const norm = normalizeUrl(t.url || "");
    if (!firstByNorm.has(norm)) {
      firstByNorm.set(norm, t);
    } else {
      dups.push({ original: firstByNorm.get(norm), duplicate: t });
    }
  }
  return dups;
}

async function closeDuplicates({ keep = "oldest" } = {}) {
  const dups = await findDuplicates();
  // Group duplicates by normalized URL so we can choose to keep oldest/newest
  const byNorm = new Map();
  for (const { original, duplicate } of dups) {
    const norm = normalizeUrl(original.url || "");
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm).push(original, duplicate);
  }
  const toClose = new Set();
  for (const [norm, list] of byNorm.entries()) {
    // dedupe potential doubles in list
    const ids = Array.from(new Set(list.map(t => t.id)));
    // Fetch tab details again to get indices
    const fullTabs = await chrome.tabs.query({});
    const idToTab = new Map(fullTabs.map(t => [t.id, t]));
    const sorted = ids.map(id => idToTab.get(id)).filter(Boolean).sort((a,b)=> a.id - b.id);
    if (keep === "newest") {
      // close all but the one with highest id (heuristic)
      sorted.slice(0, -1).forEach(t => toClose.add(t.id));
    } else {
      // keep oldest
      sorted.slice(1).forEach(t => toClose.add(t.id));
    }
  }
  if (toClose.size) {
    try {
      await chrome.tabs.remove(Array.from(toClose));
    } catch(e) {
      console.warn("Failed to close some tabs:", e);
    }
  }
  return { closed: toClose.size };
}

// Auto grouping state
let autoGroupEnabled = false;

// Load auto grouping state on startup
chrome.storage.sync.get({ autoGroupEnabled: false }, (result) => {
  autoGroupEnabled = result.autoGroupEnabled;
});

// Listen for tab creation to auto group if enabled
chrome.tabs.onCreated.addListener(async (tab) => {
  if (autoGroupEnabled && tab.url) {
    // Small delay to allow tab to load
    setTimeout(async () => {
      await groupTabsByRules({ collapse: false });
    }, 1000);
  }
});

// Listen for tab updates (e.g., URL change)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (autoGroupEnabled && changeInfo.url) {
    // Small delay to allow tab to load
    setTimeout(async () => {
      await groupTabsByRules({ collapse: false });
    }, 1000);
  }
});

// Message router
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "GROUP_TABS") {
      await groupTabsByRules({ collapse: msg?.collapse === true });
      sendResponse({ ok: true });
    } else if (msg?.type === "FIND_DUPLICATES") {
      const d = await findDuplicates();
      sendResponse({ ok: true, duplicates: d.map(x => ({
        originalId: x.original.id, duplicateId: x.duplicate.id,
        url: x.duplicate.url, title: x.duplicate.title
      })) });
    } else if (msg?.type === "CLOSE_DUPLICATES") {
      const result = await closeDuplicates({ keep: msg?.keep || "oldest" });
      sendResponse({ ok: true, ...result });
    } else if (msg?.type === "GET_RULES") {
      const rules = await getRules();
      sendResponse({ ok: true, rules });
    } else if (msg?.type === "SAVE_RULES") {
      await chrome.storage.sync.set({ rules: msg.rules });
      sendResponse({ ok: true });
    } else if (msg?.type === "SET_AUTO_GROUP") {
      autoGroupEnabled = msg.enabled;
      await chrome.storage.sync.set({ autoGroupEnabled });
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, error: "Unknown message" });
    }
  })();
  // Return true to keep the message channel open for async response
  return true;
});

chrome.runtime.onInstalled.addListener(()=>{
  // Initialize defaults on fresh install
  chrome.storage.sync.get({ rules: null }, ({rules})=>{
    if (!rules) chrome.storage.sync.set({ rules: DEFAULT_RULES });
  });
});