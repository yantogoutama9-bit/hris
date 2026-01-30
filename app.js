/* HRIS Online Sync (Supabase) - Single Admin Login
   - CRUD employees
   - Resign date => status auto nonaktif (trigger DB)
   - Filter unit kerja
   - Grafik gender + turnover
   - Export Excel (CSV)
*/

const SUPABASE_URL = "https://iygjugvybdocwdlsmtdg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z2p1Z3Z5YmRvY3dkbHNtdGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDAzNTUsImV4cCI6MjA4NTMxNjM1NX0.eRn9ILl2w4I_VGLfijPfrikKEv5jFOfVDT-dKft81HM";

const UNITS = [
  "Batik Omah Laweyan",
  "Batik Omah Laweyan Cemani",
  "Uniform",
  "Saudagar Laweyan",
  "Solo Baru",
  "Digital Creative",
  "Umroh",
  "Holding",
];

let supabase = null;
let sessionUser = null;

let employees = [];
let editingId = null;

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("id-ID") : "-");
const num = (v) => Number(v || 0);

const netPay = (e) =>
  num(e.base_salary) + num(e.allowance) + num(e.overtime) + num(e.business_trip) - num(e.deduction);

function setHint(msg) {
  $("hintBox").innerHTML = msg || "";
}

function setLoginStatus(msg) {
  $("loginStatus").textContent = msg || "";
}

function enableAppUI(enabled) {
  $("btnLogout").disabled = !enabled;
  $("btnSave").disabled = !enabled;
  $("btnClear").disabled = !enabled;
  $("btnExportExcel").disabled = !enabled;
  $("search").disabled = !enabled;
  $("filterUnit").disabled = !enabled;

  const inputs = [
    "employee_no","name","birth_date","gender","unit_work","position",
    "join_date","resign_date","phone","email","address",
    "base_salary","allowance","overtime","business_trip","deduction"
  ];
  inputs.forEach(id => $(id).disabled = !enabled);
}

function fillUnits() {
  const sel = $("unit_work");
  sel.innerHTML = `<option value="">-- pilih --</option>` + UNITS.map(u => `<option value="${u}">${u}</option>`).join("");

  const filter = $("filterUnit");
  filter.innerHTML =
    `<option value="">Semua Unit</option>` +
    UNITS.map(u => `<option value="${u}">${u}</option>`).join("");
}

function readForm() {
  const resign = $("resign_date").value || null;
  return {
    employee_no: $("employee_no").value.trim(),
    name: $("name").value.trim(),
    birth_date: $("birth_date").value || null,
    gender: $("gender").value || null,
    unit_work: $("unit_work").value,
    position: $("position").value.trim() || null,
    join_date: $("join_date").value || null,
    resign_date: resign,
    phone: $("phone").value.trim() || null,
    email: $("email").value.trim() || null,
    address: $("address").value.trim() || null,
    base_salary: num($("base_salary").value),
    allowance: num($("allowance").value),
    overtime: num($("overtime").value),
    business_trip: num($("business_trip").value),
    deduction: num($("deduction").value),
  };
}

function writeForm(e) {
  $("employee_no").value = e?.employee_no || "";
  $("name").value = e?.name || "";
  $("birth_date").value = e?.birth_date || "";
  $("gender").value = e?.gender || "";
  $("unit_work").value = e?.unit_work || "";
  $("position").value = e?.position || "";
  $("join_date").value = e?.join_date || "";
  $("resign_date").value = e?.resign_date || "";
  $("phone").value = e?.phone || "";
  $("email").value = e?.email || "";
  $("address").value = e?.address || "";
  $("base_salary").value = num(e?.base_salary);
  $("allowance").value = num(e?.allowance);
  $("overtime").value = num(e?.overtime);
  $("business_trip").value = num(e?.business_trip);
  $("deduction").value = num(e?.deduction);

  // status (read-only) berdasarkan resign_date (trigger juga handle)
  $("is_active").value = e?.resign_date ? "Tidak Aktif" : "Aktif";
}

function clearForm() {
  editingId = null;
  writeForm({
    base_salary: 0,
    allowance: 0,
    overtime: 0,
    business_trip: 0,
    deduction: 0,
  });
  setHint("Siap input data karyawan baru ✨");
}

