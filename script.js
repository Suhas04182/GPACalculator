// ---------- AUTH HELPERS ----------
function getUsers() {
  const raw = localStorage.getItem("users");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// login logs
function addLoginLog(username) {
  const raw = localStorage.getItem("loginLogs");
  let logs = [];
  try {
    logs = raw ? JSON.parse(raw) : [];
  } catch {
    logs = [];
  }
  logs.push({ username, time: new Date().toISOString() });
  localStorage.setItem("loginLogs", JSON.stringify(logs));
}

function getLoginLogs() {
  const raw = localStorage.getItem("loginLogs");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

let CURRENT_USER = getCurrentUser();

// ---------- GPA CALCULATOR CLASS ----------
class GPACalculator {
  constructor() {
    this.semesters = [{ year: 1, subjects: [] }]; // year field added
    this.currentSemester = 1;
    this.gradePoints = {
      O: 10,
      "A+": 9,
      A: 8,
      "B+": 7,
      B: 6,
      "C+": 5,
      C: 4,
      F: 0
    };
  }

  init() {
    const user = CURRENT_USER || getCurrentUser();
    if (user) {
      CURRENT_USER = user;
      this.loadDataForUser(user.username);
    } else {
      this.semesters = [{ year: 1, subjects: [{ name: "", grade: "O", credits: 4 }] }];
      this.currentSemester = 1;
    }
    this.renderSemesterTabs();
    this.renderTable();
  }

  // ----- UI RENDER -----
  renderSemesterTabs() {
    const tabsContainer = document.getElementById("semesterTabs");
    if (!tabsContainer) return;
    tabsContainer.innerHTML = "";

    this.semesters.forEach((sem, index) => {
      const semNo = index + 1;
      const btn = document.createElement("button");
      btn.className = "tab" + (semNo === this.currentSemester ? " active" : "");
      btn.textContent = `Year ${sem.year} - Sem ${semNo}`;
      btn.onclick = () => switchSemester(semNo);
      tabsContainer.appendChild(btn);
    });
  }

  renderTable() {
    const tbody = document.getElementById("subjectsBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const sem = this.semesters[this.currentSemester - 1];
    const isAdmin = CURRENT_USER && CURRENT_USER.role === "admin";

    sem.subjects.forEach((subject, index) => {
      const row = tbody.insertRow();
      const gp = this.gradePoints[subject.grade] || 0;

      row.innerHTML = `
        <td>
          <input 
            type="text" 
            value="${subject.name}" 
            placeholder="Enter subject name"
            ${!isAdmin ? "disabled" : ""}
            onchange="updateSubjectField('name', this.value, ${index})"
          />
        </td>
        <td>
          <select 
            ${!isAdmin ? "disabled" : ""}
            onchange="updateSubjectField('grade', this.value, ${index})">
            ${Object.entries(this.gradePoints)
              .map(
                ([grade, points]) => `
                <option value="${grade}" ${
                  subject.grade === grade ? "selected" : ""
                }>
                  ${grade} (${points})
                </option>`
              )
              .join("")}
          </select>
        </td>
        <td>
          <input 
            type="number" 
            min="1" 
            max="10"
            value="${subject.credits}" 
            ${!isAdmin ? "disabled" : ""}
            onchange="updateSubjectField('credits', parseInt(this.value), ${index})"
          />
        </td>
        <td>${gp * (subject.credits || 0)}</td>
        <td>
          ${
            isAdmin
              ? `<button class="btn danger small" onclick="deleteSubject(${index})">🗑️</button>`
              : ""
          }
        </td>
      `;
    });
  }

  // ----- DATA CHANGE -----
  addSubject() {
    this.semesters[this.currentSemester - 1].subjects.push({
      name: "",
      grade: "O",
      credits: 4
    });
    this.renderTable();
    this.autoSave();
  }

  deleteSubject(index) {
    this.semesters[this.currentSemester - 1].subjects.splice(index, 1);
    this.renderTable();
    this.autoSave();
  }

  updateSubject(field, value, index) {
    const sem = this.semesters[this.currentSemester - 1];
    sem.subjects[index][field] = value;
    this.renderTable();
    this.autoSave();
  }

  switchSemester(semNo) {
    this.currentSemester = semNo;
    this.renderSemesterTabs();
    this.renderTable();
  }

  // automatic year: Sem1-2 → year1, 3-4 → year2, etc.
  addNewSemester() {
    const nextIndex = this.semesters.length; // 0-based
    const semNo = nextIndex + 1;
    const year = Math.min(4, Math.ceil(semNo / 2)); // max 4th year
    this.semesters.push({ year, subjects: [] });
    this.currentSemester = this.semesters.length;
    this.renderSemesterTabs();
    this.renderTable();
    this.autoSave();
  }

  clearCurrentSemester() {
    this.semesters[this.currentSemester - 1].subjects = [];
    this.renderTable();
    document.getElementById("sgpaResult").classList.add("hidden");
    this.autoSave();
  }

  resetAll() {
    if (!confirm("Reset all semesters and marks?")) return;
    this.semesters = [{ year: 1, subjects: [] }];
    this.currentSemester = 1;
    this.renderSemesterTabs();
    this.renderTable();
    document.getElementById("sgpaResult").classList.add("hidden");
    document.getElementById("cgpaResult").classList.add("hidden");
    document.getElementById("summaryStats").classList.add("hidden");
    this.saveData();
  }

  // ----- CALCULATIONS -----
  calculateSGPA() {
    const sem = this.semesters[this.currentSemester - 1];
    let totalPoints = 0;
    let totalCredits = 0;

    sem.subjects.forEach((s) => {
      const gp = this.gradePoints[s.grade] || 0;
      const cr = s.credits || 0;
      totalPoints += gp * cr;
      totalCredits += cr;
    });

    const sgpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "0.00";

    const box = document.getElementById("sgpaResult");
    box.innerHTML = `
      <div class="result-box">
        📊 Year ${sem.year} - Semester ${this.currentSemester} SGPA: <strong>${sgpa}</strong><br />
        <small>Total Credits: ${totalCredits} | Formula: Σ(Grade×Credits)/ΣCredits</small>
      </div>
    `;
    box.classList.remove("hidden");
  }

  calculateCGPA() {
    let totalPoints = 0;
    let totalCredits = 0;

    this.semesters.forEach((sem) => {
      sem.subjects.forEach((s) => {
        const gp = this.gradePoints[s.grade] || 0;
        const cr = s.credits || 0;
        totalPoints += gp * cr;
        totalCredits += cr;
      });
    });

    const cgpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "0.00";

    const box = document.getElementById("cgpaResult");
    box.innerHTML = `
      <div class="result-box cgpa-result">
        🎯 Overall CGPA (All Years): <strong>${cgpa}</strong><br />
        <small>Total Credits Completed: ${totalCredits}</small>
      </div>
    `;
    box.classList.remove("hidden");

    const semCount = this.semesters.filter((s) => s.subjects.length > 0).length;
    const stats = document.getElementById("summaryStats");
    stats.innerHTML = `
      <div class="stats-box">
        📈 Stats: ${semCount} Semesters | ${this.getTotalSubjects()} Subjects stored.
      </div>
    `;
    stats.classList.remove("hidden");
    this.autoSave();
  }

  getTotalSubjects() {
    return this.semesters.reduce((sum, s) => sum + s.subjects.length, 0);
  }

  // ----- STORAGE -----
  saveData() {
    const currentUser = CURRENT_USER || getCurrentUser();
    if (!currentUser) return;

    const data = {
      semesters: this.semesters,
      currentSemester: this.currentSemester,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem("marks_" + currentUser.username, JSON.stringify(data));
  }

  loadDataForUser(username) {
    const raw = localStorage.getItem("marks_" + username);
    if (!raw) {
      this.semesters = [{ year: 1, subjects: [{ name: "", grade: "O", credits: 4 }] }];
      this.currentSemester = 1;
      return false;
    }
    try {
      const data = JSON.parse(raw);
      this.semesters =
        (data.semesters || []).map((s, i) => ({
          year: s.year || Math.min(4, Math.ceil((i + 1) / 2)),
          subjects: s.subjects || []
        }));
      if (!this.semesters.length) {
        this.semesters = [{ year: 1, subjects: [] }];
      }
      this.currentSemester = data.currentSemester || 1;
      return true;
    } catch {
      this.semesters = [{ year: 1, subjects: [] }];
      this.currentSemester = 1;
      return false;
    }
  }

  clearSavedData() {
    const currentUser = CURRENT_USER || getCurrentUser();
    if (!currentUser) return;
    if (!confirm("Delete all saved marks for " + currentUser.username + "?")) return;
    localStorage.removeItem("marks_" + currentUser.username);
    this.resetAll();
  }

  autoSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveData(), 1500);
  }
}

// ---------- GLOBAL INSTANCE & WRAPPERS ----------
const calculator = new GPACalculator();
calculator.init();

function addNewSemester() {
  calculator.addNewSemester();
}
function addSubject() {
  calculator.addSubject();
}
function calculateSGPA() {
  calculator.calculateSGPA();
}
function calculateCGPA() {
  calculator.calculateCGPA();
}
function clearCurrentSemester() {
  calculator.clearCurrentSemester();
}
function resetAll() {
  calculator.resetAll();
}
function switchSemester(n) {
  calculator.switchSemester(n);
}
function updateSubjectField(field, value, index) {
  calculator.updateSubject(field, value, index);
}
function saveData() {
  calculator.saveData();
}
function clearSavedData() {
  calculator.clearSavedData();
}

// ---------- ADMIN PANEL ----------
function renderAdminUserTable() {
  const tbody = document.getElementById("adminUserTableBody");
  if (!tbody) return;

  const users = getUsers();
  tbody.innerHTML = "";

  users.forEach((u, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${u.username}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${u.role}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
        ${u.approved ? "✅ Yes" : "❌ No"}
      </td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
        ${
          u.role === "admin"
            ? "<small>Admin</small>"
            : `
          <button class="btn small ${u.approved ? "secondary" : "primary"}"
                  onclick="toggleUserApproval(${index})">
            ${u.approved ? "Revoke" : "Approve"}
          </button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleUserApproval(index) {
  const users = getUsers();
  const user = users[index];
  if (!user) return;

  if (user.role === "admin") {
    alert("Admin account cannot be changed.");
    return;
  }

  user.approved = !user.approved;
  saveUsers(users);
  renderAdminUserTable();
  alert(
    `${user.username} is now ${user.approved ? "APPROVED" : "BLOCKED"} by admin.`
  );
}

function renderLoginLogs() {
  const tbody = document.getElementById("loginLogTableBody");
  if (!tbody) return;

  const logs = getLoginLogs();
  tbody.innerHTML = "";

  logs.forEach((log) => {
    const tr = document.createElement("tr");
    const time = new Date(log.time).toLocaleString();
    tr.innerHTML = `
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${log.username}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${time}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- AUTH UI FUNCTIONS ----------
function showLogin() {
  document.getElementById("loginBox").classList.remove("hidden");
  document.getElementById("registerBox").classList.add("hidden");
}

function showRegister() {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("registerBox").classList.remove("hidden");
}

function handleRegister() {
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value.trim();

  if (!username || !password) {
    alert("Username & password required");
    return;
  }

  const users = getUsers();
  if (users.find((u) => u.username === username)) {
    alert("User already exists");
    return;
  }

  const role = username === "admin" ? "admin" : "student";
  users.push({ username, password, role, approved: role === "admin" });
  saveUsers(users);
  alert("Account created! Now login.");
  showLogin();
}

function handleLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const users = getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    alert("Invalid username or password");
    return;
  }

  if (!user.approved && user.role !== "admin") {
    alert("Your account is not approved by admin yet.");
    return;
  }

  setCurrentUser(user);
  CURRENT_USER = user;
  addLoginLog(user.username);
  showAppForUser(user);
}

function handleLogout() {
  localStorage.removeItem("currentUser");
  CURRENT_USER = null;
  document.getElementById("appContainer").classList.add("hidden");
  document.getElementById("authWrapper").classList.remove("hidden");
}

function showAppForUser(user) {
  document.getElementById("authWrapper").classList.add("hidden");
  document.getElementById("appContainer").classList.remove("hidden");

  const info = document.getElementById("userInfoText");
  info.textContent = `Logged in as ${user.username} (${user.role})`;

  calculator.loadDataForUser(user.username);
  calculator.renderSemesterTabs();
  calculator.renderTable();

  const adminPanel = document.getElementById("adminPanel");
  const logPanel = document.getElementById("loginLogPanel");

  if (user.role === "admin") {
    adminPanel.classList.remove("hidden");
    logPanel.classList.remove("hidden");
    renderAdminUserTable();
    renderLoginLogs();
  } else {
    adminPanel.classList.add("hidden");
    logPanel.classList.add("hidden");
  }
}

// auto-save on unload
window.addEventListener("beforeunload", () => {
  calculator.saveData();
});
