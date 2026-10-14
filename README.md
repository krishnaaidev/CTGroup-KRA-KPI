# CT Group of Institutions • KRA & KPI Performance Management System

A secure, institutional digital platform engineered to manage, evaluate, and track the academic, research, and administrative performance of **Faculty**, **Heads of Department (HOD)**, and **Heads of Institution (HOI)** based on a strict **1,000-Mark Framework**.

---

## 🚀 System Architecture & Deployment Status

- **Status:** **DEPLOYED & ACTIVE**
- **Production Server:** `http://localhost:3000`
- **Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Better-SQLite3 + JWT Session RBAC + SheetJS (XLSX) + Lucide Icons

---

## 👥 Pre-Configured Role Accounts (Ready for Immediate Login)

| Role | Name | College / Employee ID | Email / Username | Password |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Admin** | System Administrator | `20` | `developer@ctgroup.in` | `CTAdmin@2026` |
| **🏢 HOD** | Dr. Rajesh Sharma | `CT-HOD-201` | `hod.cse@ctgroup.in` | `HOD@123` |
| **🏛️ HOI** | Dr. Gurpreet Singh | `CT-HOI-301` | `hoi.engg@ctgroup.in` | `HOI@123` |
| **👨‍🏫 Faculty** | Prof. Ananya Verma | `CT-FAC-101` | `faculty.cse@ctgroup.in` | `Faculty@123` |
| **⏳ Pending Faculty** | Prof. Vikram Malhotra | `CT-FAC-102` | `vikram.cse@ctgroup.in` | `Faculty@123` |

> *Tip:* The Login page also features a **One-Click Role Selector** to quickly switch between Admin, Faculty, HOD, and HOI dashboards.

---

## 📊 1,000-Mark Evaluation Frameworks

### 1. Faculty Evaluation Framework (1,000 Marks Total)
Strictly implemented with mathematical rules and automated calculation preview:

1. **Lesson Plan & Academic Delivery (50 Marks):** Binary (100% covered = 50, otherwise 0).
2. **Result Performance (150 Marks):** Slabs (`<50%`: 0 | `50-60%`: 40 | `60-70%`: 80 | `70-80%`: 100 | `80-90%`: 110 | `90-95%`: 120 | `>95%`: 150).
3. **Student Attendance (150 Marks):** Average attendance across all taught subjects (`<50%`: 0 | `50-60%`: 40 | `60-70%`: 80 | `70-80%`: 100 | `80-90%`: 110 | `90-95%`: 120 | `>95%`: 150).
4. **Student Feedback (50 Marks):** Min 5 responses. (`<4.0`: 0 | `4.0-4.5`: 25 | `>4.5`: 50).
5. **Admissions Contribution (50 Marks):** 2 marks per admission (Max 50).
6. **Teaching Load (30 Marks):** Binary (100% classes conducted according to timetable = 30, otherwise 0).
7. **Course File Maintenance (20 Marks):** Binary (100% complete and updated = 20, otherwise 0).
8. **Research Publications (50 Marks):** Scopus/WoS, first-author only (1st: 15 | 2nd: 15 | 3rd: 10 | 4th: 10).
9. **Books / Book Chapters (50 Marks):** First-author only (1st: 15 | 2nd: 15 | 3rd: 10 | 4th: 10).
10. **Research Projects (40 Marks):** Submitted = 10 each, Sanctioned = 20 each (Max 40).
11. **Conference Participation (30 Marks):** 5 marks per eligible item (Max 30).
12. **FDP / Workshop Participation (30 Marks):** 5 marks per eligible 5-day item (Max 30).
13. **Additional Certification (20 Marks):** NASSCOM FutureSkills Prime, 5 marks per item (Max 20).
14. **Mentorship (100 Marks):** % of mentees completing $\ge 1$ certification (`<70%`: 0 | `70-80%`: 20 | `80-90%`: 60 | `90-95%`: 80 | `>95%`: 100).
15. **Alumni Engagement (100 Marks):** % of assigned alumni engaged through Vaave (`<70%`: 0 | `70-80%`: 20 | `80-90%`: 60 | `90-95%`: 80 | `>95%`: 100).
16. **Event Coordination (40 Marks):** 1st event: 15 | 2nd: 15 | 3rd: 10 (Max 40).
17. **Admin Responsibilities (40 Marks):** Binary (100% assigned duties completed = 40, otherwise 0).

**Sum of Faculty Max Marks:** $50+150+150+50+50+30+20+50+50+40+30+30+20+100+100+40+40 = \mathbf{1,000\ Marks}$.

---

### 2. HOD Evaluation Framework (1,000 Marks Total)
Follows the institutional **60/40 Rule**:
* **Departmental Performance (400 Marks):** Department academic results, placements, research & grant output, accreditation/NAAC readiness.
* **Self Performance (600 Marks):** Academic planning, curriculum execution, faculty mentoring, student engagement, and administrative leadership.

---

### 3. HOI Evaluation Framework (1,000 Marks Total)
Follows the institutional **50/50 Rule**:
* **Institutional Performance (500 Marks):** Campus admissions intake, NAAC/NIRF ranking, placements & corporate MoUs, research infrastructure.
* **Self Performance (500 Marks):** Strategic roadmap, fiscal management & sustainability, faculty retention, and institutional branding.

---

## 🖥️ Dashboards & Core Portals

* **`/faculty`**: Profile banner, 1,000-mark meter, live scoring calculation engine, modal submission cards, evidence attachment, revision workflows, and PDF/Excel export.
* **`/hod`**: Department statistics, faculty submission review & scoring queue, HOD 400+600 evaluation form, and department reports.
* **`/hoi`**: Campus overview, multi-department comparison, HOI 500+500 evaluation form, and institutional performance analytics.
* **`/admin`**: Global KPI cards, user approval/rejection workflows, review system with score override & mandatory audit comments, dynamic category configuration, live tamper-proof audit trail, and full Excel export.
* **`/login` & `/register`**: Strict institutional onboarding with college ID validation, password hashing, and pending-approval controls.

---

## 📈 Reports & Analytics

1. **Excel Generation (`.xlsx`):** Generates structured multi-sheet workbooks distinguishing:
   * **Auto-Calculated Scores** (engine output)
   * **Claimed Scores** (self-appraisal)
   * **Approved Scores** (administrative review)
2. **Print / PDF Export:** Clean, printable view formatted with dedicated `@media print` stylesheets.

---

## 🛠️ Management & Deployment Commands

```bash
# Navigate to web application directory
cd web

# Run production build
npm run build

# Start production server
npm run start

# Run development mode
npm run dev
```