// ===== Supabase Loader =====
async function loadSupabaseClient() {
  // load via CDN runtime
  if (window.supabase?.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return;
  }

  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  sessionUser = data?.session?.user || null;
  enableAppUI(!!sessionUser);
  $("btnLogin").disabled = !!sessionUser;

  if (sessionUser) {
    setLoginStatus(`Login: ${sessionUser.email}`);
    await loadEmployees();
  } else {
    setLoginStatus("Belum login");
    employees = [];
    renderAll();
  }
}

// ===== Data =====
async function loadEmployees() {
  setHint("Loading data dari server...");
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setHint(`❌ Gagal load data: ${error.message}`);
    return;
  }

  employees = data || [];
  renderAll();
  setHint("✅ Data berhasil dimuat");
}

async function saveEmployee() {
  const payload = readForm();

  if (!payload.employee_no) return alert("Nomor Karyawan wajib diisi!");
  if (!payload.name) return alert("Nama wajib diisi!");
  if (!payload.unit_work) return alert("Unit Kerja wajib dipilih!");

  try {
    setHint("Menyimpan...");

    if (!editingId) {
      const { error } = await supabase.from("employees").insert(payload);
      if (error) throw error;
      setHint("✅ Karyawan baru ditambahkan");
    } else {
      const { error } = await supabase.from("employees").update(payload).eq("id", editingId);
      if (error) throw error;
      setHint("✅ Data karyawan berhasil diupdate");
    }

    clearForm();
    await loadEmployees();
  } catch (e) {
    console.error(e);
    alert("Gagal simpan: " + (e.message || e));
    setHint("❌ Gagal simpan");
  }
}

async function deleteEmployee(id) {
  if (!confirm("Yakin hapus data karyawan ini?")) return;
  try {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) throw error;
    setHint("🗑️ Data dihapus");
    await loadEmployees();
  } catch (e) {
    console.error(e);
    alert("Gagal hapus: " + (e.message || e));
  }
}

// ===== Render =====
function getFilteredEmployees() {
  const q = ($("search").value || "").trim().toLowerCase();
  const unit = $("filterUnit").value || "";

  return employees.filter((e) => {
    const matchQ =
      !q ||
      (e.name || "").toLowerCase().includes(q) ||
      (e.employee_no || "").toLowerCase().includes(q) ||
      (e.unit_work || "").toLowerCase().includes(q);

    const matchUnit = !unit || e.unit_work === unit;
    return matchQ && matchUnit;
  });
}

function renderKPIs(list) {
  const total = list.length;
  const active = list.filter((e) => e.is_active).length;
  const inactive = total - active;

  $("kpiTotal").textContent = total;
  $("kpiActive").textContent = active;
  $("kpiInactive").textContent = inactive;
}

