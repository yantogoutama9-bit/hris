// =========================
// HRIS Supabase PWA (single admin)
// =========================

// >>> GANTI ini sesuai project lo (udah bener URL nya)
const SUPABASE_URL = "https://iygjugvybdocwdlsmtdg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z2p1Z3Z5YmRvY3dkbHNtdGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDAzNTUsImV4cCI6MjA4NTMxNjM1NX0.eRn9ILl2w4I_VGLfijPfrikKEv5jFOfVDT-dKft81HM";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const UNIT_KERJA = [
  "Holding",
  "Batik Omah Laweyan",
  "Batik Omah Laweyan Cemani",
  "Uniform",
  "Saudagar Laweyan",
  "Solo Baru",
  "Digital Creative",
  "Umroh",
];

let employees = [];
let chartGender = null;
let chartTurnover = null;

// ===== Helpers
const rupiah = (n) => {
  const v = Number(n || 0);
  return new Intl.NumberFormat("id-ID").format(v);
};

const toISO = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);

function $(id) {
  return document.getElementById(id);
}

function setMsg(el, text, ms = 2000) {
  el.textContent = text || "";
  if (text && ms) setTimeout(() => (el.textContent = ""), ms);
}

// ===== UI: init selects
function initUnitSelects() {
  const unitSel = $("unit_kerja");
  const filterUnit = $("filterUnit");

  unitSel.innerHTML = `<option value="">- pilih -</option>` + UNIT_KERJA.map(u => `<option value="${u}">${u}</option>`).join("");

  filterUnit.innerHTML =
    `<option value="ALL">Semua Unit</option>` +
    UNIT_KERJA.map(u => `<option value="${u}">${u}</option>`).join("");
}

// ===== Auth
async function showAuthState() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (session?.user) {
    $("whoami").textContent = `Login: ${session.user.email}`;
    $("btnLogout").style.display = "inline-flex";
    $("loginBox").style.display = "none";
    $("appBox").style.display = "block";
  } else {
    $("whoami").textContent = "Belum login";
    $("btnLogout").style.display = "none";
    $("loginBox").style.display = "block";
    $("appBox").style.display = "none";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  $("loginMsg").textContent = "Login...";
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    $("loginMsg").textContent = "";
    alert("Login gagal: " + error.message);
    return;
  }

  $("loginMsg").textContent = "";
  await showAuthState();
  await loadEmployees();
  renderAll();
}

async function handleLogout() {
  await supabase.auth.signOut();
  employees = [];
  renderAll();
  await showAuthState();
}

// ===== CRUD Supabase
function normalizePayloadFromForm() {
  const tglResign = $("tgl_resign").value || null;

  // resign -> auto nonaktif
  if (tglResign) $("status").value = "Tidak Aktif";

  const gaji_pokok = Number($("gaji_pokok").value || 0);
  const tunjangan = Number($("tunjangan").value || 0);
  const lembur = Number($("lembur").value || 0);
  const perjalanan_dinas = Number($("perjalanan_dinas").value || 0);
  const potongan = Number($("potongan").value || 0);

  return {
    nama: $("nama").value.trim(),
    nik: $("nik").value.trim(),
    tgl_lahir: $("tgl_lahir").value || null,
    jenis_kelamin: $("jenis_kelamin").value || null,
    unit_kerja: $("unit_kerja").value,
    jabatan: $("jabatan").value.trim() || null,
    telepon: $("telepon").value.trim() || null,
    email: $("email").value.trim() || null,
    alamat: $("alamat").value.trim() || null,
    tgl_join: $("tgl_join").value || null,
    tgl_resign: tglResign,
    status: $("status").value || "Aktif",
    gaji_pokok,
    tunjangan,
    lembur,
    perjalanan_dinas,
    potongan,
  };
}

