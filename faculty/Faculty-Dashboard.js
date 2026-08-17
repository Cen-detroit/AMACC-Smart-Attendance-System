/* ==========================================================
   AMA FACULTY ATTENDANCE DASHBOARD
   OPTION A FACULTY AUTHENTICATION
   Faculty accounts use faculty_accounts.id
   Attendance:
   FIRST SCAN  -> TIME IN
   SECOND SCAN -> TIME OUT
   ========================================================== */

let attendanceRecords = [];
let historyRecords = [];
let students = [];
let realtimeChannel = null;

/* ==========================================================
   GET TODAY
   ========================================================== */
function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/* ==========================================================
   FORMAT TIME
   ========================================================== */
function formatTime(dateTime) {
    if (!dateTime) return "--:--";
    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
}

/* ==========================================================
   FORMAT DATE
   ========================================================== */
function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

/* ==========================================================
   ESCAPE HTML
   ========================================================== */
function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================================
   LOAD STUDENTS
   ========================================================== */
async function loadStudents() {
    const { data, error } = await sb
        .from("students")
        .select(`
            id,
            student_number,
            full_name,
            photo_url,
            status,
            course,
            year_level,
            department,
            major
        `)
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Error loading students:", error);
        students = [];
        return;
    }

    students = data || [];
    console.log("Students loaded:", students.length);
}

/* ==========================================================
   LOAD TODAY'S ATTENDANCE
   ========================================================== */
async function loadAttendanceRecords() {
    const today = getToday();

    const { data, error } = await sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            attendance_date,
            time_in,
            time_out,
            status,
            remarks,
            created_at
        `)
        .eq("attendance_date", today);

    if (error) {
        console.error("Attendance Error:", error);
        attendanceRecords = [];
        return;
    }

    attendanceRecords = data || [];
    console.log("Today's Attendance:", attendanceRecords);
}

/* ==========================================================
   LOAD FACULTY PROFILE
   ========================================================== */
async function loadFacultyProfile() {
    if (!currentFaculty) return false;

    const facultyId = Number(currentFaculty.id);

    if (!Number.isFinite(facultyId)) {
        console.error("Invalid faculty ID:", currentFaculty.id);
        return false;
    }

    console.log("Loading faculty profile using faculty_accounts.id:", facultyId);

    const { data, error } = await sb.rpc("get_faculty_profile", {
        p_id: facultyId
    });

    if (error) {
        console.error("Faculty profile error:", error);
        return false;
    }

    if (!data || data.length === 0) {
        console.error("No faculty profile found for ID:", facultyId);
        return false;
    }

    currentFaculty = data[0];

    console.log("Faculty profile loaded:", currentFaculty);

    localStorage.setItem("faculty", JSON.stringify(currentFaculty));

    return true;
}

/* ==========================================================
   INITIALIZE
   ========================================================== */
async function init() {
    console.log("Initializing Faculty Dashboard...");

    let saved = null;

    try {
        saved = JSON.parse(localStorage.getItem("faculty"));
    } catch (error) {
        console.error("Invalid faculty session:", error);
    }

    if (!saved || saved.id === undefined || saved.id === null) {
        console.warn("No faculty session found.");
        window.location.replace("login.html");
        return false;
    }

    console.log("Saved Faculty Session:", saved);

    currentFaculty = saved;

    const profileLoaded = await loadFacultyProfile();

    if (!profileLoaded) {
        console.error("Unable to load faculty profile.");
        localStorage.removeItem("faculty");
        alert("Unable to load your faculty profile. Please log in again.");
        window.location.replace("login.html");
        return false;
    }

    await loadStudents();
    await loadAttendanceRecords();

    loadAttendanceFilters();
    setupAttendanceFilters();

    await renderAttendanceManagement();
    await renderRecentAttendance();
    await renderHistory();
    await loadFacultyReportHistory();

    updateDashboard();
    loadProfile();
    updateDateTime();

    setInterval(updateDateTime, 1000);

    setupImageUpload();
    subscribeRealtime();

    console.log("Faculty Dashboard initialized successfully.");
    console.log("Logged-in Faculty:", currentFaculty.full_name);

    return true;
}

/* ==========================================================
   DATE AND TIME
   ========================================================== */
function updateDateTime() {
    const now = new Date();

    const dayElement = document.getElementById("currentDay");
    const dateElement = document.getElementById("currentDate");
    const timeElement = document.getElementById("currentTime");

    if (dayElement) {
        dayElement.textContent = now.toLocaleDateString("en-US", {
            weekday: "long"
        });
    }

    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        });
    }
}

/* ==========================================================
   SECTION NAVIGATION
   ========================================================== */
window.showSection = function(section, element) {
    const sections = {
        dashboard: "overviewSection",
        attendance: "attendanceSection",
        history: "historySection",
        reports: "reportsSection",
        settings: "settingsSection"
    };

    Object.values(sections).forEach(id => {
        const sectionElement = document.getElementById(id);
        if (sectionElement) sectionElement.style.display = "none";
    });

    document.querySelectorAll(".menu-link").forEach(link => {
        link.classList.remove("active");
    });

    if (element) element.classList.add("active");

    const selected = document.getElementById(sections[section]);

    if (selected) selected.style.display = "block";

    if (section === "attendance") {
        renderAttendanceManagement();
    }

    if (section === "history") {
        renderHistory();
    }

    if (section === "dashboard") {
        renderRecentAttendance();
    }

    if (section === "reports") {
        loadFacultyReportHistory();
    }
};

/* ==========================================================
   DASHBOARD STATISTICS
   ========================================================== */
function updateDashboard() {
    const totalStudents = students.length;
    const presentStudentIds = new Set();
    const lateStudentIds = new Set();

    attendanceRecords.forEach(attendance => {
        if (!attendance.student_id) return;

        const studentId = String(attendance.student_id);

        if (attendance.status === "Present") {
            presentStudentIds.add(studentId);
        }

        if (attendance.status === "Late") {
            lateStudentIds.add(studentId);
        }
    });

    const present = presentStudentIds.size;
    const late = lateStudentIds.size;
    const absent = Math.max(0, totalStudents - present - late);

    const totalElement = document.getElementById("totalStudents");
    const presentElement = document.getElementById("presentStudents");
    const lateElement = document.getElementById("lateStudents");
    const absentElement = document.getElementById("absentStudents");

    if (totalElement) totalElement.textContent = totalStudents;
    if (presentElement) presentElement.textContent = present;
    if (lateElement) lateElement.textContent = late;
    if (absentElement) absentElement.textContent = absent;
}

/* ==========================================================
   GET TODAY'S ATTENDANCE WITH STUDENT
   ========================================================== */
async function getTodayAttendance() {
    const today = getToday();

    const { data, error } = await sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            attendance_date,
            time_in,
            time_out,
            status,
            remarks,
            created_at,
            students (
                id,
                full_name,
                student_number,
                course,
                year_level
            )
        `)
        .eq("attendance_date", today)
        .order("time_in", {
            ascending: false,
            nullsFirst: false
        });

    if (error) {
        console.error("Attendance Error:", error);
        return [];
    }

    return data || [];
}

