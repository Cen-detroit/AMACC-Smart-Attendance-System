/* =========================================================
   AMA SMART ATTENDANCE SYSTEM
   ADMINISTRATOR CONTROL CENTER
   ADMIN JAVASCRIPT
========================================================= */


/* =========================================================
   GLOBAL STATE
========================================================= */

let allStudents = [];
let allFaculty = [];
let allAttendance = [];

let currentAdminUser = null;
let currentAdminProfile = null;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "======================================"
        );

        console.log(
            "AMA ADMIN DASHBOARD"
        );

        console.log(
            "Initializing..."
        );

        console.log(
            "======================================"
        );


        startClock();

        setupStudentFilters();

        setupAttendanceFilters();

        setupImageUpload();


        if (
            typeof checkSupabaseClient !== "function" ||
            !checkSupabaseClient()
        ) {

            showDashboardError(
                "Supabase client is unavailable. Check js/supabase.js."
            );

            return;
        }


        await initializeAdminDashboard();
    }
);


/* =========================================================
   INITIALIZE ADMIN DASHBOARD
========================================================= */

async function initializeAdminDashboard() {

    try {

        console.log(
            "Checking administrator session..."
        );


        const session =
            await getCurrentAdmin();


        if (!session) {

            console.warn(
                "No active Supabase session."
            );


            showDashboardError(
                "No administrator session is active."
            );


            /*
             * Redirect to login after a short delay.
             */

            setTimeout(
                function () {

                    window.location.replace(
                        "login.html"
                    );

                },
                2000
            );


            return;
        }


        currentAdminUser =
            session.user;


        console.log(
            "Authenticated user:",
            currentAdminUser.email
        );


        await loadAdministratorProfile();

        await loadDashboard();


        console.log(
            "Administrator dashboard loaded successfully."
        );


    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );


        showDashboardError(
            "Dashboard loading error: " +
            error.message
        );
    }
}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );
}


function updateClock() {

    const now =
        new Date();


    const formatter =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: "Asia/Manila",
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            }
        );


    const parts =
        formatter.formatToParts(now);


    const values = {};


    parts.forEach(
        function (part) {

            values[part.type] =
                part.value;
        }
    );


    const day =
        document.getElementById(
            "currentDay"
        );


    const date =
        document.getElementById(
            "currentDate"
        );


    const time =
        document.getElementById(
            "currentTime"
        );


    if (day) {

        day.textContent =
            values.weekday || "";
    }


    if (date) {

        date.textContent =
            `${values.month || ""} ${values.day || ""}, ${values.year || ""}`;
    }


    if (time) {

        time.textContent =
            `${values.hour || ""}:${values.minute || ""}:${values.second || ""} ${values.dayPeriod || ""}`;
    }
}


/* =========================================================
   ADMINISTRATOR PROFILE
========================================================= */

async function loadAdministratorProfile() {

    try {

        if (!currentAdminUser) {
            return;
        }


        if (
            typeof getFacultyProfile ===
            "function"
        ) {

            const profile =
                await getFacultyProfile(
                    currentAdminUser.id
                );


            if (
                profile &&
                profile.data
            ) {

                currentAdminProfile =
                    Array.isArray(
                        profile.data
                    )
                        ? profile.data[0]
                        : profile.data;
            }
        }


        /*
         * If faculty profile was not found,
         * try local admin information.
         */

        if (!currentAdminProfile) {

            try {

                const storedAdmin =
                    localStorage.getItem(
                        "admin"
                    );


                if (storedAdmin) {

                    currentAdminProfile =
                        JSON.parse(
                            storedAdmin
                        );
                }

            } catch (error) {

                console.warn(
                    "Unable to read local admin profile.",
                    error
                );
            }
        }


        updateAdministratorUI();


    } catch (error) {

        console.error(
            "Administrator profile loading error:",
            error
        );


        updateAdministratorUI();
    }
}


