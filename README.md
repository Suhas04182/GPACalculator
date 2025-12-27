CGPA / SGPA Calculator with Login & Admin Panel
A single‑page web app for college students to calculate SGPA and CGPA with per‑user login,
admin approval system, and browser‑based data storage. Built using HTML, CSS, and JavaScript
only (no backend).

#Features
*Login / Register system (username + password).
*Admin role:
    * Only admin can edit marks (add/modify subjects, semesters).
    * Can see all registered users.
    * Can approve / revoke student accounts.
*Student role:
    * Can log in only after admin approves the account.
    * Can view own SGPA/CGPA and saved semesters.
*CGPA / SGPA calculator:
    * Multi‑semester support.
    * Grade mapping (O, A+, A, B+, B, C+, C, F → 10‑point scale).
    * Per‑subject credits and grade points.
*Data storage:
    * All data saved in browser localStorage.
    * Per‑user marks stored separately.
    * Login logs stored for admin.

#Technology Stack
* HTML5 – structure and layout.
* CSS3 – responsive UI, gradient background, buttons, tables.
* Vanilla JavaScript (ES6) – login logic, admin logic, GPA calculations, localStorage.

gpa-calculator/
├── index.html    Login + Calculator UI
├── style.css     All styling
└── script.js     Logic: auth + admin + GPA + storage

#index.html:
* Contains login/register section.
* Contains main calculator UI (semester tabs, table, buttons, results).
* Loads style.css and script.js.

#style.css:
* Global styles, auth box styling, container, buttons, tables, responsive layout.

#script.js:
* Auth helpers (users, current user, login logs).
* GPACalculator class for all GPA logic.
* Global wrappers for button clicks.
* Login / register / logout functions.
* Admin panel functions (approve / revoke users).

#User Roles & Flow
1. Admin account
  * Go to Register and create a user with:
      * Username: admin
      * Password: any password
  * This user automatically gets:
      * role = "admin"
      * approved = true (can log in immediately)
2. Student registration
* Each student uses Register to create their account with a unique username.
* Students are created with:
    * role = "student"
    * approved = false (cannot log in until admin approves)
3. Student login behavior
* If a student tries to log in before approval, they see:
      * "Your account is not approved by admin yet."
* After admin approval, student can log in and view their data.
4. Admin behavior
* When the admin logs in:
    * The main calculator becomes visible.
    * The Admin Panel – User Approvals section is shown.
    * Admin can:
      * See all registered users (username, role, approved status).
      * Click Approve to allow a student to log in.
      * Click Revoke to block a student again.
    * Login logs (who logged in when) are printed in the browser console.

#Admin Panel – How Approval Works
* Admin panel shows a table of all users:
    * Username
    * Role (admin or student)
    * Approved (Yes/No)
    * Action button:
        * For students:
          * Approve → sets approved = true.
          * Revoke → sets approved = false.
        * For admin:
          * No action; admin account cannot be changed.
*Data is stored in localStorage keys:
    * users – array of all user objects.
    * currentUser – currently logged‑in user object.
    * marks_<username> – GPA data for each user.
    * loginLogs – list of login events (username + time).
      These patterns follow standard localStorage practices for front‑end only apps.​

#GPA / CGPA Calculation Logic
For each subject:
    * Grade → grade point (e.g., O = 10, A+ = 9, A = 8, B+ = 7, etc.).
    * Each subject has credits.

SGPA(per semester):
          ∑(grade point×credits)
 SGPA=  ---------------------------         
                ∑credits
 
CGPA(overall):
        ∑ grade×credits(all semesters)
CGPA=  ------------------------------
         ∑ credits(all semesters)
 
The UI shows:
    * SGPA for current semester with total credits.
    * CGPA for all semesters with total credits and stats (number of semesters and subjects).
Formulas and mapping follow common Indian 10‑point grading schemes used in many
university CGPA tools.​

#How Data Is Saved Per User
On any change (add subject, edit grade, change semester), an auto‑save timer runs.
Data is saved under key: marks_<username> in localStorage.
Example:
json
{
  "semesters": [......],
  "currentSemester": 2,
  "timestamp": "2025-12-27T15:30:00.000Z"
}
This lets each student see their own saved marks even after closing the browser, as long as
localStorage is not cleared.​

#Typical Usage Scenario
1. Admin registers (admin username) and logs in.
2. Admin shares the app URL with students.
3. Students register with their usernames and passwords.
4. Admin logs in, opens Admin Panel, and approves students.
5. Students log in and:
    * View their saved semesters and SGPA/CGPA.
    * Inputs are read‑only if only admin is allowed to edit (depending on configuration).
6. Admin can adjust marks, print from browser, and manage approvals.
