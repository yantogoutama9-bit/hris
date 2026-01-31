// ======================
// Supabase Config
// ======================
const SUPABASE_URL = "https://iygjugvybdocwdlsmtdg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z2p1Z3Z5YmRvY3dkbHNtdGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDAzNTUsImV4cCI6MjA4NTMxNjM1NX0.eRn9ILl2w4I_VGLfijPfrikKEv5jFOfVDT-dKft81HM";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================
// Units
// ======================
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

// ======================
// DOM
// ======================
const pillConn = document.getElementById("pillConn");
const btnReload = document.getElementById("btnReload");
const btnLogout = document.getElementById("btnLogout");

const loginBox = document.getElementById("loginBox");
const appBox = document.getElementById("appBox");
const btnLogin = document.getElementById("btnLogin");
const loginMsg = document.getElementById("loginMsg");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const filterUnit = document.getElementById("filterUnit");
const btnExportExcel = document.getElementById("btnExportExcel");
const btnClearForm = document.getElementById("btnClearForm");

const fName = document.getElementById("fName");
const fNo = document.getElementById("fNo");
const fBirth = document.getElementById("fBirth");
const fGender = document.getElementById("fGender");
const fUnit = document.getElementById("fUnit");
const fPosition = document.getElementById("fPosition");
const fJoin = document.getElementById("fJoin");
const fResign = document.getElementById("fResign");
const fActive = document.getElementById("fActive");

const fPhone = document.getElementById("fPhone");
const fEmail = document.getElementById("fEmail");
const fAddress = document.getElementById("fAddress");

const fBase = document.getElementById("fBase");
const fAllow = document.getElementById("fAllow");
const fOT = document.getElementById("fOT");
const fTrip = document.getElementById("fTrip");
const fDeduct = document.getElementById("fDeduct");
const fTHP = document.getElementById("fTHP");

const btnSave = document.getElementById("btnSave");
const btnUpdate = document.getElementById("btnUpdate");
const btnDelete = document.getElementById("btnDelete");
const appMsg = document.getElementById("appMsg");

const tblBody = document.getElementById("tblBody");

const kpiTotal = document.getElementById("kpiTotal");
const kpiActive = document.getElementById("kpiActive");
const kpiInactive = document.getElementById("kpiInactive");
const kpiTurnover = document.getElementById("kpiTurnover");

// ======================
// State
// ======================
let employees = [];
let selectedId = null;

let chartGender = null;
let chartTurnover = null;

// ======================
// Helpers
// ======================
function rupiah(n) {
  const x = Number(n || 0);
  return x.toLocaleString("id-ID", { style: "currency", currency: "IDR" });
}

function num(n) {
  const x = Number(n);
  return isNaN(x) ? 0 : x;
}

function setMsg(el, text, type = "muted") {
  el.textContent = text || "";
  el.style.color =
    type === "ok" ? "#22c55e" :
    type === "err" ? "#ef4444" :
    type === "warn" ? "#f59e0b" : "#93a4c7";
}

function calcTHP() {
  const thp = num(fBase.value) + num(fAllow.value) + num(fOT.value) + num(fTrip.value) - num(fDeduct.value);
  fTHP.value = rupiah(thp);
}

[fBase, fAllow, fOT, fTrip, fDeduct].forEach(inp => inp.addEventListener("input", calcTHP));

function fillUnitSelects() {
  // filter
  filterUnit.innerHTML = `<option value="">Semua Unit</option>`;
  UNITS.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    filterUnit.appendChild(opt);
  });

  // form
  fUnit.innerHTML = "";
  UNITS.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    fUnit.appendChild(opt);
  });
}

function resetForm() {
  selectedId = null;
  fName.value = "";
  fNo.value = "";
  fBirth.value = "";
  fGender.value = "";
  fUnit.value = UNITS[0];
  fPosition.value = "";
  fJoin.value = "";
  fResign.value = "";
  fActive.value = "true";

  fPhone.value = "";
  fEmail.value = "";
  fAddress.value = "";

  fBase.value = 0;
  fAllow.value = 0;
  fOT.value = 0;
  fTrip.value = 0;
  fDeduct.value = 0;
  calcTHP();

  btnUpdate.disabled = true;
  btnDelete.disabled = true;
  btnSave.disabled = false;
  setMsg(appMsg, "");
}

function toISODate(val) {
  if (!val) return null;
  return val; // input date already YYYY-MM-DD
}

// ======================
// Supabase Auth
// ======================
async function refreshSessionUI() {
  const { data } = await sb.auth.getSession();
  const session = data?.session;

  if (session) {
    pillConn.textContent = `Login: ${session.user.email}`;
    btnLogout.classList.remove("hide");
    loginBox.classList.add("hide");
    appBox.classList.remove("hide");
  } else {
    pillConn.textContent = "Status: belum login";
    btnLogout.classList.add("hide");
    loginBox.classList.remove("hide");
    appBox.classList.add("hide");
  }
}