function updateAdministratorUI() {

    const email =
        currentAdminUser?.email ||
        currentAdminProfile?.email ||
        "admin@email.com";


    const name =
        currentAdminProfile?.full_name ||
        currentAdminProfile?.name ||
        currentAdminUser
            ?.user_metadata
            ?.full_name ||
        currentAdminUser
            ?.user_metadata
            ?.name ||
        "Administrator";


    const namePreview =
        document.getElementById(
            "adminNamePreview"
        );


    const emailPreview =
        document.getElementById(
            "adminEmailPreview"
        );


    const nameInput =
        document.getElementById(
            "adminName"
        );


    const emailInput =
        document.getElementById(
            "adminEmail"
        );


    if (namePreview) {

        namePreview.textContent =
            name;
    }


    if (emailPreview) {

        emailPreview.textContent =
            email;
    }


    if (nameInput) {

        nameInput.value =
            name;
    }


    if (emailInput) {

        emailInput.value =
            email;
    }


    const avatar =
        currentAdminUser
            ?.user_metadata
            ?.avatar_url;


    if (avatar) {

        const preview =
            document.getElementById(
                "adminPreview"
            );


        if (preview) {

            preview.src =
                avatar;
        }
    }
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        console.log(
            "Loading dashboard data..."
        );


        /* =========================
           LOAD STUDENTS
        ========================= */

        const studentsResult =
            await loadStudents();


        allStudents =
            Array.isArray(studentsResult)
                ? studentsResult
                : [];


        /* =========================
           LOAD FACULTY
        ========================= */

        const facultyResult =
            await loadFaculty();


        allFaculty =
            Array.isArray(facultyResult)
                ? facultyResult
                : [];


        /* =========================
           LOAD ATTENDANCE
        ========================= */

        const attendanceResult =
            await loadTodayAttendance();


        allAttendance =
            Array.isArray(attendanceResult)
                ? attendanceResult
                : [];


        console.log(
            "Students:",
            allStudents.length
        );


        console.log(
            "Faculty:",
            allFaculty.length
        );


        console.log(
            "Today's attendance:",
            allAttendance.length
        );


        updateDashboardStatistics();

        renderRecentStudents();

        renderRecentAttendance();


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );


        showDashboardError(
            error.message ||
            "Unable to load dashboard."
        );
    }
}


/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

function updateDashboardStatistics() {

    const students =
        Array.isArray(allStudents)
            ? allStudents
            : [];


    const faculty =
        Array.isArray(allFaculty)
            ? allFaculty
            : [];


    const attendance =
        Array.isArray(allAttendance)
            ? allAttendance
            : [];


    /* =====================================================
       TOTAL STUDENTS
    ===================================================== */

    const totalStudents =
        students.length;


    /* =====================================================
       TOTAL FACULTY
    ===================================================== */

    const totalFaculty =
        faculty.length;


    /* =====================================================
       COLLEGE STUDENTS
    ===================================================== */

    const collegeStudents =
        students.filter(
            function (student) {

                const department =
                    normalize(
                        student.department
                    );


                return (
                    department === "college" ||
                    department.includes(
                        "college"
                    )
                );
            }
        ).length;


    /* =====================================================
       SENIOR HIGH SCHOOL STUDENTS
    ===================================================== */

    const shsStudents =
        students.filter(
            function (student) {

                const department =
                    normalize(
                        student.department
                    );


                return (
                    department === "shs" ||
                    department.includes(
                        "shs"
                    ) ||
                    department.includes(
                        "senior high"
                    )
                );
            }
        ).length;


    /* =====================================================
       ATTENDANCE TODAY
    ===================================================== */

    const todayAttendance =
        attendance.length;


    /* =====================================================
       DISPLAY COUNTERS
    ===================================================== */

    setText(
        "totalStudents",
        totalStudents
    );


    setText(
        "totalFaculty",
        totalFaculty
    );


    setText(
        "totalCollegeStudents",
        collegeStudents
    );


    setText(
        "totalSHSStudents",
        shsStudents
    );


    setText(
        "todayAttendance",
        todayAttendance
    );


    /* =====================================================
       DEBUGGING
    ===================================================== */

    console.log(
        "======================================"
    );

    console.log(
        "DASHBOARD STATISTICS"
    );

    console.log(
        "======================================"
    );

    console.log(
        "Total Students:",
        totalStudents
    );

    console.log(
        "College Students:",
        collegeStudents
    );

    console.log(
        "SHS Students:",
        shsStudents
    );

    console.log(
        "Total Faculty:",
        totalFaculty
    );

    console.log(
        "Attendance Today:",
        todayAttendance
    );


    console.log(
        "Student Departments:",
        students.map(
            function (student) {

                return student.department;
            }
        )
    );


    console.log(
        "======================================"
    );
}


/* =========================================================
   RECENT STUDENTS
========================================================= */

