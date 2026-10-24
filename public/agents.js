const $ = (id) => document.getElementById(id);

const promptEl = $("prompt");
const runBtn = $("runBtn");
const statusBadge = $("statusBadge");
const emptyState = $("emptyState");
const loadingState = $("loadingState");
const errorState = $("errorState");
const results = $("results");

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function setBadge(text, kind) {
  statusBadge.textContent = text;
  statusBadge.className = "badge" + (kind ? " " + kind : "");
}

async function loadStatus() {
  try {
    const res = await fetch("/api/agents/status");
    const data = await res.json();
    if (data.success) {
      const llm = data.llm_enabled ? "LLM on" : "rules only";
      setBadge(`v${data.version || "1.5"} · ${llm} · ${data.checkpointer || "mem"}`, "ok");
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
  statusEl.className = "badge " + (status === "needs_human" ? "warn" : status === "approved" ? "ok" : "ok");

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
    mcu: p.firmware?.board_support?.mcu_family,
    framework: p.firmware?.board_support?.framework
  }, null, 2);
  $("encOut").textContent = JSON.stringify(s.enclosure || p.enclosure?.outer_mm || {}, null, 2);
  $("reviewsOut").textContent = JSON.stringify({
    review_count: s.reviews ?? p.reviews?.length,
    needs_human: s.needs_human ?? !!p.escalation,
    human_decision: p.escalation?.human_decision,
    reviews: p.reviews,
    escalation_reasons: p.escalation?.summary?.reasons_for_escalation
  }, null, 2);
  $("rawOut").textContent = JSON.stringify(p, null, 2);

  // Human review controls
  const hr = $("humanReview");
  if (hr) {
    if (p.status === "needs_human" || (p.escalation && !p.escalation.human_decision)) {
      show(hr);
      hr.dataset.projectId = p.project_id;
    } else {
      hide(hr);
    }
  }

  const exportLink = $("exportLink");
  if (exportLink && p.project_id) {
    exportLink.href = `/api/agents/projects/${p.project_id}/export`;
    show(exportLink);
  }

  hide(emptyState);
  hide(loadingState);
  hide(errorState);
  show(results);
}

async function runPipeline() {
  const prompt = promptEl.value.trim();
  if (!prompt) { promptEl.focus(); return; }

  runBtn.disabled = true;
  hide(emptyState); hide(results); hide(errorState); show(loadingState);

  try {
    const res = await fetch("/api/agents/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  const reviewed_by = $("reviewBy")?.value || "web-ui";
  try {
    const res = await fetch(`/api/agents/projects/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comments, reviewed_by })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Review failed");
    const loaded = await fetch(`/api/agents/projects/${id}`);
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
    const res = await fetch("/api/agents/projects");
    const data = await res.json();
    const projects = data.projects || [];
    if (!projects.length) {
      list.innerHTML = '<li class="empty-msg">No saved projects yet</li>';
      return;
    }
    list.innerHTML = projects.slice().reverse().map(p => `
      <li data-id="${p.project_id}">
        <span class="id">${p.project_id}</span>
        <span class="prompt">${(p.prompt || "").replace(/</g, "&lt;")}</span>
        <span class="badge ${p.status === "needs_human" ? "warn" : "ok"}">${p.status || ""}</span>
      </li>`).join("");

    list.querySelectorAll("li[data-id]").forEach(li => {
      li.addEventListener("click", async () => {
        const id = li.getAttribute("data-id");
        hide(emptyState); hide(results); hide(errorState); show(loadingState);
        try {
          const res = await fetch(`/api/agents/projects/${id}`);
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "Load failed");
          renderSummary({ success: true, project: data.project, status: data.project.status, project_id: id });
        } catch (err) {
          hide(loadingState);
          errorState.textContent = err.message;
          show(errorState);
        }
      });
    });
  } catch {
    list.innerHTML = '<li class="empty-msg">Could not load projects</li>';
  }
}

runBtn.addEventListener("click", runPipeline);
$("refreshProjects").addEventListener("click", loadProjects);
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

loadStatus();
loadProjects();
