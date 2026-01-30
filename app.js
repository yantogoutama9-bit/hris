// ============================
// HRIS Online (Supabase) - YG
// ============================

// >>> GANTI JANGAN DIUBAH2 SELAIN INI
const SUPABASE_URL = "https://iygjugvybdocwdlsmtdg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z2p1Z3Z5YmRvY3dkbHNtdGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDAzNTUsImV4cCI6MjA4NTMxNjM1NX0.eRn9ILl2w4I_VGLfijPfrikKEv5jFOfVDT-dKft81HM";
// <<<

// Unit kerja final (plus Holding)
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

// Supabase client (CDN)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM
const loginCard = document.getElementById("loginCard");
const appGrid = document.getElementById("appGrid");
const subtitle = document.getElementById("subtitle");
const btnLogout = document.getElementById("btnLogout");
const userPill = document.getElementById("userPill");
const userEmail = document.getElementById("userEmail");

const btnLogin = document.getElementById("btnLogin");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const tbody = document.getElementById("tbody");
const filterUnit = document.getElementById("filterUnit");
const btnReload = document.getElementById("btnReload");
const btnExport = document.getElementById("btnExport");

const kpiTotal = document.getElementById("kpiTotal");
const kpiActive = document.getElementById("kpiActive");
const kpiInactive = document.getElementById("kpiInactive");
const kpiTurnover = document.getElementById("kpiTurnover");

const maleCount = document.getElementById("maleCount");
const femaleCount = document.getElementById("femaleCount");
const resignCount = document.getElementById("resignCount");
const genderBar = document.getElementById("genderBar");
const turnoverBar = document.getElementById("turnoverBar");

// Form fields
const f = {
  name: document.getElementById("f_name"),
  employee_no: document.getElementById("f_employee_no"),
  birth_date: document.getElementById("f_birth_date"),
  gender: document.getElementById("f_gender"),
  unit_work: document.getElementById("f_unit_work"),
  position: document.getElementById("f_position"),
  join_date: document.getElementById("f_join_date"),
  resign_date: document.getElementById("f_resign_date"),
  phone: document.getElementById("f_phone"),
  email: document.getElementById("f_email"),
  address: document.getElementById("f_address"),
  base_salary: document.getElementById("f_base_salary"),
  allowance: document.getElementById("f_allowance"),
  overtime: document.getElementById("f_overtime"),
  business_trip: document.getElementById("f_business_trip"),
  deduction: document.getElementById("f_deduction"),
  thp_preview: document.getElementById("f_thp_preview"),
};

const btnSave = document.getElementById("btnSave");
const btnReset = document.getElementById("btnReset");

let editingId = null;
let allEmployees = [];

// Utils
const rupiah = (n) => {
  const x = Number(n || 0);
  return x.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
};

const toNum = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function calcTHP(emp) {
  return (
    toNum(emp.base_salary) +
    toNum(emp.allowance) +
    toNum(emp.overtime) +
    toNum(emp.business_trip) -
    toNum(emp.deduction)
  );
}

function setSelectOptions(selectEl, items, includeAll = false) {
  selectEl.innerHTML = "";
  if (includeAll) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Semua Unit";
    selectEl.appendChild(opt);
  }
  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it;
    opt.textContent = it;
    selectEl.appendChild(opt);
  }
}

function resetForm() {
  editingId = null;
  for (const k in f) {
    if (k === "thp_preview") continue;
    f[k].value = "";
  }
  f.unit_work.value = UNITS[0];
  updateTHPPreview();
  btnSave.textContent = "💾 Simpan";
}

function fillForm(emp) {
  editingId = emp.id;
  f.name.value = emp.name || "";
  f.employee_no.value = emp.employee_no || "";
  f.birth_date.value = emp.birth_date || "";
  f.gender.value = emp.gender || "";
  f.unit_work.value = emp.unit_work || UNITS[0];
  f.position.value = emp.position || "";
  f.join_date.value = emp.join_date || "";
  f.resign_date.value = emp.resign_date || "";
  f.phone.value = emp.phone || "";
  f.email.value = emp.email || "";
  f.address.value = emp.address || "";

  f.base_salary.value = emp.base_salary ?? 0;
  f.allowance.value = emp.allowance ?? 0;
  f.overtime.value = emp.overtime ?? 0;
  f.business_trip.value = emp.business_trip ?? 0;
  f.deduction.value = emp.deduction ?? 0;

  updateTHPPreview();
  btnSave.textContent = "💾 Update";
}

function updateTHPPreview() {
  const emp = {
    base_salary: f.base_salary.value,
    allowance: f.allowance.value,
    overtime: f.overtime.value,
    business_trip: f.business_trip.value,
    deduction: f.deduction.value,
  };
  f.thp_preview.value = rupiah(calcTHP(emp));
}

["base_salary","allowance","overtime","business_trip","deduction"].forEach((k) => {
  f[k].addEventListener("input", updateTHPPreview);
});

// Auth + UI
function showApp(email) {
  loginCard.classList.add("hide");
  appGrid.classList.remove("hide");
  btnLogout.style.display = "inline-flex";
  userPill.style.display = "inline-flex";
  userEmail.textContent = email || "-";
  subtitle.textContent = "Online Sync aktif (Supabase) ✅";
}

function showLogin() {
  loginCard.classList.remove("hide");
  appGrid.classList.add("hide");
  btnLogout.style.display = "none";
  userPill.style.display = "none";
  subtitle.textContent = "Login dulu untuk akses data";
}

async function refreshSessionUI() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (session?.user?.email) {
    showApp(session.user.email);
    await loadEmployees();
  } else {
    showLogin();
  }
}