function renderRecentStudents() {

    const container =
        document.getElementById(
            "recentStudents"
        );


    if (!container) {
        return;
    }


    const students =
        allStudents.slice(
            0,
            5
        );


    if (!students.length) {

        container.innerHTML = `
            <div class="class-item">

                <div>

                    <strong>
                        No students yet
                    </strong>

                    <br>

                    <small>
                        Recently registered students
                        will appear here.
                    </small>

                </div>

            </div>
        `;


        return;
    }


    container.innerHTML =
        students.map(
            function (student) {

                const name =
                    escapeHTML(
                        student.full_name ||
                        "Unknown Student"
                    );


                const number =
                    escapeHTML(
                        student.student_number ||
                        "No Student Number"
                    );


                const department =
                    escapeHTML(
                        student.department ||
                        "N/A"
                    );


                return `
                    <div class="class-item">

                        <div>

                            <strong>
                                ${name}
                            </strong>

                            <br>

                            <small>
                                ${number}
                                •
                                ${department}
                            </small>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   RECENT ATTENDANCE
========================================================= */

function renderRecentAttendance() {

    const container =
        document.getElementById(
            "recentAttendance"
        );


    if (!container) {
        return;
    }


    const records =
        allAttendance.slice(
            0,
            5
        );


    if (!records.length) {

        container.innerHTML = `
            <div class="activity-empty">
                Waiting for students to scan...
            </div>
        `;


        return;
    }


    container.innerHTML =
        records.map(
            function (record) {

                const student =
                    record.students ||
                    {};


                const name =
                    escapeHTML(
                        student.full_name ||
                        "Unknown Student"
                    );


                const studentNumber =
                    escapeHTML(
                        student.student_number ||
                        ""
                    );


                const timeIn =
                    formatTime(
                        record.time_in
                    );


                const status =
                    escapeHTML(
                        record.status ||
                        "Present"
                    );


                return `
                    <div class="activity-item">

                        <div>

                            <strong>
                                ${name}
                            </strong>

                            <br>

                            <small>
                                ${studentNumber}
                                • Time In:
                                ${timeIn}
                            </small>

                        </div>

                        <span>
                            ${status}
                        </span>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   SECTION NAVIGATION
========================================================= */

async function showSection(
    section,
    menuElement
) {

    const sections = [
        "overview",
        "students",
        "faculty",
        "attendance",
        "reports",
        "settings"
    ];


    sections.forEach(
        function (name) {

            const element =
                document.getElementById(
                    name + "Section"
                );


            if (element) {

                element.style.display =
                    "none";
            }
        }
    );


    let targetId;


    if (section === "dashboard") {

        targetId =
            "overviewSection";

    } else {

        targetId =
            section + "Section";
    }


    const target =
        document.getElementById(
            targetId
        );


    if (target) {

        target.style.display =
            "block";
    }


    document
        .querySelectorAll(
            ".menu-link"
        )
        .forEach(
            function (link) {

                link.classList.remove(
                    "active"
                );
            }
        );


    if (menuElement) {

        menuElement.classList.add(
            "active"
        );
    }


    try {

        if (section === "dashboard") {

            await loadDashboard();


        } else if (
            section === "students"
        ) {

            await loadStudentsSection();


        } else if (
            section === "faculty"
        ) {

            await loadFacultySection();


        } else if (
            section === "attendance"
        ) {

            await loadAttendanceSection();


        } else if (
            section === "settings"
        ) {

            updateAdministratorUI();
        }


    } catch (error) {

        console.error(
            "Section loading error:",
            error
        );
    }
}


/* =========================================================
   STUDENT MANAGEMENT
========================================================= */

async function loadStudentsSection() {

    try {

        const result =
            await loadStudents();


        allStudents =
            Array.isArray(result)
                ? result
                : [];


        populateStudentFilterOptions();

        renderStudentsTable();


    } catch (error) {

        console.error(
            "Student section error:",
            error
        );
    }
}


/* =========================================================
   STUDENT TABLE
========================================================= */

function renderStudentsTable() {

    const tbody =
        document.getElementById(
            "studentsTable"
        );


    if (!tbody) {
        return;
    }


    let students =
        [...allStudents];


    const department =
        getValue(
            "studentDepartmentFilter"
        );


    const course =
        getValue(
            "studentCourseFilter"
        );


    const major =
        getValue(
            "studentMajorFilter"
        );


    const year =
        getValue(
            "studentYearFilter"
        );


    const status =
        getValue(
            "studentStatusFilter"
        );


    if (department) {

        students =
            students.filter(
                function (student) {

                    return (
                        normalize(
                            student.department
                        ) ===
                        normalize(
                            department
                        )
                    );
                }
            );
    }


    if (course) {

        students =
            students.filter(
                function (student) {

                    return (
                        normalize(
                            student.course
                        ) ===
                        normalize(
                            course
                        )
                    );
                }
            );
    }


    if (major) {

        students =
            students.filter(
                function (student) {

                    return (
                        normalize(
                            student.major
                        ) ===
                        normalize(
                            major
                        )
                    );
                }
            );
    }


    if (year) {

        students =
            students.filter(
                function (student) {

                    return (
                        normalize(
                            student.year_level
                        ) ===
                        normalize(
                            year
                        )
                    );
                }
            );
    }


    if (status) {

        students =
            students.filter(
                function (student) {

                    return (
                        normalize(
                            student.status
                        ) ===
                        normalize(
                            status
                        )
                    );
                }
            );
    }


    if (!students.length) {

        tbody.innerHTML = `
            <tr>

                <td
                    colspan="9"
                    style="text-align:center;"
                >
                    No students found.
                </td>

            </tr>
        `;


        return;
    }


    tbody.innerHTML =
        students.map(
            function (student) {

                const photo =
                    student.photo_url ||
                    "https://placehold.co/50x50";


                return `
                    <tr>

                        <td>

                            <img
                                src="${escapeAttribute(photo)}"
                                alt="Student"
                                style="
                                    width:45px;
                                    height:45px;
                                    object-fit:cover;
                                    border-radius:50%;
                                "
                            >

                        </td>


                        <td>
                            ${escapeHTML(
                                student.student_number ||
                                "N/A"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                student.full_name ||
                                "N/A"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                student.department ||
                                "N/A"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                student.course ||
                                "N/A"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                student.major ||
                                "N/A"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                student.year_level ||
                                "N/A"
                            )}
                        </td>


                        <td>

                            <span class="status-badge">

                                ${escapeHTML(
                                    student.status ||
                                    "Active"
                                )}

                            </span>

                        </td>


                        <td>

                            <button
                                class="btn-primary"
                                onclick="openStudentModal('${escapeAttribute(student.id)}')"
                            >
                                Edit
                            </button>


                            <button
                                class="btn-secondary"
                                onclick="deleteStudent('${escapeAttribute(student.id)}')"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>
                `;
            }
        ).join("");
}


/* =========================================================
   STUDENT FILTER OPTIONS
========================================================= */

function populateStudentFilterOptions() {

    populateSelect(
        "studentCourseFilter",
        uniqueValues(
            allStudents,
            "course"
        ),
        "All Courses"
    );


    populateSelect(
        "studentMajorFilter",
        uniqueValues(
            allStudents,
            "major"
        ),
        "All Majors / Strands"
    );
}


function populateSelect(
    id,
    values,
    firstOption
) {

    const select =
        document.getElementById(
            id
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    select.innerHTML =
        `<option value="">${escapeHTML(firstOption)}</option>`;


    values.forEach(
        function (value) {

            if (!value) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            select.appendChild(
                option
            );
        }
    );


    if (
        values.includes(
            current
        )
    ) {

        select.value =
            current;
    }
}


/* =========================================================
   STUDENT FILTER EVENTS
========================================================= */

function setupStudentFilters() {

    const ids = [
        "studentDepartmentFilter",
        "studentCourseFilter",
        "studentMajorFilter",
        "studentYearFilter",
        "studentStatusFilter"
    ];


    ids.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.addEventListener(
                    "change",
                    renderStudentsTable
                );
            }
        }
    );
}


/* =========================================================
   OPEN STUDENT MODAL
========================================================= */

async function openStudentModal(
    studentId
) {

    try {

        const student =
            await getStudent(
                studentId
            );


        if (!student) {

            alert(
                "Student record could not be found."
            );

            return;
        }


        /*
         * Populate options BEFORE setting values.
         */

        populateModalOptions();


        setValue(
            "studentId",
            student.id
        );


        setValue(
            "studentNumber",
            student.student_number
        );


        setValue(
            "studentName",
            student.full_name
        );


        setValue(
            "studentDepartment",
            student.department
        );


        setValue(
            "studentCourse",
            student.course
        );


        setValue(
            "studentMajor",
            student.major
        );


        setValue(
            "studentYear",
            student.year_level
        );


        setValue(
            "advisorName",
            student.adviser_name ||
            student.advisor_name
        );


        setValue(
            "advisorPhone",
            student.adviser_phone ||
            student.advisor_phone
        );


        setValue(
            "guardianName",
            student.guardian_name
        );


        setValue(
            "guardianPhone",
            student.guardian_phone
        );


        setValue(
            "guardianRelationship",
            student.guardian_relationship
        );


        setValue(
            "studentStatus",
            student.status ||
            "Active"
        );


        const modal =
            document.getElementById(
                "studentModal"
            );


        if (modal) {

            modal.style.display =
                "flex";
        }


    } catch (error) {

        console.error(
            "Open student modal error:",
            error
        );


        alert(
            "Unable to open student."
        );
    }
}


/* =========================================================
   STUDENT MODAL OPTIONS
========================================================= */

function populateModalOptions() {

    populateSelect(
        "studentDepartment",
        uniqueValues(
            allStudents,
            "department"
        ),
        "Select Department"
    );


    populateSelect(
        "studentCourse",
        uniqueValues(
            allStudents,
            "course"
        ),
        "Select Course"
    );


    populateSelect(
        "studentMajor",
        uniqueValues(
            allStudents,
            "major"
        ),
        "Select Major / Strand"
    );


    populateSelect(
        "studentYear",
        uniqueValues(
            allStudents,
            "year_level"
        ),
        "Select Year Level"
    );
}


/* =========================================================
   CLOSE STUDENT MODAL
========================================================= */

function closeStudentModal() {

    const modal =
        document.getElementById(
            "studentModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   SAVE STUDENT
========================================================= */

async function saveStudent() {

    try {

        const studentId =
            getValue(
                "studentId"
            );


        if (!studentId) {

            alert(
                "Student ID is missing."
            );

            return;
        }


        const studentData = {

            student_number:
                getValue(
                    "studentNumber"
                ),

            full_name:
                getValue(
                    "studentName"
                ),

            department:
                getValue(
                    "studentDepartment"
                ),

            course:
                getValue(
                    "studentCourse"
                ),

            major:
                getValue(
                    "studentMajor"
                ),

            year_level:
                getValue(
                    "studentYear"
                ),

            adviser_name:
                getValue(
                    "advisorName"
                ),

            adviser_phone:
                getValue(
                    "advisorPhone"
                ),

            guardian_name:
                getValue(
                    "guardianName"
                ),

            guardian_phone:
                getValue(
                    "guardianPhone"
                ),

            guardian_relationship:
                getValue(
                    "guardianRelationship"
                ),

            status:
                getValue(
                    "studentStatus"
                )
        };


        const photoInput =
            document.getElementById(
                "studentPhoto"
            );


        if (
            photoInput &&
            photoInput.files &&
            photoInput.files.length
        ) {

            const photoUrl =
                await uploadStudentPhoto(
                    photoInput.files[0]
                );


            if (photoUrl) {

                studentData.photo_url =
                    photoUrl;
            }
        }


        const result =
            await updateStudent(
                studentId,
                studentData
            );


        if (
            !result ||
            !result.success
        ) {

            console.error(
                "Student update failed:",
                result?.error
            );


            alert(
                result?.error?.message ||
                "Failed to save student."
            );


            return;
        }


        alert(
            "Student information saved successfully."
        );


        closeStudentModal();


        await loadStudentsSection();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Save student error:",
            error
        );


        alert(
            "An error occurred while saving the student."
        );
    }
}


/* =========================================================
   DELETE STUDENT
========================================================= */

async function deleteStudent(
    studentId
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this student?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const result =
            await deleteStudentFromDatabase(
                studentId
            );


        if (
            !result ||
            !result.success
        ) {

            console.error(
                "Delete failed:",
                result?.error
            );


            alert(
                result?.error?.message ||
                "Unable to delete student."
            );


            return;
        }


        alert(
            "Student deleted successfully."
        );


        await loadStudentsSection();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Delete student error:",
            error
        );


        alert(
            "An error occurred while deleting the student."
        );
    }
}


