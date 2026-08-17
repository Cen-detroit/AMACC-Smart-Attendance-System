/* ===== STATE ===== */
let currentFaculty = null;
let attendanceRecords = [];
let students = [];
/* ===== LOAD STUDENTS ===== */
async function loadStudents(){
    const { data, error } = await sb
        .from("students")
        .select("*")
        .order("full_name", { ascending: true });
    if(error){
        console.error("Error loading students:", error);
        return;
    }
    students = data;
    console.log("Students Loaded:", students);
    renderAttendanceManagement();
    renderRecentAttendance();
    updateDashboard();
}
async function loadAttendanceRecords() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await sb
        .from("attendance_records")
        .select("*")
        .eq("attendance_date", today);
    if (error) {
        console.error("Attendance Error:", error);
        return;
    }
    attendanceRecords = data || [];
    console.log("Today's Attendance:", attendanceRecords);
    updateDashboard();
}
/* ===== INIT: VERIFY SESSION, THEN LOAD PAGE ===== */
async function init(){
    let saved =
    JSON.parse(localStorage.getItem("faculty"));
    if(!saved || !saved.id){
        window.location.replace("Login.html");
        return;
    }
    // Re-check against the database so a deleted/edited account
    // can't keep using a stale localStorage session forever.
    const { data, error } =
    await sb.rpc("get_faculty_profile", {
        p_id: saved.id
    });
    if(error || !data || data.length === 0){
        localStorage.removeItem("faculty");
        window.location.replace("Login.html");
        return;
    }
    currentFaculty = data[0];
    console.log(currentFaculty);
    localStorage.setItem(
        "faculty",
        JSON.stringify(currentFaculty)
    );
    await loadStudents();
    await loadAttendanceRecords();
    await loadMySubjects();
    updateDateTime();
    loadProfile();
    setInterval(updateDateTime,1000);
    setupImageUpload();
    subscribeRealtime();
}

window.addEventListener("load", init);
/* ===== SIDEBAR ===== */
window.showSection = function(section, element){
    document.getElementById("overviewSection").style.display = "none";
    document.getElementById("attendanceSection").style.display = "none";
    document.getElementById("subjectsSection").style.display = "none";
    document.getElementById("historySection").style.display = "none";
    document.getElementById("reportsSection").style.display = "none";
    document.getElementById("settingsSection").style.display = "none";
    document.querySelectorAll(".menu-link")
    .forEach(link => {
        link.classList.remove("active");
    });
    if (element) element.classList.add("active");
    if(section === "dashboard"){
    document.getElementById("overviewSection")
    .style.display = "block";
    }
    if(section === "attendance"){
        document.getElementById("attendanceSection")
        .style.display = "block";
    }
    
    if(section === "subjects"){
        document.getElementById("subjectsSection")
            .style.display = "block";
    }
    if(section === "history"){
        document.getElementById("historySection")
            .style.display = "block";
    }
    if(section === "reports"){
        document.getElementById("reportsSection")
        .style.display = "block";
    }
    if(section === "settings"){
        document.getElementById("settingsSection")
        .style.display = "block";
    }
}
/* ===== DASHBOARD ===== */
function updateDashboard() {
    const totalStudents = students.length;
    const present = attendanceRecords.filter(
        a => a.status === "Present"
    ).length;
    const late = attendanceRecords.filter(
        a => a.status === "Late"
    ).length;
    const absent = totalStudents - present - late;
    document.getElementById("totalStudents").textContent =
        totalStudents;
    document.getElementById("presentStudents").textContent =
        present;
    document.getElementById("lateStudents").textContent =
        late;
    document.getElementById("absentStudents").textContent =
        absent < 0 ? 0 : absent;
}

/* ===== ATTENDANCE TABLE ===== */

async function renderAttendanceManagement() {

    const tbody = document.getElementById("attendanceManagementTable");
    tbody.innerHTML = "";

    const today = new Date().toISOString().split("T")[0];

    // Step 1: Get attendance records with students
    const { data, error } = await sb
        .from("attendance_records")
        .select(`
            id,
            status,
            time_in,
            students (
                id,
                full_name,
                student_number,
                section_id
            )
        `)
        .eq("attendance_date", today)
        .order("time_in", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    No attendance today.
                </td>
            </tr>
        `;
        return;
    }

    // Step 2: Load sections and courses separately
    const { data: sections, error: sectionsError } = await sb
        .from("sections")
        .select(`
            id,
            section_name,
            year_level,
            courses ( course_name )
        `);

    if (sectionsError) {
        console.error(sectionsError);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    Unable to load section data.
                </td>
            </tr>
        `;
        return;
    }

    // Create lookup map
    const sectionMap = {};
    (sections || []).forEach(s => sectionMap[s.id] = s);

    // Step 3: Render table
    data.forEach(record => {

        const section = sectionMap[record.students.section_id];

        const course = section?.courses?.course_name || "-";
        const year = section?.year_level || "-";

        const time = record.time_in
            ? new Date(record.time_in).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            })
            : "--:--";

        tbody.innerHTML += `
            <tr>
                <td>${record.students.full_name}</td>
                <td>${record.students.student_number}</td>
                <td>${course}</td>
                <td>${year}</td>
                <td>${time}</td>
                <td>
                    <span class="${
                        record.status === "Present"
                            ? "status-present"
                            : "status-late"
                    }">
                        ${record.status}
                    </span>
                </td>
            </tr>
        `;
    });
}

/* ===== RECENT ATTENDANCE ===== */