/* ==========================================================
   RENDER LIVE ATTENDANCE
   ========================================================== */
async function renderAttendanceManagement() {
    const tbody = document.getElementById("attendanceManagementTable");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center;">
                Loading attendance...
            </td>
        </tr>
    `;

    const records = await getTodayAttendance();

    if (!records.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    No attendance today.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";

    records.forEach(record => {
        const student = record.students;
        const status = record.status || "Present";

        let statusClass = "";

        if (status === "Present") {
            statusClass = "status-present";
        } else if (status === "Late") {
            statusClass = "status-late";
        } else if (status === "Absent") {
            statusClass = "status-absent";
        }

        tbody.innerHTML += `
            <tr>
                <td>${escapeHTML(student?.full_name ?? "-")}</td>
                <td>${escapeHTML(student?.student_number ?? "-")}</td>
                <td>${escapeHTML(student?.course ?? "-")}</td>
                <td>${escapeHTML(student?.year_level ?? "-")}</td>
                <td>${formatTime(record.time_in)}</td>
                <td>${formatTime(record.time_out)}</td>
                <td>
                    <span class="${statusClass}">
                        ${escapeHTML(status)}
                    </span>
                </td>
            </tr>
        `;
    });

    applyAttendanceFilters();
}

/* ==========================================================
   RECENT ATTENDANCE
   ========================================================== */
async function renderRecentAttendance() {
    const container = document.getElementById("recentAttendance");

    if (!container) return;

    container.innerHTML = `
        <div class="activity-empty">
            Loading attendance...
        </div>
    `;

    const today = getToday();

    const { data, error } = await sb
        .from("attendance_records")
        .select(`
            status,
            time_in,
            time_out,
            students (
                full_name,
                student_number,
                course,
                year_level
            )
        `)
        .eq("attendance_date", today)
        .order("time_in", {
            ascending: false,
            nullsFirst: false
        })
        .limit(5);

    if (error) {
        console.error("Recent attendance error:", error);

        container.innerHTML = `
            <div class="activity-empty">
                Unable to load attendance.
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="activity-empty">
                Waiting for students to scan...
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    data.forEach(record => {
        const timeIn = formatTime(record.time_in);
        const timeOut = formatTime(record.time_out);
        const student = record.students;
        const status = record.status || "Present";

        container.innerHTML += `
            <div class="activity-item">
                <div class="activity-time">
                    ${timeIn}
                </div>
                <div class="activity-details">
                    <strong>
                        ${escapeHTML(student?.full_name ?? "-")}
                    </strong>
                    <br>
                    <small>
                        ${escapeHTML(student?.student_number ?? "-")}
                        • Time In: ${timeIn}
                        • Time Out: ${timeOut}
                        • ${escapeHTML(status)}
                    </small>
                </div>
            </div>
        `;
    });
}