/* =========================================================
   FACULTY MANAGEMENT
========================================================= */

async function loadFacultySection() {

    try {

        const result =
            await loadFaculty();


        allFaculty =
            Array.isArray(result)
                ? result
                : [];


        renderFacultyTable();


    } catch (error) {

        console.error(
            "Faculty section error:",
            error
        );
    }
}


/* =========================================================
   FACULTY TABLE
========================================================= */

function renderFacultyTable() {

    const tbody =
        document.getElementById(
            "facultyTable"
        );


    if (!tbody) {
        return;
    }


    if (!allFaculty.length) {

        tbody.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    style="text-align:center;"
                >
                    No faculty accounts found.
                </td>

            </tr>
        `;


        return;
    }


    tbody.innerHTML =
        allFaculty.map(
            function (faculty) {

                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                faculty.employee_number ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                faculty.full_name ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                faculty.email ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                faculty.role ||
                                "Faculty"
                            )}
                        </td>

                        <td>
                            ${formatDateTime(
                                faculty.created_at
                            )}
                        </td>

                        <td>
                            Active
                        </td>

                    </tr>
                `;
            }
        ).join("");
}


/* =========================================================
   ATTENDANCE MANAGEMENT
========================================================= */

async function loadAttendanceSection() {

    try {

        /*
         * Refresh students so attendance
         * filter options are current.
         */

        const studentsResult =
            await loadStudents();


        if (
            Array.isArray(
                studentsResult
            )
        ) {

            allStudents =
                studentsResult;
        }


        const result =
            await getAttendanceWithStudents();


        if (
            result &&
            result.error
        ) {

            console.error(
                "Attendance error:",
                result.error
            );


            allAttendance = [];


        } else {

            allAttendance =
                result?.data ||
                [];
        }


        populateAttendanceFilters();

        renderAttendanceTable();


    } catch (error) {

        console.error(
            "Attendance section error:",
            error
        );


        allAttendance = [];

        renderAttendanceTable();
    }
}