btnLogin.addEventListener("click", async () => {
  setMsg(loginMsg, "Login...", "warn");

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    setMsg(loginMsg, "Gagal login: " + error.message, "err");
    return;
  }

  setMsg(loginMsg, "Login sukses ✅", "ok");
  await refreshSessionUI();
  await loadEmployees();
});

btnLogout.addEventListener("click", async () => {
  await sb.auth.signOut();
  await refreshSessionUI();
});

btnReload.addEventListener("click", async () => {
  await refreshSessionUI();
  if (!loginBox.classList.contains("hide")) return;
  await loadEmployees();
});

// ======================
// Data Load
// ======================
async function loadEmployees() {
  setMsg(appMsg, "Loading data...", "warn");

  const unit = filterUnit.value;

  let q = sb.from("employees").select("*").order("created_at", { ascending: false });
  if (unit) q = q.eq("unit_work", unit);

  const { data, error } = await q;

  if (error) {
    setMsg(appMsg, "Error load: " + error.message, "err");
    employees = [];
    renderAll();
    return;
  }

  employees = data || [];
  setMsg(appMsg, `Loaded ${employees.length} data`, "ok");
  renderAll();
}

filterUnit.addEventListener("change", loadEmployees);

// ======================
// Render
// ======================
function renderKPIs(list) {
  const total = list.length;
  const active = list.filter(x => x.is_active === true).length;
  const inactive = list.filter(x => x.is_active === false).length;
  const turnover = list.filter(x => x.resign_date !== null).length;

  kpiTotal.textContent = total;
  kpiActive.textContent = active;
  kpiInactive.textContent = inactive;
  kpiTurnover.textContent = turnover;
}

