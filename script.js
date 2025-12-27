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
    this.semesters = [{ subjects: [] }];
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
    this.init();
  }

  init() {
    const user = CURRENT_USER || getCurrentUser();
    if (user) {
      CURRENT_USER = user;
      this.loadDataForUser(user.username);
      showAppForUser(user);
    } else {
      this.semesters = [{ subjects: [{ name: "", grade: "O", credits: 4 }] }];
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

    this.semesters.forEach((_, index) => {
      const semNo = index + 1;
      const btn = document.createElement("button");
      btn.className = "tab" + (semNo === this.currentSemester ? " active" : "");
      btn.textContent = `Semester ${semNo}`;
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

  addNewSemester() {
    this.semesters.push({ subjects: [] });
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
    this.semesters = [{ subjects: [] }];
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
        📊 Semester ${this.currentSemester} SGPA: <strong>${sgpa}</strong><br />
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
        🎯 Overall CGPA: <strong>${cgpa}</strong><br />
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
    this.showToast("✅ Data saved for " + currentUser.username);
  }

  loadDataForUser(username) {
    const raw = localStorage.getItem("marks_" + username);
    if (!raw) {
      this.semesters = [{ subjects: [{ name: "", grade: "O", credits: 4 }] }];
      this.currentSemester = 1;
      return false;
    }
    try {
      const data = JSON.parse(raw);
      this.semesters = data.semesters || [{ subjects: [] }];
      this.currentSemester = data.currentSemester || 1;
      return true;
    } catch {
      this.semesters = [{ subjects: [] }];
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

  showToast(msg) {
    const div = document.createElement("div");
    div.textContent = msg;
    div.style.cssText =
      "position:fixed;top:20px;right:20px;background:#48bb78;color:white;padding:10px 16px;border-radius:8px;z-index:9999;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3);";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
  }
}

// ---------- GLOBAL INSTANCE & WRAPPERS ----------

const calculator = new GPACalculator();

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

  if (user.role === "admin") {
    console.log("All users:", getUsers());        // admin ke liye console log
    console.log("Login logs:", getLoginLogs());
  }
}

// auto‑save on unload
window.addEventListener("beforeunload", () => {
  calculator.saveData();
});