/* =========================================================
   ATTENDANCE TABLE
========================================================= */

function renderAttendanceTable() {

    const tbody =
        document.getElementById(
            "attendanceManagementTable"
        );


    if (!tbody) {
        return;
    }


    let records =
        [...allAttendance];


    const search =
        normalize(
            getValue(
                "searchStudent"
            )
        );


    const department =
        normalize(
            getValue(
                "filterDepartment"
            )
        );


    const course =
        normalize(
            getValue(
                "filterCourse"
            )
        );


    const major =
        normalize(
            getValue(
                "filterMajor"
            )
        );


    const year =
        normalize(
            getValue(
                "filterYear"
            )
        );


    const status =
        normalize(
            getValue(
                "filterStatus"
            )
        );


    records =
        records.filter(
            function (record) {

                const student =
                    record.students ||
                    {};


                const name =
                    normalize(
                        student.full_name
                    );


                const number =
                    normalize(
                        student.student_number
                    );


                const studentDepartment =
                    normalize(
                        student.department
                    );


                const studentCourse =
                    normalize(
                        student.course
                    );


                const studentMajor =
                    normalize(
                        student.major
                    );


                const studentYear =
                    normalize(
                        student.year_level
                    );


                const recordStatus =
                    normalize(
                        record.status
                    );


                if (
                    search &&
                    !name.includes(search) &&
                    !number.includes(search)
                ) {

                    return false;
                }


                if (
                    department &&
                    studentDepartment !==
                    department
                ) {

                    return false;
                }


                if (
                    course &&
                    studentCourse !==
                    course
                ) {

                    return false;
                }


                if (
                    major &&
                    studentMajor !==
                    major
                ) {

                    return false;
                }


                if (
                    year &&
                    studentYear !==
                    year
                ) {

                    return false;
                }


                if (
                    status &&
                    recordStatus !==
                    status
                ) {

                    return false;
                }


                return true;
            }
        );


    if (!records.length) {

        tbody.innerHTML = `
            <tr>

                <td
                    colspan="9"
                    style="text-align:center;"
                >
                    No attendance records found.
                </td>

            </tr>
        `;


        return;
    }


    tbody.innerHTML =
        records.map(
            function (record) {

                const student =
                    record.students ||
                    {};


                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                student.full_name ||
                                "Unknown"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                student.student_number ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                student.department ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                student.course ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                student.major ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                student.year_level ||
                                "N/A"
                            )}
                        </td>

                        <td>
                            ${formatTime(
                                record.time_in
                            )}
                        </td>

                        <td>
                            ${formatTime(
                                record.time_out
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                record.status ||
                                "Present"
                            )}
                        </td>

                    </tr>
                `;
            }
        ).join("");
}


/* =========================================================
   ATTENDANCE FILTER EVENTS
========================================================= */

function setupAttendanceFilters() {

    const ids = [
        "searchStudent",
        "filterDepartment",
        "filterCourse",
        "filterMajor",
        "filterYear",
        "filterStatus"
    ];


    ids.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {
                return;
            }


            element.addEventListener(
                "input",
                renderAttendanceTable
            );


            element.addEventListener(
                "change",
                renderAttendanceTable
            );
        }
    );
}


/* =========================================================
   POPULATE ATTENDANCE FILTERS
========================================================= */

function populateAttendanceFilters() {

    populateSelect(
        "filterDepartment",
        uniqueValues(
            allStudents,
            "department"
        ),
        "All Departments"
    );


    populateSelect(
        "filterCourse",
        uniqueValues(
            allStudents,
            "course"
        ),
        "All Courses"
    );


    populateSelect(
        "filterMajor",
        uniqueValues(
            allStudents,
            "major"
        ),
        "All Majors / Strands"
    );


    populateSelect(
        "filterYear",
        uniqueValues(
            allStudents,
            "year_level"
        ),
        "All Year Levels"
    );
}


/* =========================================================
   SAVE ADMIN PROFILE
========================================================= */

async function saveProfile() {

    try {

        const name =
            getValue(
                "adminName"
            );


        if (!name) {

            alert(
                "Please enter your full name."
            );

            return;
        }


        if (!currentAdminUser) {

            alert(
                "Administrator session is unavailable."
            );

            return;
        }


        const password =
            getValue(
                "adminPassword"
            );


        const updateData = {

            data: {

                full_name:
                    name
            }
        };


        const {
            error: updateError
        } =
            await window.sb.auth.updateUser(
                updateData
            );


        if (updateError) {

            console.error(
                "Profile update error:",
                updateError
            );


            alert(
                updateError.message
            );


            return;
        }


        if (password) {

            const {
                error: passwordError
            } =
                await window.sb.auth.updateUser(
                    {
                        password:
                            password
                    }
                );


            if (passwordError) {

                console.error(
                    "Password update error:",
                    passwordError
                );


                alert(
                    passwordError.message
                );


                return;
            }
        }


        /*
         * Update local display immediately.
         */

        currentAdminUser =
            {
                ...currentAdminUser,

                user_metadata:
                    {
                        ...currentAdminUser
                            .user_metadata,

                        full_name:
                            name
                    }
            };


        try {

            const storedAdmin =
                JSON.parse(
                    localStorage.getItem(
                        "admin"
                    ) ||
                    "{}"
                );


            storedAdmin.full_name =
                name;


            localStorage.setItem(
                "admin",
                JSON.stringify(
                    storedAdmin
                )
            );


        } catch (error) {

            console.warn(
                "Unable to update local admin information.",
                error
            );
        }


        setValue(
            "adminPassword",
            ""
        );


        updateAdministratorUI();


        alert(
            "Administrator profile updated successfully."
        );


    } catch (error) {

        console.error(
            "Save profile exception:",
            error
        );


        alert(
            "Unable to save administrator profile."
        );
    }
}


/* =========================================================
   IMAGE UPLOAD UI
========================================================= */

function setupImageUpload() {

    const uploadBox =
        document.getElementById(
            "uploadBox"
        );


    const imageInput =
        document.getElementById(
            "adminImage"
        );


    if (
        !uploadBox ||
        !imageInput
    ) {

        return;
    }


    uploadBox.addEventListener(
        "click",
        function () {

            imageInput.click();
        }
    );


    imageInput.addEventListener(
        "change",
        function () {

            if (
                imageInput.files &&
                imageInput.files.length
            ) {

                const file =
                    imageInput.files[0];


                const paragraph =
                    uploadBox.querySelector(
                        "p"
                    );


                if (paragraph) {

                    paragraph.textContent =
                        file.name;
                }


                /*
                 * Local image preview.
                 */

                const preview =
                    document.getElementById(
                        "adminPreview"
                    );


                if (preview) {

                    preview.src =
                        URL.createObjectURL(
                            file
                        );
                }
            }
        }
    );


    uploadBox.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();


            uploadBox.classList.add(
                "dragging"
            );
        }
    );


    uploadBox.addEventListener(
        "dragleave",
        function () {

            uploadBox.classList.remove(
                "dragging"
            );
        }
    );


    uploadBox.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();


            uploadBox.classList.remove(
                "dragging"
            );


            const files =
                event.dataTransfer.files;


            if (
                files &&
                files.length
            ) {

                try {

                    const transfer =
                        new DataTransfer();


                    transfer.items.add(
                        files[0]
                    );


                    imageInput.files =
                        transfer.files;

                } catch (error) {

                    console.warn(
                        "Unable to assign dropped file.",
                        error
                    );
                }


                const paragraph =
                    uploadBox.querySelector(
                        "p"
                    );


                if (paragraph) {

                    paragraph.textContent =
                        files[0].name;
                }


                const preview =
                    document.getElementById(
                        "adminPreview"
                    );


                if (preview) {

                    preview.src =
                        URL.createObjectURL(
                            files[0]
                        );
                }
            }
        }
    );
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    const confirmed =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await logoutAdmin();


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );


        localStorage.removeItem(
            "faculty"
        );


        localStorage.removeItem(
            "loggedIn"
        );


        localStorage.removeItem(
            "admin"
        );


        window.location.replace(
            "login.html"
        );
    }
}


/* =========================================================
   DASHBOARD ERROR
========================================================= */

function showDashboardError(
    message
) {

    console.error(
        message
    );


    const containers = [
        "recentStudents",
        "recentAttendance"
    ];


    containers.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.innerHTML = `
                    <div class="activity-empty">
                        ${escapeHTML(message)}
                    </div>
                `;
            }
        }
    );
}


/* =========================================================
   HELPER - SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ?? "0";

    } else {

        console.warn(
            "Dashboard element not found:",
            id
        );
    }
}


/* =========================================================
   HELPER - SET VALUE
========================================================= */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";
    }
}


/* =========================================================
   HELPER - GET VALUE
========================================================= */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? String(
            element.value || ""
        ).trim()
        : "";
}


/* =========================================================
   HELPER - NORMALIZE
========================================================= */

function normalize(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


/* =========================================================
   HELPER - UNIQUE VALUES
========================================================= */

function uniqueValues(
    array,
    property
) {

    if (!Array.isArray(array)) {
        return [];
    }


    return [
        ...new Set(
            array
                .map(
                    function (item) {

                        return item?.[
                            property
                        ];
                    }
                )
                .filter(
                    function (value) {

                        return (
                            value !== null &&
                            value !== undefined &&
                            String(value)
                                .trim() !== ""
                        );
                    }
                )
                .map(
                    function (value) {

                        return String(
                            value
                        ).trim();
                    }
                )
        )
    ].sort(
        function (a, b) {

            return a.localeCompare(
                b
            );
        }
    );
}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    value
) {

    if (!value) {
        return "—";
    }


    try {

        return new Intl.DateTimeFormat(
            "en-PH",
            {
                timeZone:
                    "Asia/Manila",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    true
            }
        ).format(
            new Date(
                value
            )
        );


    } catch (error) {

        return String(
            value
        );
    }
}


/* =========================================================
   FORMAT DATE AND TIME
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {
        return "—";
    }


    try {

        return new Intl.DateTimeFormat(
            "en-PH",
            {
                timeZone:
                    "Asia/Manila",

                year:
                    "numeric",

                month:
                    "short",

                day:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    true
            }
        ).format(
            new Date(
                value
            )
        );


    } catch (error) {

        return String(
            value
        );
    }
}


/* =========================================================
   HTML SECURITY
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}


/* =========================================================
   WINDOW EXPORTS
========================================================= */

window.showSection =
    showSection;


window.openStudentModal =
    openStudentModal;


window.closeStudentModal =
    closeStudentModal;


window.saveStudent =
    saveStudent;


window.deleteStudent =
    deleteStudent;


window.saveProfile =
    saveProfile;


window.logout =
    logout;


window.loadDashboard =
    loadDashboard;


window.loadStudentsSection =
    loadStudentsSection;


window.loadFacultySection =
    loadFacultySection;


window.loadAttendanceSection =
    loadAttendanceSection;


window.renderStudentsTable =
    renderStudentsTable;


window.renderAttendanceTable =
    renderAttendanceTable;


window.updateDashboardStatistics =
    updateDashboardStatistics;


/* =========================================================
   SUCCESS MESSAGE
========================================================= */

console.log(
    "AMA Admin JavaScript loaded successfully."
);