function renderTable(list) {
  tblBody.innerHTML = "";

  if (!list.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="10" class="muted">Belum ada data karyawan. Tambahkan dulu ya bro 😄</td>`;
    tblBody.appendChild(tr);
    return;
  }

  list.forEach(emp => {
    const thp = num(emp.base_salary) + num(emp.allowance) + num(emp.overtime) + num(emp.business_trip) - num(emp.deduction);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${emp.name || "-"}</b><div class="muted" style="font-size:12px">${emp.email || ""}</div></td>
      <td>${emp.employee_no || "-"}</td>
      <td>${emp.gender || "-"}</td>
      <td>${emp.unit_work || "-"}</td>
      <td>${emp.position || "-"}</td>
      <td>${emp.join_date || "-"}</td>
      <td>${emp.resign_date || "-"}</td>
      <td>${emp.is_active ? `<span class="statusActive">Aktif</span>` : `<span class="statusInactive">Nonaktif</span>`}</td>
      <td>${rupiah(thp)}</td>
      <td>
        <button class="btn" data-act="edit" data-id="${emp.id}">Edit</button>
      </td>
    `;
    tblBody.appendChild(tr);
  });

  tblBody.querySelectorAll("button[data-act='edit']").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const emp = employees.find(x => x.id === id);
      if (!emp) return;

      selectedId = emp.id;

      fName.value = emp.name || "";
      fNo.value = emp.employee_no || "";
      fBirth.value = emp.birth_date || "";
      fGender.value = emp.gender || "";
      fUnit.value = emp.unit_work || UNITS[0];
      fPosition.value = emp.position || "";
      fJoin.value = emp.join_date || "";
      fResign.value = emp.resign_date || "";
      fActive.value = String(emp.is_active);

      fPhone.value = emp.phone || "";
      fEmail.value = emp.email || "";
      fAddress.value = emp.address || "";

      fBase.value = num(emp.base_salary);
      fAllow.value = num(emp.allowance);
      fOT.value = num(emp.overtime);
      fTrip.value = num(emp.business_trip);
      fDeduct.value = num(emp.deduction);
      calcTHP();

      btnUpdate.disabled = false;
      btnDelete.disabled = false;
      btnSave.disabled = true;

      setMsg(appMsg, "Mode edit aktif ✅", "ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderCharts(list) {
  // Gender
  const male = list.filter(x => x.gender === "Laki-laki").length;
  const female = list.filter(x => x.gender === "Perempuan").length;

  const ctxG = document.getElementById("chartGender");
  if (chartGender) chartGender.destroy();
  chartGender = new Chart(ctxG, {
    type: "doughnut",
    data: {
      labels: ["Laki-laki", "Perempuan"],
      datasets: [{ data: [male, female] }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#eaf0ff" } } }
    }
  });

  // Turnover chart (simple)
  const resignCount = list.filter(x => x.resign_date !== null).length;
  const activeCount = list.filter(x => x.is_active === true).length;

  const ctxT = document.getElementById("chartTurnover");
  if (chartTurnover) chartTurnover.destroy();
  chartTurnover = new Chart(ctxT, {
    type: "bar",
    data: {
      labels: ["Aktif", "Resign"],
      datasets: [{ data: [activeCount, resignCount] }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#eaf0ff" } },
        y: { ticks: { color: "#eaf0ff" } }
      }
    }
  });
}

function renderAll() {
  renderKPIs(employees);
  renderTable(employees);
  renderCharts(employees);
}

// ======================
// Save / Update / Delete
// ======================
btnSave.addEventListener("click", async () => {
  setMsg(appMsg, "Menyimpan...", "warn");

  if (!fName.value.trim() || !fNo.value.trim()) {
    setMsg(appMsg, "Nama dan Nomor Karyawan wajib diisi!", "err");
    return;
  }

  const payload = {
    employee_no: fNo.value.trim(),
    name: fName.value.trim(),
    birth_date: toISODate(fBirth.value),
    gender: fGender.value || null,
    unit_work: fUnit.value,
    position: fPosition.value.trim() || null,
    join_date: toISODate(fJoin.value),
    resign_date: toISODate(fResign.value),
    is_active: fActive.value === "true",

    phone: fPhone.value.trim() || null,
    email: fEmail.value.trim() || null,
    address: fAddress.value.trim() || null,

    base_salary: num(fBase.value),
    allowance: num(fAllow.value),
    overtime: num(fOT.value),
    business_trip: num(fTrip.value),
    deduction: num(fDeduct.value),
  };

  const { error } = await sb.from("employees").insert(payload);
  if (error) {
    setMsg(appMsg, "Gagal simpan: " + error.message, "err");
    return;
  }

  setMsg(appMsg, "Simpan sukses ✅", "ok");
  resetForm();
  await loadEmployees();
});

btnUpdate.addEventListener("click", async () => {
  if (!selectedId) return;

  setMsg(appMsg, "Mengupdate...", "warn");

  const payload = {
    employee_no: fNo.value.trim(),
    name: fName.value.trim(),
    birth_date: toISODate(fBirth.value),
    gender: fGender.value || null,
    unit_work: fUnit.value,
    position: fPosition.value.trim() || null,
    join_date: toISODate(fJoin.value),
    resign_date: toISODate(fResign.value),
    is_active: fActive.value === "true",

    phone: fPhone.value.trim() || null,
    email: fEmail.value.trim() || null,
    address: fAddress.value.trim() || null,

    base_salary: num(fBase.value),
    allowance: num(fAllow.value),
    overtime: num(fOT.value),
    business_trip: num(fTrip.value),
    deduction: num(fDeduct.value),
  };

  const { error } = await sb.from("employees").update(payload).eq("id", selectedId);
  if (error) {
    setMsg(appMsg, "Gagal update: " + error.message, "err");
    return;
  }

  setMsg(appMsg, "Update sukses ✅", "ok");
  resetForm();
  await loadEmployees();
});

btnDelete.addEventListener("click", async () => {
  if (!selectedId) return;

  const ok = confirm("Yakin mau hapus karyawan ini?");
  if (!ok) return;

  setMsg(appMsg, "Menghapus...", "warn");

  const { error } = await sb.from("employees").delete().eq("id", selectedId);
  if (error) {
    setMsg(appMsg, "Gagal hapus: " + error.message, "err");
    return;
  }

  setMsg(appMsg, "Hapus sukses ✅", "ok");
  resetForm();
  await loadEmployees();
});

btnClearForm.addEventListener("click", resetForm);

// ======================
// Export Excel
// ======================
btnExportExcel.addEventListener("click", () => {
  if (!employees.length) {
    alert("Data kosong bro 😄");
    return;
  }

  const rows = employees.map(e => {
    const thp = num(e.base_salary) + num(e.allowance) + num(e.overtime) + num(e.business_trip) - num(e.deduction);
    return {
      "Nama": e.name,
      "Nomor Karyawan": e.employee_no,
      "Tanggal Lahir": e.birth_date,
      "Jenis Kelamin": e.gender,
      "Unit Kerja": e.unit_work,
      "Jabatan": e.position,
      "Tanggal Join": e.join_date,
      "Tanggal Resign": e.resign_date,
      "Status Aktif": e.is_active ? "Aktif" : "Tidak Aktif",
      "Telepon": e.phone,
      "Email": e.email,
      "Alamat": e.address,
      "Gaji Pokok": num(e.base_salary),
      "Tunjangan": num(e.allowance),
      "Lembur": num(e.overtime),
      "Perjalanan Dinas": num(e.business_trip),
      "Potongan": num(e.deduction),
      "Take Home Pay": thp,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Employees");

  XLSX.writeFile(wb, "HRIS_Employees.xlsx");
});

// ======================
// Init
// ======================
fillUnitSelects();
resetForm();
calcTHP();

(async function init() {
  await refreshSessionUI();

  // auto load kalau session masih ada
  const { data } = await sb.auth.getSession();
  if (data?.session) {
    await loadEmployees();
  }
})();