/* ==========================================================
   ATTENDANCE HISTORY
   ========================================================== */
async function renderHistory() {
    const tbody = document.getElementById("historyTable");
    const resultInfo = document.getElementById("historyResultInfo");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center;padding:30px;">
                Loading attendance history...
            </td>
        </tr>
    `;

    if (resultInfo) {
        resultInfo.textContent = "Loading attendance history...";
    }

    const { data, error } = await sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            attendance_date,
            time_in,
            time_out,
            status,
            remarks,
            created_at,
            students (
                id,
                student_number,
                full_name,
                course,
                year_level
            )
        `)
        .order("attendance_date", {
            ascending: false
        })
        .order("time_in", {
            ascending: false,
            nullsFirst: false
        });

    if (error) {
        console.error("Attendance History Error:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:30px;">
                    <strong>
                        Unable to load attendance history.
                    </strong>
                    <br>
                    <small>
                        ${escapeHTML(
                            error.message ||
                            "Unknown database error."
                        )}
                    </small>
                </td>
            </tr>
        `;

        if (resultInfo) {
            resultInfo.textContent = "Unable to load attendance history.";
        }

        return;
    }

    historyRecords = data || [];

    populateHistoryFilters();
    applyHistoryFilters();
}

/* ==========================================================
   POPULATE HISTORY FILTERS
   ========================================================== */
function populateHistoryFilters() {
    const courseSelect = document.getElementById("historyFilterCourse");
    const yearSelect = document.getElementById("historyFilterYear");

    if (!courseSelect || !yearSelect) return;

    const courses = [
        ...new Set(
            historyRecords
                .map(record => record.students?.course)
                .filter(
                    value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
        )
    ].sort((a, b) =>
        String(a).localeCompare(String(b))
    );

    const years = [
        ...new Set(
            historyRecords
                .map(record => record.students?.year_level)
                .filter(
                    value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
        )
    ].sort((a, b) =>
        String(a).localeCompare(String(b))
    );

    courseSelect.innerHTML = `<option value="">All Courses</option>`;

    courses.forEach(course => {
        const option = document.createElement("option");
        option.value = String(course);
        option.textContent = String(course);
        courseSelect.appendChild(option);
    });

    yearSelect.innerHTML = `<option value="">All Years</option>`;

    years.forEach(year => {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = String(year);
        yearSelect.appendChild(option);
    });
}

/* ==========================================================
   APPLY HISTORY FILTERS
   ========================================================== */
function applyHistoryFilters() {
    const search = document
        .getElementById("historySearchStudent")
        ?.value
        .toLowerCase()
        .trim() || "";

    const date = document.getElementById("historyFilterDate")?.value || "";
    const course = document.getElementById("historyFilterCourse")?.value || "";
    const year = document.getElementById("historyFilterYear")?.value || "";
    const status = document.getElementById("historyFilterStatus")?.value || "";

    const tbody = document.getElementById("historyTable");
    const resultInfo = document.getElementById("historyResultInfo");

    if (!tbody) return;

    const filteredRecords = historyRecords.filter(record => {
        const student = record.students || {};

        const studentName = String(
            student.full_name || ""
        ).toLowerCase();

        const studentNumber = String(
            student.student_number || ""
        ).toLowerCase();

        const studentCourse = String(
            student.course || ""
        );

        const studentYear = String(
            student.year_level || ""
        );

        const recordStatus = String(
            record.status || "Present"
        );

        const matchesSearch =
            search === "" ||
            studentName.includes(search) ||
            studentNumber.includes(search);

        const matchesDate =
            date === "" ||
            record.attendance_date === date;

        const matchesCourse =
            course === "" ||
            studentCourse === course;

        const matchesYear =
            year === "" ||
            studentYear === year;

        const matchesStatus =
            status === "" ||
            recordStatus === status;

        return (
            matchesSearch &&
            matchesDate &&
            matchesCourse &&
            matchesYear &&
            matchesStatus
        );
    });

    renderFilteredHistory(filteredRecords);

    if (resultInfo) {
        resultInfo.textContent =
            `Showing ${filteredRecords.length} of ${historyRecords.length} attendance record${
                historyRecords.length === 1 ? "" : "s"
            }.`;
    }
}

/* ==========================================================
   RENDER FILTERED HISTORY
   ========================================================== */
function renderFilteredHistory(records) {
    const tbody = document.getElementById("historyTable");

    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:35px;">
                    <strong>
                        No attendance records found.
                    </strong>
                    <br>
                    <small>
                        Try changing or clearing your filters.
                    </small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";

    records.forEach(record => {
        const student = record.students || {};
        const status = record.status || "Present";

        let statusClass = "";

        if (status === "Present") {
            statusClass = "status-present";
        } else if (status === "Late") {
            statusClass = "status-late";
        } else if (status === "Absent") {
            statusClass = "status-absent";
        }

        const remarks = record.remarks || "";

        tbody.innerHTML += `
            <tr>
                <td>${formatDate(record.attendance_date)}</td>
                <td>${escapeHTML(student.full_name || "-")}</td>
                <td>${escapeHTML(student.student_number || "-")}</td>
                <td>${escapeHTML(student.course || "-")}</td>
                <td>${escapeHTML(student.year_level || "-")}</td>
                <td>${formatTime(record.time_in)}</td>
                <td>${formatTime(record.time_out)}</td>
                <td>
                    <span
                        class="${statusClass}"
                        title="${escapeHTML(remarks)}"
                    >
                        ${escapeHTML(status)}
                    </span>
                </td>
            </tr>
        `;
    });
}

/* ==========================================================
   ATTENDANCE FILTERS
   ========================================================== */
function applyAttendanceFilters() {
    const search = document
        .getElementById("searchStudent")
        ?.value
        .toLowerCase()
        .trim() || "";

    const course = document.getElementById("filterCourse")?.value || "";
    const year = document.getElementById("filterYear")?.value || "";
    const status = document.getElementById("filterStatus")?.value || "";

    const rows = document.querySelectorAll(
        "#attendanceManagementTable tr"
    );

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");

        if (cells.length < 7) return;

        const studentName = cells[0].innerText.toLowerCase();
        const studentNumber = cells[1].innerText.toLowerCase();
        const studentCourse = cells[2].innerText.trim();
        const studentYear = cells[3].innerText.trim();
        const studentStatus = cells[6].innerText.trim();

        const matchesSearch =
            search === "" ||
            studentName.includes(search) ||
            studentNumber.includes(search);

        const matchesCourse =
            course === "" ||
            studentCourse === course;

        const matchesYear =
            year === "" ||
            studentYear === year;

        const matchesStatus =
            status === "" ||
            studentStatus === status;

        row.style.display =
            matchesSearch &&
            matchesCourse &&
            matchesYear &&
            matchesStatus
                ? ""
                : "none";
    });
}

/* ==========================================================
   LOAD FILTER OPTIONS
   ========================================================== */
function loadAttendanceFilters() {
    const courseSelect = document.getElementById("filterCourse");
    const yearSelect = document.getElementById("filterYear");

    if (!courseSelect || !yearSelect) return;

    const courses = [
        ...new Set(
            students
                .map(student => student.course)
                .filter(
                    value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
        )
    ].sort((a, b) =>
        String(a).localeCompare(String(b))
    );

    const years = [
        ...new Set(
            students
                .map(student => student.year_level)
                .filter(
                    value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
        )
    ].sort((a, b) =>
        String(a).localeCompare(String(b))
    );

    courseSelect.innerHTML = `<option value="">All Courses</option>`;

    courses.forEach(course => {
        const option = document.createElement("option");
        option.value = course;
        option.textContent = course;
        courseSelect.appendChild(option);
    });

    yearSelect.innerHTML = `<option value="">All Years</option>`;

    years.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

/* ==========================================================
   FILTER EVENT LISTENERS
   ========================================================== */
function setupAttendanceFilters() {
    const search = document.getElementById("searchStudent");
    const course = document.getElementById("filterCourse");
    const year = document.getElementById("filterYear");
    const status = document.getElementById("filterStatus");

    if (search) {
        search.addEventListener("input", applyAttendanceFilters);
    }

    if (course) {
        course.addEventListener("change", applyAttendanceFilters);
    }

    if (year) {
        year.addEventListener("change", applyAttendanceFilters);
    }

    if (status) {
        status.addEventListener("change", applyAttendanceFilters);
    }
}

/* ==========================================================
   SEND FACULTY REPORT
   ========================================================== */
window.sendReport = async function() {
    if (!currentFaculty) {
        alert("Faculty profile is not loaded. Please log in again.");
        return;
    }

    const subjectElement = document.getElementById("reportSubject");
    const messageElement = document.getElementById("reportMessage");
    const statusElement = document.getElementById("reportStatus");

    if (!subjectElement || !messageElement || !statusElement) return;

    const subject = subjectElement.value.trim();
    const message = messageElement.value.trim();

    if (!subject) {
        statusElement.innerHTML = `
            <span style="color:#b91c1c;font-weight:bold;">
                Please enter a report subject.
            </span>
        `;
        subjectElement.focus();
        return;
    }

    if (!message) {
        statusElement.innerHTML = `
            <span style="color:#b91c1c;font-weight:bold;">
                Please enter your report message.
            </span>
        `;
        messageElement.focus();
        return;
    }

    const sendButton = document.querySelector(
        '#reportsSection button[onclick="sendReport()"]'
    );

    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "Sending...";
    }

    statusElement.innerHTML = `
        <span style="color:#555;font-weight:bold;">
            Sending report...
        </span>
    `;

    const { data, error } = await createFacultyReport(
        currentFaculty.id,
        subject,
        message
    );

    if (error) {
        console.error("Faculty report error:", error);

        statusElement.innerHTML = `
            <span style="color:#b91c1c;font-weight:bold;">
                Failed to send report.
                <br>
                <small>
                    ${escapeHTML(
                        error.message ||
                        "Unknown database error."
                    )}
                </small>
            </span>
        `;

        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = "Send Report";
        }

        return;
    }

    console.log("Faculty report submitted:", data);

    statusElement.innerHTML = `
        <span style="color:#16a34a;font-weight:bold;">
            ✓ Report sent successfully.
        </span>
    `;

    subjectElement.value = "";
    messageElement.value = "";

    if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "Send Report";
    }

    await loadFacultyReportHistory();
};

/* ==========================================================
   LOAD FACULTY REPORT HISTORY
   ========================================================== */
async function loadFacultyReportHistory() {
    if (!currentFaculty) return;

    const container = document.getElementById("facultyReportHistory");

    if (!container) return;

    container.innerHTML = `
        <div class="activity-empty">
            Loading reports...
        </div>
    `;

    const { data, error } = await getFacultyReports(
        currentFaculty.id
    );

    if (error) {
        console.error("Faculty report history error:", error);

        container.innerHTML = `
            <div class="activity-empty">
                Unable to load reports.
                <br>
                <small>
                    ${escapeHTML(
                        error.message ||
                        "Unknown database error."
                    )}
                </small>
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="activity-empty">
                No reports submitted yet.
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    data.forEach(report => {
        let statusClass = "report-pending";

        if (report.status === "Reviewed") {
            statusClass = "report-reviewed";
        }

        if (report.status === "Resolved") {
            statusClass = "report-resolved";
        }

        const reportDate = report.created_at
            ? new Date(report.created_at).toLocaleString(
                "en-US",
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                }
            )
            : "-";

        container.innerHTML += `
            <div class="report-history-item">
                <div class="report-history-header">
                    <strong>
                        ${escapeHTML(report.subject)}
                    </strong>
                    <span class="${statusClass}">
                        ${escapeHTML(report.status)}
                    </span>
                </div>
                <div class="report-history-date">
                    ${escapeHTML(reportDate)}
                </div>
                <div class="report-history-message">
                    ${escapeHTML(report.message)}
                </div>
            </div>
        `;
    });
}