btnLogin.addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    alert("Email & password wajib diisi ya bro 😄");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Login gagal: " + error.message);
    return;
  }

  showApp(data.user.email);
  await loadEmployees();
});

btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});

// Data load
async function loadEmployees() {
  const unit = filterUnit.value || null;

  let query = supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (unit) query = query.eq("unit_work", unit);

  const { data, error } = await query;

  if (error) {
    alert("Gagal load data: " + error.message);
    return;
  }

  allEmployees = data || [];
  renderTable();
  renderKPI();
  renderCharts();
}

function renderTable() {
  tbody.innerHTML = "";

  for (const emp of allEmployees) {
    const tr = document.createElement("tr");

    const thp = calcTHP(emp);
    const statusBadge = emp.is_active
      ? `<span class="badge ok">Aktif</span>`
      : `<span class="badge no">Tidak Aktif</span>`;

    tr.innerHTML = `
      <td>
        <b>${emp.name || "-"}</b><br/>
        <span class="muted">${emp.gender || "-"}</span>
      </td>
      <td>${emp.employee_no || "-"}</td>
      <td>${emp.unit_work || "-"}</td>
      <td>${emp.position || "-"}</td>
      <td>${statusBadge}</td>
      <td>${emp.join_date || "-"}</td>
      <td>${emp.resign_date || "-"}</td>
      <td><b>${rupiah(thp)}</b></td>
      <td style="white-space:nowrap;">
        <button class="btn" data-act="edit" data-id="${emp.id}">Edit</button>
        <button class="btn danger" data-act="del" data-id="${emp.id}">Hapus</button>
      </td>
    `;

    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-act");

      const emp = allEmployees.find((x) => x.id === id);
      if (!emp) return;

      if (act === "edit") {
        fillForm(emp);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (act === "del") {
        const ok = confirm(`Yakin hapus karyawan: ${emp.name}?`);
        if (!ok) return;

        const { error } = await supabase.from("employees").delete().eq("id", id);
        if (error) {
          alert("Gagal hapus: " + error.message);
          return;
        }
        await loadEmployees();
      }
    });
  });
}

function renderKPI() {
  const total = allEmployees.length;
  const active = allEmployees.filter((x) => x.is_active).length;
  const inactive = total - active;
  const resign = allEmployees.filter((x) => !!x.resign_date).length;

  kpiTotal.textContent = total;
  kpiActive.textContent = active;
  kpiInactive.textContent = inactive;
  kpiTurnover.textContent = resign;
}

function renderCharts() {
  const male = allEmployees.filter((x) => x.gender === "Laki-laki").length;
  const female = allEmployees.filter((x) => x.gender === "Perempuan").length;
  const resign = allEmployees.filter((x) => !!x.resign_date).length;

  maleCount.textContent = male;
  femaleCount.textContent = female;
  resignCount.textContent = resign;

  const totalGender = male + female;
  const malePct = totalGender ? Math.round((male / totalGender) * 100) : 50;
  genderBar.style.width = `${malePct}%`;

  const total = allEmployees.length || 1;
  const resignPct = Math.round((resign / total) * 100);
  turnoverBar.style.width = `${resignPct}%`;
}

// Save
btnSave.addEventListener("click", async () => {
  const payload = {
    name: f.name.value.trim(),
    employee_no: f.employee_no.value.trim(),
    birth_date: f.birth_date.value || null,
    gender: f.gender.value || null,
    unit_work: f.unit_work.value,
    position: f.position.value.trim() || null,
    join_date: f.join_date.value || null,
    resign_date: f.resign_date.value || null,
    phone: f.phone.value.trim() || null,
    email: f.email.value.trim() || null,
    address: f.address.value.trim() || null,
    base_salary: toNum(f.base_salary.value),
    allowance: toNum(f.allowance.value),
    overtime: toNum(f.overtime.value),
    business_trip: toNum(f.business_trip.value),
    deduction: toNum(f.deduction.value),
  };

  if (!payload.name || !payload.employee_no) {
    alert("Nama & Nomor Karyawan wajib diisi ya bro 😄");
    return;
  }

  // insert / update
  if (!editingId) {
    const { error } = await supabase.from("employees").insert(payload);
    if (error) {
      alert("Gagal simpan: " + error.message);
      return;
    }
  } else {
    const { error } = await supabase.from("employees").update(payload).eq("id", editingId);
    if (error) {
      alert("Gagal update: " + error.message);
      return;
    }
  }

  resetForm();
  await loadEmployees();
});

btnReset.addEventListener("click", () => resetForm());

btnReload.addEventListener("click", async () => {
  await loadEmployees();
});

// Export CSV (Excel friendly)
btnExport.addEventListener("click", () => {
  if (!allEmployees.length) {
    alert("Data masih kosong bro 😄");
    return;
  }

  const headers = [
    "employee_no","name","birth_date","gender","unit_work","position",
    "join_date","resign_date","is_active",
    "phone","email","address",
    "base_salary","allowance","overtime","business_trip","deduction","thp"
  ];

  const rows = allEmployees.map((e) => {
    const thp = calcTHP(e);
    return headers.map((h) => {
      let v = (h === "thp") ? thp : (e[h] ?? "");
      // escape CSV
      const s = String(v).replaceAll('"','""');
      return `"${s}"`;
    }).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "hris-employees.csv";
  a.click();

  URL.revokeObjectURL(url);
});

// Init
(function init() {
  setSelectOptions(f.unit_work, UNITS, false);
  setSelectOptions(filterUnit, UNITS, true);
  f.unit_work.value = UNITS[0];

  resetForm();
  refreshSessionUI();

  // kalau session berubah, UI update otomatis
  supabase.auth.onAuthStateChange(() => {
    refreshSessionUI();
  });
})();