async function saveEmployee(e) {
  e.preventDefault();

  const id = $("empId").value || null;
  const payload = normalizePayloadFromForm();

  if (!payload.nama || !payload.nik || !payload.unit_kerja) {
    alert("Nama, NIK, dan Unit Kerja wajib diisi.");
    return;
  }

  $("saveMsg").textContent = "Menyimpan...";

  if (id) {
    const { error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", id);

    if (error) {
      $("saveMsg").textContent = "";
      alert("Gagal update: " + error.message);
      return;
    }
    setMsg($("saveMsg"), "✅ Data diupdate");
  } else {
    const { error } = await supabase
      .from("employees")
      .insert(payload);

    if (error) {
      $("saveMsg").textContent = "";
      alert("Gagal simpan: " + error.message);
      return;
    }
    setMsg($("saveMsg"), "✅ Data ditambah");
  }

  resetForm();
  await loadEmployees();
  renderAll();
}

async function deleteEmployee(id) {
  if (!confirm("Yakin hapus karyawan ini?")) return;

  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) {
    alert("Gagal hapus: " + error.message);
    return;
  }

  await loadEmployees();
  renderAll();
}

async function loadEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Gagal load data: " + error.message);
    return;
  }

  employees = data || [];
}

// ===== Render
function getFilteredEmployees() {
  const unit = $("filterUnit").value;
  const q = $("search").value.trim().toLowerCase();

  return employees.filter((e) => {
    const okUnit = unit === "ALL" ? true : e.unit_kerja === unit;
    const okQ =
      !q ||
      (e.nama || "").toLowerCase().includes(q) ||
      (e.nik || "").toLowerCase().includes(q);

    return okUnit && okQ;
  });
}

function calcKPI(list) {
  const total = list.length;
  const aktif = list.filter(x => x.status === "Aktif").length;
  const nonaktif = list.filter(x => x.status === "Tidak Aktif").length;
  const turnover = list.filter(x => x.tgl_resign).length;
  return { total, aktif, nonaktif, turnover };
}

function renderKPI() {
  const list = getFilteredEmployees();
  const k = calcKPI(list);
  $("kpiTotal").textContent = k.total;
  $("kpiAktif").textContent = k.aktif;
  $("kpiNonaktif").textContent = k.nonaktif;
  $("kpiTurnover").textContent = k.turnover;
}