/* ==========================================================
   SAVE FACULTY PROFILE
   ========================================================== */
window.saveProfile = async function() {
    if (!currentFaculty) {
        alert("Faculty profile is not loaded.");
        return;
    }

    const nameElement = document.getElementById("facultyName");
    const emailElement = document.getElementById("facultyEmail");
    const passwordElement = document.getElementById("facultyPassword");

    if (!nameElement || !emailElement || !passwordElement) return;

    const fullName = nameElement.value.trim();
    const email = emailElement.value.trim();
    const password = passwordElement.value.trim();

    if (!fullName || !email) {
        alert("Please complete all required fields.");
        return;
    }

    const updateData = {
        full_name: fullName,
        email: email
    };

    const { error } = await sb
        .from("faculty_accounts")
        .update(updateData)
        .eq("id", currentFaculty.id);

    if (error) {
        console.error("Profile update error:", error);

        alert(
            "Unable to update profile.\n\n" +
            error.message
        );

        return;
    }

    currentFaculty.full_name = fullName;
    currentFaculty.email = email;

    localStorage.setItem(
        "faculty",
        JSON.stringify(currentFaculty)
    );

    loadProfile();

    passwordElement.value = "";

    alert("Profile updated successfully.");
};

/* ==========================================================
   LOAD FACULTY PROFILE INTO UI
   ========================================================== */
