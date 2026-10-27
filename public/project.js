const $ = (id) => document.getElementById(id);

function show(el) { if (el) el.classList.remove("hidden"); }
function hide(el) { if (el) el.classList.add("hidden"); }

function getToken() {
  return localStorage.getItem("cf_token") || "";
}

function authHeaders() {
  const h = {};
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function projectIdFromUrl() {
  const q = new URLSearchParams(window.location.search);
  return q.get("id") || "";
}

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return "$" + Number(n).toFixed(2);
}

function render(project) {
  const id = project.project_id;
  document.title = `CircuitFlow – ${id}`;

  $("title").textContent = id;
  $("prompt").textContent = project.user_intent?.raw_text || "";

  const status = project.status || "unknown";
  const badge = $("statusBadge");
  badge.textContent = status;
  badge.className = "badge " + (status === "needs_human" ? "warn" : status === "failed" ? "err" : "ok");

  $("statMcu").textContent = project.architecture?.mcu_family || "—";
  const bom = project.bom?.estimated_total;
  $("statBom").textContent = bom
    ? `${money(bom.low)}–${money(bom.high)}`
    : "—";
  const pcb = project.pcb;
  $("statPcb").textContent = pcb?.outline
    ? `${pcb.outline.width_mm}×${pcb.outline.height_mm} mm`
    : "—";
  $("statLayers").textContent = pcb?.layers != null ? String(pcb.layers) : "—";

  const base = `/api/agents/projects/${encodeURIComponent(id)}`;
  $("dlJson").href = `${base}/export`;
  $("dlStl").href = `${base}/enclosure.stl`;
  $("dlScad").href = `${base}/enclosure.scad`;
  $("dlSch").href = `${base}/kicad.sch`;
  $("dlPcb").href = `${base}/kicad.pcb`;

  $("constraintsOut").textContent = JSON.stringify(
    project.user_intent?.parsed_constraints || {},
    null,
    2
  );
  $("archOut").textContent = JSON.stringify(
    {
      mcu: project.architecture?.mcu_family,
      wireless: project.architecture?.wireless,
      power: project.architecture?.power_architecture,
      blocks: project.architecture?.blocks?.map((b) => b.name || b)
    },
    null,
    2
  );

  const body = $("bomBody");
  const items = project.bom?.line_items || [];
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">No line items</td></tr>';
  } else {
    body.innerHTML = items
      .map(
        (i) => `<tr>
        <td>${escapeHtml(i.ref || "")}</td>
        <td>${escapeHtml(i.mpn || "")}</td>
        <td>${escapeHtml(i.description || "")}</td>
        <td>${money(i.unit_price_usd)}</td>
        <td>${escapeHtml(i.pricing_source || "")}</td>
      </tr>`
      )
      .join("");
  }

  $("reviewsOut").textContent = JSON.stringify(
    {
      needs_human: project.status === "needs_human" || !!project.escalation,
      human_decision: project.escalation?.human_decision,
      reviews: project.reviews
    },
    null,
    2
  );
  $("rawOut").textContent = JSON.stringify(project, null, 2);

  $("dlBomCsv").onclick = () => downloadBomCsv(id, items);
  $("copyId").onclick = async () => {
    try {
      await navigator.clipboard.writeText(id);
      $("copyId").textContent = "Copied!";
      setTimeout(() => { $("copyId").textContent = "Copy project ID"; }, 1200);
    } catch {
      prompt("Project ID", id);
    }
  };

  hide($("loading"));
  hide($("error"));
  show($("content"));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBomCsv(id, items) {
  const header = ["ref", "category", "mpn", "manufacturer", "description", "qty", "unit_price_usd", "pricing_source"];
  const rows = [header.join(",")];
  items.forEach((i) => {
    rows.push(
      [
        i.ref,
        i.category,
        i.mpn,
        i.manufacturer,
        `"${String(i.description || "").replace(/"/g, '""')}"`,
        i.qty ?? 1,
        i.unit_price_usd ?? "",
        i.pricing_source || ""
      ].join(",")
    );
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${id}_bom.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function main() {
  const id = projectIdFromUrl();
  if (!id) {
    hide($("loading"));
    $("error").textContent = "Missing project id. Open from Designer list or use ?id=proj_…";
    show($("error"));
    return;
  }
  try {
    const res = await fetch(`/api/agents/projects/${encodeURIComponent(id)}`, {
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
    render(data.project);
  } catch (err) {
    hide($("loading"));
    $("error").textContent = err.message || String(err);
    show($("error"));
  }
}

main();
