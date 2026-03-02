// popup.js — updated to match new popup.html / popup.css class names

function send(msg) {
  return new Promise((res) => chrome.runtime.sendMessage(msg, res));
}

const $ = (sel) => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', async () => {
  const groupBtn = $('#groupTabs');
  const collapse = $('#collapseGroups');
  const scanDup = $('#scanDup');
  const closeDup = $('#closeDup');
  const keepPref = $('#keepPref');
  const dupList = $('#dupList');
  const autoGroupToggle = $('#autoGroupToggle');

  // Load auto grouping state
  const { autoGroupEnabled = false } = await chrome.storage.sync.get({ autoGroupEnabled: false });
  autoGroupToggle.checked = autoGroupEnabled;

  // Save auto grouping state on change
  autoGroupToggle.addEventListener('change', async () => {
    await chrome.storage.sync.set({ autoGroupEnabled: autoGroupToggle.checked });
    await send({ type: "SET_AUTO_GROUP", enabled: autoGroupToggle.checked });
    // Provide feedback
  });

  // Handle Predictions
  const pSection = $('#suggestions_section');
  const pList = $('#predictList');

  const predictResp = await send({ type: "GET_PREDICTIONS" });
  if (predictResp && predictResp.predictions && predictResp.predictions.length > 0) {
    pSection.style.display = 'block';
    pList.innerHTML = '';
    predictResp.predictions.forEach(p => {
      const div = document.createElement('div');
      div.className = 'list_item';
      div.style.cursor = 'pointer';
      div.innerText = `🔄 Switch to: ${p.title || p.url}`;
      div.addEventListener('click', async () => {
        await chrome.tabs.update(p.id, { active: true });
        await chrome.windows.update(p.windowId, { focused: true });
        window.close();
      });
      pList.appendChild(div);
    });
  }

  groupBtn.addEventListener('click', async () => {
    groupBtn.disabled = true;
    groupBtn.textContent = 'Grouping...';
    await send({ type: "GROUP_TABS", collapse: collapse.checked });
    groupBtn.disabled = false;
    groupBtn.textContent = 'Group Tabs Now';
    window.close();
  });

  scanDup.addEventListener('click', async () => {
    scanDup.disabled = true;
    scanDup.textContent = 'Scanning...';
    const resp = await send({ type: "FIND_DUPLICATES" });
    dupList.innerHTML = '';
    if (resp?.duplicates?.length) {
      // show the duplicates container (CSS uses .list_container)
      dupList.style.display = 'block';
      resp.duplicates.forEach(d => {
        const div = document.createElement('div');
        // updated class name to match popup.css
        div.className = 'list_item';
        div.textContent = `${d.title || '(no title)'} — ${d.url}`;
        dupList.appendChild(div);
      });
      closeDup.disabled = false;
    } else {
      dupList.style.display = 'block';
      dupList.textContent = 'No duplicates found 🎉';
      closeDup.disabled = true;
    }
    scanDup.disabled = false;
    scanDup.textContent = 'Scan for Duplicates';
  });

  closeDup.addEventListener('click', async () => {
    closeDup.disabled = true;
    closeDup.textContent = 'Closing...';
    const keep = keepPref.value;
    const resp = await send({ type: "CLOSE_DUPLICATES", keep });
    dupList.innerHTML = `Closed ${resp?.closed ?? 0} duplicate tab(s).`;
    closeDup.disabled = true;
    closeDup.textContent = 'Close Duplicates';
  });
});