function loadProfile() {
    if (!currentFaculty) return;

    const namePreview = document.getElementById("facultyNamePreview");
    const emailPreview = document.getElementById("facultyEmailPreview");
    const nameInput = document.getElementById("facultyName");
    const emailInput = document.getElementById("facultyEmail");
    const reportSender = document.getElementById("reportSender");

    if (namePreview) {
        namePreview.innerText = currentFaculty.full_name || "Faculty";
    }

    if (emailPreview) {
        emailPreview.innerText = currentFaculty.email || "No Email";
    }

    if (nameInput) {
        nameInput.value = currentFaculty.full_name || "";
    }

    if (emailInput) {
        emailInput.value = currentFaculty.email || "";
    }

    if (reportSender) {
        reportSender.value = currentFaculty.full_name || "";
    }

    const savedImage = localStorage.getItem("facultyImage");
    const preview = document.getElementById("facultyPreview");

    if (savedImage && preview) {
        preview.src = savedImage;
    }
}

/* ==========================================================
   PROFILE IMAGE UPLOAD
   ========================================================== */
function setupImageUpload() {
    const uploadBox = document.getElementById("uploadBox");
    const imageInput = document.getElementById("facultyImage");

    if (!uploadBox || !imageInput) return;

    uploadBox.addEventListener("click", () => {
        imageInput.click();
    });

    imageInput.addEventListener("change", function() {
        const file = this.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function(event) {
            const imageData = event.target.result;

            localStorage.setItem(
                "facultyImage",
                imageData
            );

            const preview = document.getElementById(
                "facultyPreview"
            );

            if (preview) {
                preview.src = imageData;
            }
        };

        reader.readAsDataURL(file);
    });
}