async function renderRecentAttendance() {

    const container = document.getElementById("recentAttendance");
    container.innerHTML = "";

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await sb
        .from("attendance_records")
        .select(`
            status,
            time_in,
            students (
                full_name,
                section_id
            )
        `)
        .eq("attendance_date", today)
        .order("time_in", { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }

    if (data.length === 0) {
        container.innerHTML = `
            <div class="activity-empty">
                Waiting for students to scan...
            </div>
        `;
        return;
    }

    data.forEach(record => {

        const time = new Date(record.time_in).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });

        container.innerHTML += `
            <div class="activity-item">
                <div class="activity-time">${time}</div>
                <div class="activity-details">
                     <strong>${record.students.full_name}</strong><br>
                    <small>${record.status}</small>
                </div>
            </div>
        `;
    });
}

/* ===== MY SUBJECTS ===== */

async function loadMySubjects() {

    const tbody = document.getElementById("subjectsTable");
    tbody.innerHTML = "";

    const { data, error } = await sb
        .from("faculty_subjects")
        .select(`
            subject_id,
            section_id,
            subjects (
                subject_code,
                subject_name
            ),
            sections (
                section_name
            )
        `)
        .eq("faculty_id", currentFaculty.id);

    if (error) {
        console.error(error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4">Unable to load subjects.</td>
            </tr>
        `;
        return;
    }

    if (!data.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">No subjects assigned.</td>
            </tr>
        `;
        return;
    }

    // Run all the per-subject counts in parallel instead of one at a time
    const rows = await Promise.all(data.map(async (item) => {
        const { count } = await sb
            .from("student_subjects")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("subject_id", item.subject_id)
            .eq("section_id", item.section_id);
        return { item, count };
    }));

    rows.forEach(({ item, count }) => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <strong>${item.subjects.subject_code}</strong><br>
                    ${item.subjects.subject_name}
                </td>

                <td>
                    ${item.sections.section_name}
                </td>

                <td>
                    ${count || 0}
                </td>

                <td>
                    Active
                </td>
            </tr>
        `;
    });

}

/* ===== SEND REPORT ===== */
window.sendReport = function(){
    let sender =
    document.getElementById("reportSender")
    .value.trim();
    let subject =
    document.getElementById("reportSubject")
    .value.trim();
    let message =
    document.getElementById("reportMessage")
    .value.trim();
    let status =
    document.getElementById("reportStatus");
    if(
        sender === "" ||
        subject === "" ||
        message === ""
    ){
        status.innerHTML =
        "<span style='color:#b91c1c;font-weight:bold;'>Please fill out all fields.</span>";
        return;
    }
    let reports =
    JSON.parse(localStorage.getItem("facultyReports"))
    || [];
    let reportData = {
        sender: sender,
        subject: subject,
        message: message,
        time: new Date().toLocaleString()
    };
    reports.unshift(reportData);
    localStorage.setItem(
        "facultyReports",
        JSON.stringify(reports)
    );
    status.innerHTML =
    "<span style='color:#16a34a;font-weight:bold;'>Report sent successfully.</span>";
    document.getElementById("reportSender").value = "";
    document.getElementById("reportSubject").value = "";
    document.getElementById("reportMessage").value = "";
}

/* ===== PROFILE ===== */
window.saveProfile = function(){
    // NOTE: this currently only updates the local display cache.
    // Saving name/email changes back to faculty_accounts (and
    // handling password changes securely) is a separate step —
    // ask me to wire it up if you want it to persist for real.
    let name =
    document.getElementById("facultyName").value;
    let email =
    document.getElementById("facultyEmail").value;
    localStorage.setItem("facultyNameOverride", name);
    localStorage.setItem("facultyEmailOverride", email);
    alert("Profile updated locally. Ask me to connect this to Supabase if you want it to persist for real.");
}

/* ===== LOAD PROFILE ===== */
function loadProfile(){
    if(!currentFaculty) return;
    document.getElementById("facultyNamePreview").innerText =
    currentFaculty.full_name;
    document.getElementById("facultyEmailPreview").innerText =
    currentFaculty.email || "No Email";
    document.getElementById("facultyName").value =
    currentFaculty.full_name;
    document.getElementById("facultyEmail").value =
    currentFaculty.email || "";
    document.getElementById("reportSender").value =
    currentFaculty.full_name;
    const savedImage =
    localStorage.getItem("facultyImage");
    if(savedImage){
        document.getElementById("facultyPreview").src =
        savedImage;
    }
}
/* ===== IMAGE UPLOAD ===== */
function setupImageUpload(){
    const uploadBox =
    document.getElementById("uploadBox");
    const imageInput =
    document.getElementById("facultyImage");
    uploadBox.addEventListener("click", ()=>{
        imageInput.click();
    });
    imageInput.addEventListener("change", function(){
        let file = this.files[0];
        if(file){
            let reader = new FileReader();
            reader.onload = function(e){
                let imageData = e.target.result;
                localStorage.setItem(
                    "facultyImage",
                    imageData
                );
                document.getElementById(
                    "facultyPreview"
                ).src = imageData;
            };
            reader.readAsDataURL(file);
        }
    });
}

/* ===== REALTIME ATTENDANCE ===== */

function subscribeRealtime() {

    sb
        .channel("attendance-live")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "attendance_records"
            },
            async () => {
                console.log("New attendance detected");

                await renderAttendanceManagement();
                await renderRecentAttendance();
                updateDashboard();
            }
        )
        .subscribe((status) => {
    console.log("Realtime Status:", status);
});

}