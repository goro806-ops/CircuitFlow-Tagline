const $ = (id) => document.getElementById(id);

const promptEl = $("prompt");
const runBtn = $("runBtn");
const statusBadge = $("statusBadge");
const emptyState = $("emptyState");
const loadingState = $("loadingState");
const errorState = $("errorState");
const results = $("results");

const TOKEN_KEY = "cf_token";
const USER_KEY = "cf_user";

function show(el) { if (el) el.classList.remove("hidden"); }
function hide(el) { if (el) el.classList.add("hidden"); }

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}

function setSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  updateAuthUI();
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  updateAuthUI();
}

function authHeaders(extra = {}) {
  const h = { ...extra };
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

function updateAuthUI() {
  const user = getUser();
  const chip = $("userChip");
  const googleBtn = $("googleBtn");
  const logoutBtn = $("logoutBtn");
  if (user && getToken()) {
    if (chip) {
      chip.textContent = user.name || user.email || "Signed in";
      show(chip);
    }
    if (googleBtn) googleBtn.style.display = "none";
    if (logoutBtn) show(logoutBtn);
  } else {
    if (chip) hide(chip);
    if (logoutBtn) hide(logoutBtn);
  }
}

function setBadge(text, kind) {
  statusBadge.textContent = text;
  statusBadge.className = "badge" + (kind ? " " + kind : "");
}

function handleOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth_error")) {
    alert("Google sign-in failed: " + params.get("auth_error"));
    window.history.replaceState({}, "", "/agents.html");
    return;
  }
  if (params.get("google_auth") === "1" && params.get("token")) {
    setSession(params.get("token"), {
      name: params.get("name") || "",
      email: params.get("email") || ""
    });
    window.history.replaceState({}, "", "/agents.html");
  }
}

async function loadStatus() {
  try {
    const res = await fetch("/api/agents/status");
    const data = await res.json();
    if (data.success) {
      const llm = data.llm_enabled ? "LLM on" : "rules";
      setBadge(`v${data.version || "?"} · ${llm}`, "ok");
      const googleBtn = $("googleBtn");
      if (googleBtn) {
        if (data.auth && data.auth.google_configured) {
          googleBtn.style.display = getToken() ? "none" : "inline-flex";
        } else {
          googleBtn.style.display = "none";
        }
      }
    } else setBadge("API error", "err");
  } catch {
    setBadge("offline", "err");
  }
}

function renderSummary(data) {
  const p = data.project || {};
  const s = data.summary || {};

  $("resultTitle").textContent = p.project_id || data.project_id || "Project";
  $("resultMeta").textContent = p.user_intent?.raw_text || "";

  const status = p.status || data.status || "unknown";
  const statusEl = $("resultStatus");
  statusEl.textContent = status;
  statusEl.className = "badge " + (status === "needs_human" ? "warn" : status === "failed" ? "err" : "ok");

  $("constraintsOut").textContent = JSON.stringify(s.constraints || p.user_intent?.parsed_constraints || {}, null, 2);
  $("archOut").textContent = JSON.stringify({
    mcu: s.architecture_mcu || p.architecture?.mcu_family,
    wireless: p.architecture?.wireless,
    power: p.architecture?.power_architecture,
    blocks: p.architecture?.blocks?.map(b => b.name)
  }, null, 2);
  $("bomOut").textContent = JSON.stringify({
    estimate: s.bom_estimate || p.bom?.estimated_total,
    target: p.bom?.target_cost,
    meets_target: p.bom?.meets_target,
    items: p.bom?.line_items?.length,
    source: p.bom?.source
  }, null, 2);
  $("pcbOut").textContent = JSON.stringify(s.pcb || (p.pcb && {
    size_mm: `${p.pcb.outline.width_mm}x${p.pcb.outline.height_mm}`,
    layers: p.pcb.layers,
    placements: p.pcb.placements?.length,
    issues: p.pcb.issues
  }) || {}, null, 2);
  $("fwOut").textContent = JSON.stringify({
    modules: s.firmware_modules || p.firmware?.modules?.length,
    mcu: p.firmware?.board_support?.mcu_family
  }, null, 2);
  $("encOut").textContent = JSON.stringify(s.enclosure || p.enclosure?.outer_mm || {}, null, 2);
  $("reviewsOut").textContent = JSON.stringify({
    review_count: s.reviews ?? p.reviews?.length,
    needs_human: s.needs_human ?? !!p.escalation,
    human_decision: p.escalation?.human_decision,
    reviews: p.reviews
  }, null, 2);
  $("rawOut").textContent = JSON.stringify(p, null, 2);

  const hr = $("humanReview");
  if (hr) {
    if (p.status === "needs_human" || (p.escalation && !p.escalation.human_decision)) {
      show(hr);
      hr.dataset.projectId = p.project_id;
    } else hide(hr);
  }

  const id = p.project_id;
  const exportLink = $("exportLink");
  const stlLink = $("stlLink");
  const kicadLink = $("kicadLink");
  const viewLink = $("viewProjectLink");
  if (id) {
    if (exportLink) { exportLink.href = `/api/agents/projects/${id}/export`; show(exportLink); }
    if (stlLink) { stlLink.href = `/api/agents/projects/${id}/enclosure.stl`; show(stlLink); }
    if (kicadLink) { kicadLink.href = `/api/agents/projects/${id}/kicad.sch`; show(kicadLink); }
    if (viewLink) {
      viewLink.href = `/project.html?id=${encodeURIComponent(id)}`;
      show(viewLink);
    }
  }

  hide(emptyState); hide(loadingState); hide(errorState); show(results);
}

