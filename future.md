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