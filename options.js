function send(msg) {
  return new Promise((res) => chrome.runtime.sendMessage(msg, res));
}

const COLORS = ["blue","cyan","green","yellow","red","pink","purple","orange","grey"];

function ruleTemplate(rule={}, index=0) {
  const name = rule.name || "";
  const color = rule.color || "blue";
  const keywords = Array.isArray(rule.keywords) ? rule.keywords.join(", ") : (rule.keywords || "");
  return `
    <div class="rule" data-index="${index}">
      <div class="row">
        <label>Group name</label>
        <input type="text" class="name" value="${name}" placeholder="e.g., Study">
        <label>Color</label>
        <select class="color">
          ${COLORS.map(c => `<option value="${c}" ${c===color?'selected':''}>${c}</option>`).join('')}
        </select>
        <button class="remove btn-secondary">Remove</button>
      </div>
      <div class="row">
        <label>Keywords (comma-separated domains/phrases)</label>
        <input type="text" class="keywords wide" value="${keywords}" placeholder="e.g., leetcode, geeksforgeeks">
      </div>
    </div>
  `;
}

async function loadRules() {
  const res = await send({ type: "GET_RULES" });
  const rules = res?.rules || [];
  const ruleselement = document.getElementById('rules');
  ruleselement.innerHTML = rules.map((r, i) => ruleTemplate(r, i)).join('');

  ruleselement.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.rule').remove();
    });
  });
}

function collectRules() {
  const ruleforms = Array.from(document.querySelectorAll('.rule'));
  const rules = ruleforms.map(n => ({
    name: n.querySelector('.name').value.trim() || "Group",
    color: n.querySelector('.color').value,
    keywords: n.querySelector('.keywords').value.split(',').map(x=>x.trim()).filter(Boolean)
  })).filter(r => r.keywords.length);
  return rules;
}

// // Simple fetch for Python backend
// async function fetchBackend(endpoint, method='GET', data=null) {
//   const url = `http://127.0.0.1:5055${endpoint}`;
//   const options = { method };
//   if (data) {
//     options.headers = { 'Content-Type': 'application/json' };
//     options.body = JSON.stringify(data);
//   }
//   try {
//     const response = await fetch(url, options);
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return await response.json();
//   } catch (error) {
//     throw new Error(`Backend not available: ${error.message}`);
//   }
// }

document.addEventListener('DOMContentLoaded', async () => {
  await loadRules();

  document.getElementById('addRule').addEventListener('click', () => {
    const ruleselement = document.getElementById('rules');
    ruleselement.insertAdjacentHTML('beforeend', ruleTemplate({}, Date.now()));
    ruleselement.querySelectorAll('.remove').forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = "1";
        btn.addEventListener('click', () => btn.closest('.rule').remove());
      }
    });
  });

  document.getElementById('save').addEventListener('click', async () => {
    const rules = collectRules();
    await send({ type: "SAVE_RULES", rules });
    const status = document.getElementById('status');
    status.textContent = "Rules saved locally!";
    setTimeout(() => status.textContent = "", 2000);
  });
});

//   document.getElementById('syncFromBackend').addEventListener('click', async () => {
//     const syncStatus = document.getElementById('syncStatus');
//     try {
//       syncStatus.textContent = "Loading from backend...";
//       const data = await fetchBackend('/rules');
//       const rules = data.rules || [];
//       await send({ type: "SAVE_RULES", rules });
//       await loadRules();
//       syncStatus.textContent = "Loaded from backend!";
//     } catch (error) {
//       syncStatus.textContent = error.message;
//       syncStatus.style.color = '#dc3545';
//     }
//     setTimeout(() => {
//       syncStatus.textContent = "";
//       syncStatus.style.color = '#28a745';
//     }, 3000);
//   });

//   document.getElementById('syncToBackend').addEventListener('click', async () => {
//     const syncStatus = document.getElementById('syncStatus');
//     try {
//       syncStatus.textContent = "Saving to backend...";
//       const rules = collectRules();
//       await fetchBackend('/rules', 'POST', { rules });
//       syncStatus.textContent = "Saved to backend!";
//     } catch (error) {
//       syncStatus.textContent = error.message;
//       syncStatus.style.color = '#dc3545';
//     }
//     setTimeout(() => {
//       syncStatus.textContent = "";
//       syncStatus.style.color = '#28a745';
//     }, 3000);
//   });