async function runPipeline() {
  const prompt = promptEl.value.trim();
  if (!prompt) { promptEl.focus(); return; }

  runBtn.disabled = true;
  hide(emptyState); hide(results); hide(errorState); show(loadingState);

  try {
    const res = await fetch("/api/agents/run", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
    renderSummary(data);
    loadProjects();
  } catch (err) {
    hide(loadingState);
    errorState.textContent = err.message || String(err);
    show(errorState);
  } finally {
    runBtn.disabled = false;
  }
}

async function submitHumanReview(decision) {
  const hr = $("humanReview");
  const id = hr?.dataset?.projectId;
  if (!id) return;
  const comments = $("reviewComments")?.value || "";
  const reviewed_by = $("reviewBy")?.value || getUser()?.name || "web-ui";
  try {
    const res = await fetch(`/api/agents/projects/${id}/review`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ decision, comments, reviewed_by })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Review failed");
    const loaded = await fetch(`/api/agents/projects/${id}`, { headers: authHeaders() });
    const body = await loaded.json();
    renderSummary({ success: true, project: body.project, status: body.project.status, project_id: id });
    loadProjects();
  } catch (err) {
    alert(err.message);
  }
}

async function loadProjects() {
  const list = $("projectList");
  try {
    const res = await fetch("/api/agents/projects", { headers: authHeaders() });
    const data = await res.json();
    const projects = data.projects || [];
    if (!projects.length) {
      list.innerHTML = '<li class="empty-msg">No saved projects yet</li>';
      return;
    }
    list.innerHTML = projects.map(p => `
      <li data-id="${p.project_id}">
        <span class="id">${p.project_id}</span>
        <span class="prompt">${(p.prompt || "").replace(/</g, "&lt;")}</span>
        <span class="badge ${p.status === "needs_human" ? "warn" : p.status === "failed" ? "err" : "ok"}">${p.status || ""}</span>
      </li>`).join("");

    list.querySelectorAll("li[data-id]").forEach(li => {
      li.addEventListener("click", () => {
        const id = li.getAttribute("data-id");
        window.location.href = `/project.html?id=${encodeURIComponent(id)}`;
      });
    });
  } catch {
    list.innerHTML = '<li class="empty-msg">Could not load projects</li>';
  }
}

runBtn.addEventListener("click", runPipeline);
$("refreshProjects").addEventListener("click", loadProjects);
const logoutBtn = $("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", () => { clearSession(); loadProjects(); });

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    promptEl.value = btn.getAttribute("data-prompt") || "";
    promptEl.focus();
  });
});
promptEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runPipeline();
});

["approveBtn", "changesBtn", "rejectBtn"].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("click", () => {
    const map = { approveBtn: "approved", changesBtn: "changes_requested", rejectBtn: "rejected" };
    submitHumanReview(map[id]);
  });
});

handleOAuthReturn();
updateAuthUI();
loadStatus();
loadProjects();