function renderTable() {
  const tbody = $("tbody");
  const list = getFilteredEmployees();

  tbody.innerHTML = list.map((e) => {
    const statusTag =
      e.status === "Aktif"
        ? `<span class="tag"><span class="dot green"></span>Aktif</span>`
        : `<span class="tag"><span class="dot red"></span>Tidak Aktif</span>`;

    const totalGaji =
      Number(e.gaji_pokok || 0) +
      Number(e.tunjangan || 0) +
      Number(e.lembur || 0) +
      Number(e.perjalanan_dinas || 0) -
      Number(e.potongan || 0);

    return `
      <tr>
        <td><b>${e.nama || "-"}</b><div class="muted small">${e.jabatan || ""}</div></td>
        <td>${e.nik || "-"}</td>
        <td>${e.unit_kerja || "-"}</td>
        <td>${e.jenis_kelamin || "-"}</td>
        <td>${statusTag}</td>
        <td>${e.tgl_join || "-"}</td>
        <td>${e.tgl_resign || "-"}</td>
        <td>Rp ${rupiah(totalGaji)}</td>
        <td>
          <div class="row" style="gap:8px">
            <button class="btn" onclick="window.__editEmp('${e.id}')">✏️ Edit</button>
            <button class="btn btnDanger" onclick="window.__delEmp('${e.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderCharts() {
  const list = getFilteredEmployees();

  // Gender
  const laki = list.filter(x => x.jenis_kelamin === "Laki-laki").length;
  const perempuan = list.filter(x => x.jenis_kelamin === "Perempuan").length;

  // Turnover: resign count
  const resign = list.filter(x => x.tgl_resign).length;
  const aktif = list.filter(x => x.status === "Aktif").length;

  const ctxG = $("chartGender").getContext("2d");
  const ctxT = $("chartTurnover").getContext("2d");

  if (chartGender) chartGender.destroy();
  if (chartTurnover) chartTurnover.destroy();

  chartGender = new Chart(ctxG, {
    type: "doughnut",
    data: {
      labels: ["Laki-laki", "Perempuan"],
      datasets: [{ data: [laki, perempuan] }],
    },
    options: {
      plugins: { legend: { labels: { color: "#cbd5e1" } } }
    }
  });

  chartTurnover = new Chart(ctxT, {
    type: "bar",
    data: {
      labels: ["Aktif", "Resign"],
      datasets: [{ data: [aktif, resign] }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#cbd5e1" } },
        y: { ticks: { color: "#cbd5e1" } }
      }
    }
  });
}

function renderAll() {
  if ($("appBox").style.display === "none") return;
  renderKPI();
  renderTable();
  renderCharts();
}

// ===== Form actions
function resetForm() {
  $("empId").value = "";
  $("employeeForm").reset();
  $("status").value = "Aktif";
}

function fillForm(e) {
  $("empId").value = e.id;
  $("nama").value = e.nama || "";
  $("nik").value = e.nik || "";
  $("tgl_lahir").value = e.tgl_lahir || "";
  $("jenis_kelamin").value = e.jenis_kelamin || "";
  $("unit_kerja").value = e.unit_kerja || "";
  $("jabatan").value = e.jabatan || "";
  $("telepon").value = e.telepon || "";
  $("email").value = e.email || "";
  $("alamat").value = e.alamat || "";
  $("tgl_join").value = e.tgl_join || "";
  $("tgl_resign").value = e.tgl_resign || "";
  $("status").value = e.status || "Aktif";

  $("gaji_pokok").value = e.gaji_pokok ?? 0;
  $("tunjangan").value = e.tunjangan ?? 0;
  $("lembur").value = e.lembur ?? 0;
  $("perjalanan_dinas").value = e.perjalanan_dinas ?? 0;
  $("potongan").value = e.potongan ?? 0;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== Export Excel
function exportExcel() {
  const list = getFilteredEmployees();

  const rows = list.map((e) => {
    const total =
      Number(e.gaji_pokok || 0) +
      Number(e.tunjangan || 0) +
      Number(e.lembur || 0) +
      Number(e.perjalanan_dinas || 0) -
      Number(e.potongan || 0);

    return {
      Nama: e.nama || "",
      NIK: e.nik || "",
      "Tgl Lahir": e.tgl_lahir || "",
      Gender: e.jenis_kelamin || "",
      "Unit Kerja": e.unit_kerja || "",
      Jabatan: e.jabatan || "",
      Telepon: e.telepon || "",
      Email: e.email || "",
      Alamat: e.alamat || "",
      "Tgl Join": e.tgl_join || "",
      "Tgl Resign": e.tgl_resign || "",
      Status: e.status || "",
      "Gaji Pokok": e.gaji_pokok || 0,
      Tunjangan: e.tunjangan || 0,
      Lembur: e.lembur || 0,
      "Perjalanan Dinas": e.perjalanan_dinas || 0,
      Potongan: e.potongan || 0,
      "Total Gaji": total,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");

  XLSX.writeFile(wb, "HRIS_Karyawan.xlsx");
}

// ===== Wiring
window.__editEmp = (id) => {
  const e = employees.find(x => x.id === id);
  if (!e) return;
  fillForm(e);
};

window.__delEmp = (id) => deleteEmployee(id);

async function init() {
  initUnitSelects();

  $("loginForm").addEventListener("submit", handleLogin);
  $("btnLogout").addEventListener("click", handleLogout);

  $("employeeForm").addEventListener("submit", saveEmployee);
  $("btnReset").addEventListener("click", resetForm);

  $("filterUnit").addEventListener("change", renderAll);
  $("search").addEventListener("input", renderAll);

  $("btnExportExcel").addEventListener("click", exportExcel);
  $("btnRefresh").addEventListener("click", async () => {
    await loadEmployees();
    renderAll();
  });

  // auto status nonaktif kalau resign diisi
  $("tgl_resign").addEventListener("change", () => {
    if ($("tgl_resign").value) $("status").value = "Tidak Aktif";
  });

  // Auth state watcher
  supabase.auth.onAuthStateChange(async () => {
    await showAuthState();
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      await loadEmployees();
      renderAll();
    }
  });

  await showAuthState();
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) {
    await loadEmployees();
    renderAll();
  }
}

init().catch((err) => {
  alert("App error: " + (err?.message || err));
});