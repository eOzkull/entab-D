const Predictor = {
    // Store chronological history of tab switches
    // format: [ { timestamp, url, title, tabId } ]
    history: [],
    MAX_HISTORY: 500,

    // Track the most recent active tab to build transitions
    // format: { fromUrl: toUrl, score: number }
    transitions: {},

    async init() {
        const data = await chrome.storage.local.get(['predictiveToggle', 'tabHistory', 'tabTransitions']);
        if (data.predictiveToggle === undefined) {
            await chrome.storage.local.set({ predictiveToggle: true });
        }
        this.history = data.tabHistory || [];
        this.transitions = data.tabTransitions || {};
    },

    async recordTransition(fromUrl, toUrl) {
        const data = await chrome.storage.local.get(['predictiveToggle']);
        if (!data.predictiveToggle || !fromUrl || !toUrl || fromUrl === toUrl) return;

        // Normalize URLs (strip queries/hashes for better matching)
        const normalize = url => {
            try {
                const p = new URL(url);
                return p.hostname + p.pathname;
            } catch {
                return url;
            }
        };

        const normFrom = normalize(fromUrl);
        const normTo = normalize(toUrl);

        if (!this.transitions[normFrom]) {
            this.transitions[normFrom] = {};
        }

        this.transitions[normFrom][normTo] = (this.transitions[normFrom][normTo] || 0) + 1;

        // Keep it clean
        await chrome.storage.local.set({ tabTransitions: this.transitions });
    },

    async predictNextTabs(currentUrl, openTabs) {
        const data = await chrome.storage.local.get(['predictiveToggle']);
        if (!data.predictiveToggle) return [];

        const normalize = url => {
            try {
                const p = new URL(url);
                return p.hostname + p.pathname;
            } catch {
                return url;
            }
        };

        const normCurrent = normalize(currentUrl);
        const possibleTransitions = this.transitions[normCurrent] || {};

        // Sort by frequency
        const sortedTargets = Object.entries(possibleTransitions)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        if (sortedTargets.length === 0) return [];

        // Find which open tabs match the predictions
        const predictedTabs = [];
        for (const target of sortedTargets) {
            const match = openTabs.find(t => normalize(t.url) === target);
            if (match) {
                predictedTabs.push(match);
            }
        }

        return predictedTabs;
    }
};

export default Predictor;