function renderTable(list) {
  const tb = $("tbody");
  tb.innerHTML = "";

  list.forEach((e) => {
    const tr = document.createElement("tr");

    const statusPill = e.is_active
      ? `<span class="pill ok">Aktif</span>`
      : `<span class="pill no">Tidak Aktif</span>`;

    const net = netPay(e);

    tr.innerHTML = `
      <td>${e.employee_no || "-"}</td>
      <td>${e.name || "-"}</td>
      <td>${e.gender || "-"}</td>
      <td>${e.unit_work || "-"}</td>
      <td>${e.position || "-"}</td>
      <td>${fmtDate(e.join_date)}</td>
      <td>${fmtDate(e.resign_date)}</td>
      <td>${statusPill}</td>
      <td>Rp ${net.toLocaleString("id-ID")}</td>
      <td class="row">
        <button class="btn" data-act="edit" data-id="${e.id}">Edit</button>
        <button class="btn danger" data-act="del" data-id="${e.id}">Hapus</button>
      </td>
    `;

    tb.appendChild(tr);
  });

  tb.querySelectorAll("button[data-act='edit']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const emp = employees.find((x) => x.id === id);
      if (!emp) return;
      editingId = id;
      writeForm(emp);
      setHint(`✏️ Mode edit: ${emp.name} (${emp.employee_no})`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  tb.querySelectorAll("button[data-act='del']").forEach((btn) => {
    btn.addEventListener("click", () => deleteEmployee(btn.getAttribute("data-id")));
  });
}

function drawBarChart(canvasId, labels, values) {
  const c = $(canvasId);
  const ctx = c.getContext("2d");

  // clear
  ctx.clearRect(0, 0, c.width, c.height);

  // scale for device pixel ratio
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  c.width = Math.floor(rect.width * dpr);
  c.height = Math.floor(220 * dpr);

  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 220;
  const pad = 18;

  // background
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(0, 0, w, h);

  const max = Math.max(1, ...values);
  const barW = (w - pad * 2) / values.length - 10;

  // axis
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  values.forEach((v, i) => {
    const x = pad + i * (barW + 10) + 5;
    const barH = ((h - pad * 2) * v) / max;
    const y = h - pad - barH;

    // bar
    ctx.fillStyle = "rgba(14,165,233,0.75)";
    ctx.fillRect(x, y, barW, barH);

    // label
    ctx.fillStyle = "rgba(232,239,255,0.9)";
    ctx.font = "12px system-ui";
    ctx.fillText(labels[i], x, h - 6);

    // value
    ctx.fillStyle = "rgba(232,239,255,0.85)";
    ctx.fillText(String(v), x, y - 6);
  });
}

function renderCharts(list) {
  // Gender chart
  const male = list.filter((e) => e.gender === "Laki-laki").length;
  const female = list.filter((e) => e.gender === "Perempuan").length;
  drawBarChart("genderChart", ["Laki-laki", "Perempuan"], [male, female]);

  // Turnover chart (resign count)
  const resignCount = list.filter((e) => !!e.resign_date).length;
  const activeCount = list.filter((e) => e.is_active).length;
  drawBarChart("turnoverChart", ["Resign", "Aktif"], [resignCount, activeCount]);
}

function renderAll() {
  const list = getFilteredEmployees();
  renderKPIs(list);
  renderTable(list);
  renderCharts(list);
}

// ===== Export Excel (CSV) =====
function exportExcelCSV() {
  const list = getFilteredEmployees();

  const headers = [
    "Nomor Karyawan","Nama","Tanggal Lahir","Jenis Kelamin","Unit Kerja","Jabatan",
    "Tanggal Join","Tanggal Resign","Status",
    "Telepon","Email","Alamat",
    "Gaji Pokok","Tunjangan","Lembur","Perjalanan Dinas","Potongan","Net"
  ];

  const rows = list.map(e => ([
    e.employee_no || "",
    e.name || "",
    e.birth_date || "",
    e.gender || "",
    e.unit_work || "",
    e.position || "",
    e.join_date || "",
    e.resign_date || "",
    e.is_active ? "Aktif" : "Tidak Aktif",
    e.phone || "",
    e.email || "",
    e.address || "",
    num(e.base_salary),
    num(e.allowance),
    num(e.overtime),
    num(e.business_trip),
    num(e.deduction),
    netPay(e),
  ]));

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `HRIS_Employees_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// ===== Auth =====
async function login() {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if (!email || !password) return alert("Email & Password wajib diisi!");

  setLoginStatus("Login...");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(error);
    setLoginStatus("❌ Login gagal");
    return alert("Login gagal: " + error.message);
  }

  sessionUser = data.user;
  setLoginStatus(`Login: ${sessionUser.email}`);
  enableAppUI(true);
  $("btnLogin").disabled = true;
  await loadEmployees();
}

async function logout() {
  await supabase.auth.signOut();
  sessionUser = null;
  enableAppUI(false);
  $("btnLogin").disabled = false;
  setLoginStatus("Logout sukses");
  employees = [];
  renderAll();
}

// ===== PWA install + SW =====
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("btnInstall").style.display = "inline-block";
});

$("btnInstall")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  $("btnInstall").style.display = "none";
});

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (e) {
    console.warn("SW register failed:", e);
  }
}

// ===== Events =====
$("btnLogin").addEventListener("click", login);
$("btnLogout").addEventListener("click", logout);
$("btnSave").addEventListener("click", saveEmployee);
$("btnClear").addEventListener("click", clearForm);
$("btnRefresh").addEventListener("click", () => sessionUser ? loadEmployees() : refreshSession());
$("btnExportExcel").addEventListener("click", exportExcelCSV);

$("search").addEventListener("input", renderAll);
$("filterUnit").addEventListener("change", renderAll);

$("resign_date").addEventListener("input", () => {
  $("is_active").value = $("resign_date").value ? "Tidak Aktif" : "Aktif";
});

// ===== Boot =====
(async function boot() {
  fillUnits();
  enableAppUI(false);
  clearForm();
  setLoginStatus("Loading Supabase...");

  await loadSupabaseClient();
  await registerSW();

  // listen auth changes
  supabase.auth.onAuthStateChange((_event, _session) => {
    refreshSession();
  });

  await refreshSession();
})();