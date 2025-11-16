# Entab-D
An Search Engine specifically Chrome for now Extention that helps in Sorting of tabs.


# Entab-D 🚀

A simple Chrome extension to help you instantly sort your messy browser tabs and find what you need.

---

## 1. The Problem (Business Understanding)

> We've all been there. Dozens of tabs open. You're researching, working, or shopping, and your browser becomes a cluttered mess. It's impossible to find anything, and productivity grinds to a halt.

**The goal of this project** is to fix that "tab clutter" with a one-click solution that organizes your open tabs.

## 2. The Data (Data Understanding)

The "data" for this extension is your live browser state, which we access using the Chrome Extensions API.

* **Source:** `chrome.tabs` API.
* **Key Data Structure:** The `chrome.tabs.Tab` object.
* **Important Properties:**
    * `id` (number): The tab's unique ID.
    * `windowId` (number): The window the tab lives in.
    * `title` (string): The text you see on the tab.
    * `url` (string): The web address.
    * `index` (number): The tab's current position.

## 3. Getting Data Ready (Data Preparation)

Before we can sort, we need to grab and clean the data.

1.  **Retrieve:** We use `chrome.tabs.query()` to get an `Array` of all open `Tab` objects.
2.  **Filter:** The user might only want to sort the *current* window. We filter the list based on the `windowId`.
3.  **Transform:** To sort by website, we parse the `url` (e.g., "docs.google.com/spreadsheets/...") to get the root domain ("google.com"). This domain becomes our sorting key.

## 4. The Sorting Logic (Modeling)

This is the "magic" of the extension. The core logic lives in `service_worker.js`.

1.  A user clicks the "Sort" button in the popup (`popup.html`).
2.  `popup.js` sends a message to the `service_worker.js`.
3.  The service worker gets the list of tabs (from Step 3).
4.  It runs a JavaScript `.sort()` function on the array, grouping them based on the domain (or other criteria).
5.  Finally, it iterates through the newly sorted list and physically moves the tabs in your browser using `chrome.tabs.move()` and `chrome.tabs.group()`.

---

## 5. Setup & Usage (Deployment)

This is deployed as an "unpacked" Chrome extension.

### 🛠️ Setup Guide

1.  **Download:** Clone or download this repository as a ZIP and unzip it to a folder you'll remember.
2.  **Open Extensions:** In Chrome, go to `chrome://extensions`.
3.  **Enable Developer Mode:** Find the **Developer mode** toggle in the top-right corner and switch it **ON**.
4.  **Load the Extension:** Click the **Load unpacked** button that appears.
5.  **Select Folder:** In the file dialog, select the `Entab-D` folder you created in step 1.

The Entab-D icon will now appear in your Chrome toolbar!

### 🖱️ Usage

1.  Click the **Entab-D icon** in your toolbar.
2.  Click the "Sort Tabs" button.
3.  Watch your tabs organize themselves.

---

## 6. Key Files & Tech

* `manifest.json`: The extension's "brain." It tells Chrome what files to use, what permissions it needs (like `tabs`, `storage`, `tabGroups`), and where the popup is.
* `service_worker.js`: The background script that does all the heavy lifting (querying, sorting, and moving tabs).
* `popup.html` / `popup.js` / `popup.css`: The small window that appears when you click the extension icon.
* `options.html` / `options.js`: The (optional) settings page for the extension.

**Main Data Types Used:**
* **`Object`**: For the `chrome.tabs.Tab` data.
* **`Array`**: To hold the list of all tabs: `[Tab, Tab, Tab, ...]`.
* **`String`**: For URLs and titles.
* **`Integer`**: For tab and window IDs.

# Project Tracker: Bugs and Roadmap

This document outlines current known issues and planned future enhancements.

## 🐞 Current Bugs

### 1. Tabs Not Ungrouping on Rule Update
* **Issue:** When a group's rules are changed, tabs already in that group are not re-evaluated.
* **Result:** Tabs that no longer match the *new* rules remain in the group incorrectly.
    * **Example:** If a group's rule is changed from `url contains "google.com"` to `url contains "bing.com"`, any existing "google.com" tabs are not automatically removed.

### 2. Extension Toggle Ignores Existing Tabs
* **Issue:** When the extension is enabled, it does not scan or group tabs that are already open.
* **Result:** The grouping logic only applies to *newly* created tabs, forcing users to manually organize their existing session.

---

## 🚀 Future Enhancements (Roadmap)

### 1. Cross-Window Group Consolidation
* **Goal:** Prevent duplicate groups across multiple browser windows.
* **Concept:** Instead of creating isolated groups in each window (e.g., a "Work" group in Window 1 and another in Window 2), the extension should scan *all* windows and consolidate matching tabs into a *single* group in *one* window.
* **Challenge:** Requires a clear strategy for choosing the "target" window and moving tabs without disrupting the user's workflow.

### 2. Rule Conflict Indicator
* **Goal:** Notify users when their rules overlap.
* **Concept:** Implement a UI indicator (e.g., a tooltip or icon) when a single tab matches the criteria for *multiple* different groups.
* **Result:** This helps users debug their own rule sets and understand why a tab might be grouped in an unexpected way, leading to more predictable behavior.