/* ==========================================================
   REALTIME ATTENDANCE
   ========================================================== */
function subscribeRealtime() {
    if (realtimeChannel) {
        try {
            sb.removeChannel(realtimeChannel);
        } catch (error) {
            console.warn(
                "Unable to remove previous realtime channel:",
                error
            );
        }
    }

    realtimeChannel = sb
        .channel("attendance-live")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "attendance_records"
            },
            async payload => {
                console.log(
                    "Attendance change detected:",
                    payload
                );

                await loadAttendanceRecords();
                await renderAttendanceManagement();
                await renderRecentAttendance();
                await renderHistory();

                updateDashboard();
            }
        )
        .subscribe(status => {
            console.log(
                "Realtime Status:",
                status
            );
        });
}

/* ==========================================================
   LOGOUT
   ========================================================== */
window.logout = async function() {
    if (realtimeChannel) {
        try {
            await sb.removeChannel(realtimeChannel);
        } catch (error) {
            console.warn(
                "Realtime channel cleanup warning:",
                error
            );
        }

        realtimeChannel = null;
    }

    localStorage.removeItem("faculty");
    localStorage.removeItem("loggedIn");

    window.location.href = "login.html";
};

/* ==========================================================
   START DASHBOARD
   ========================================================== */
document.addEventListener("DOMContentLoaded", async () => {
    await init();
});