/* =========================================================
   AMA SMART ATTENDANCE SYSTEM
   ATTENDANCE.JS
   =========================================================

   FEATURES
   ---------------------------------------------------------
   • Supabase attendance system
   • Barcode scanner input
   • Time In / Time Out
   • Automatic registration for unknown students
   • Unknown barcode automatically opens registration page
   • Student photo display
   • Live clock
   • Today's attendance count
   • Automatic attendance refresh for ESP32 scans
   • No unstable Supabase Realtime WebSocket
   • No automatic audio beep / AudioContext warnings
   • Logout
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentStudent = null;

let todayAttendance = [];

let isScanning = false;

let lastUnknownBarcode = "";

let regPhotoDataUrl = "";

let attendancePollingTimer = null;

let lastKnownAttendanceIds = new Set();

let isRegistering = false;



/* =========================================================
   DEFAULT STUDENT IMAGE
   ========================================================= */

const DEFAULT_STUDENT_IMAGE =
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";


/* =========================================================
   GET TODAY'S DATE
   Uses LOCAL DATE
   ========================================================= */

function getToday() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* =========================================================
   LIVE CLOCK
   ========================================================= */

function updateTime() {

    const now = new Date();


    /* ===== TIME ===== */

    let hours =
        now.getHours();

    const minutes =
        String(now.getMinutes())
            .padStart(2, "0");

    const seconds =
        String(now.getSeconds())
            .padStart(2, "0");

    const ampm =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12;

    if (hours === 0) {

        hours = 12;

    }


    const timeElement =
        document.getElementById("timeNow");


    if (timeElement) {

        timeElement.innerText =
            `${hours}:${minutes}:${seconds} ${ampm}`;

    }


    /* ===== DATE ===== */

    const dateElement =
        document.getElementById("dateToday");


    if (dateElement) {

        dateElement.innerText =
            now.toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

    }

}


setInterval(
    updateTime,
    1000
);

updateTime();


/* =========================================================
   BARCODE INPUT
   ========================================================= */

const barcodeInput =
    document.getElementById("barcodeInput");


/* =========================================================
   SAFE HTML TEXT
   Prevents student information from injecting HTML
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {

        return "";

    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(dateValue) {

    if (!dateValue) {

        return "--:--:--";

    }

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {

        return "--:--:--";

    }

    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


/* =========================================================
   STATUS BOX
   ========================================================= */

function setStatus(
    type,
    message
) {

    const box =
        document.getElementById("statusBox");


    if (!box) {

        return;

    }


    box.className =
        `status-box ${type} animate`;


    box.innerHTML =
        message;


    setTimeout(
        function () {

            box.classList.remove(
                "animate"
            );

        },
        400
    );

}


/* =========================================================
   SUCCESS
   ========================================================= */

function showSuccess(message) {

    setStatus(
        "success",
        message
    );

}


/* =========================================================
   ERROR
   ========================================================= */

function showError(message) {

    setStatus(
        "error",
        message
    );

}


/* =========================================================
   WARNING
   ========================================================= */

function showWarning(message) {

    setStatus(
        "warning",
        message
    );

}


/* =========================================================
   INFO
   ========================================================= */

function showInfo(message) {

    setStatus(
        "info",
        message
    );

}


/* =========================================================
   DISPLAY STUDENT
   ========================================================= */

function displayStudent(student) {

    if (!student) {

        return;

    }


    currentStudent =
        student;


    const nameElement =
        document.getElementById(
            "studentName"
        );


    const idElement =
        document.getElementById(
            "studentId"
        );


    const courseElement =
        document.getElementById(
            "studentCourse"
        );


    const imageElement =
        document.getElementById(
            "studentImage"
        );


    /* ===== NAME ===== */

    if (nameElement) {

        nameElement.innerText =
            student.full_name ||
            "Unknown Student";

    }


    /* ===== STUDENT NUMBER ===== */

    if (idElement) {

        idElement.innerText =
            student.student_number ||
            "------";

    }


    /* ===== COURSE ===== */

    if (courseElement) {

        const course =
            student.course ||
            "-";

        const year =
            student.year_level ||
            "";

        courseElement.innerText =
            year
                ? `${course} - ${year}`
                : course;

    }


    /* ===== PHOTO ===== */

    if (imageElement) {

        imageElement.onerror =
            function () {

                this.onerror = null;

                this.src =
                    DEFAULT_STUDENT_IMAGE;

            };


        imageElement.src =
            student.photo_url ||
            DEFAULT_STUDENT_IMAGE;

    }

}


/* =========================================================
   RESET STUDENT DISPLAY
   ========================================================= */

function resetStudentDisplay() {

    currentStudent = null;


    const nameElement =
        document.getElementById(
            "studentName"
        );


    const idElement =
        document.getElementById(
            "studentId"
        );


    const courseElement =
        document.getElementById(
            "studentCourse"
        );


    const imageElement =
        document.getElementById(
            "studentImage"
        );


    if (nameElement) {

        nameElement.innerText =
            "Waiting for Barcode Scan...";

    }


    if (idElement) {

        idElement.innerText =
            "------";

    }


    if (courseElement) {

        courseElement.innerText =
            "------";

    }


    if (imageElement) {

        imageElement.src =
            DEFAULT_STUDENT_IMAGE;

    }

}


/* =========================================================
   TODAY'S ATTENDANCE COUNT
   ========================================================= */

async function loadTodayCount() {

    if (
        typeof sb === "undefined"
    ) {

        console.error(
            "Supabase client is not available."
        );

        return;

    }


    try {

        const today =
            getToday();


        const {
            count,
            error
        } = await sb
            .from("attendance_records")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "attendance_date",
                today
            );


        if (error) {

            console.error(
                "Attendance count error:",
                error
            );

            return;

        }


        const countElement =
            document.getElementById(
                "studentCount"
            );


        if (countElement) {

            countElement.innerText =
                count || 0;

        }

    } catch (error) {

        console.error(
            "Unexpected count error:",
            error
        );

    }

}


/* =========================================================
   LOAD TODAY'S ATTENDANCE
   ========================================================= */

async function loadTodayAttendance() {

    if (
        typeof sb === "undefined"
    ) {

        return;

    }


    try {

        const today =
            getToday();


        const {
            data,
            error
        } = await sb
            .from("attendance_records")
            .select("*")
            .eq(
                "attendance_date",
                today
            )
            .order(
                "time_in",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Load attendance error:",
                error
            );

            return;

        }


        todayAttendance =
            data || [];


        return todayAttendance;

    } catch (error) {

        console.error(
            "Unexpected attendance error:",
            error
        );

        return [];

    }

}


/* =========================================================
   GET STUDENT BY BARCODE
   ========================================================= */

async function findStudentByBarcode(
    barcode
) {

    if (
        typeof sb === "undefined"
    ) {

        throw new Error(
            "Supabase client is not initialized."
        );

    }


    const {
        data,
        error
    } = await sb
        .from("students")
        .select("*")
        .eq(
            "student_number",
            barcode
        )
        .maybeSingle();


    if (error) {

        throw error;

    }


    return data;

}


/* =========================================================
   GET TODAY'S STUDENT ATTENDANCE
   ========================================================= */

async function findStudentAttendance(
    studentId
) {

    const today =
        getToday();


    const {
        data,
        error
    } = await sb
        .from("attendance_records")
        .select("*")
        .eq(
            "student_id",
            studentId
        )
        .eq(
            "attendance_date",
            today
        )
        .order(
            "time_in",
            {
                ascending: false
            }
        )
        .limit(1);


    if (error) {

        throw error;

    }


    if (
        !data ||
        data.length === 0
    ) {

        return null;

    }


    return data[0];

}


/* =========================================================
   RECORD TIME IN
   ========================================================= */

async function recordTimeIn(
    student
) {

    const now =
        new Date();

    const today =
        getToday();


    const attendanceData = {

        student_id:
            student.id,

        attendance_date:
            today,

        time_in:
            now.toISOString(),

        status:
            "Present"

    };


    const {
        data,
        error
    } = await sb
        .from("attendance_records")
        .insert(
            attendanceData
        )
        .select()
        .single();


    if (error) {

        throw error;

    }


    return data;

}


/* =========================================================
   RECORD TIME OUT
   ========================================================= */

async function recordTimeOut(
    attendanceId
) {

    const timeOut =
        new Date();


    const {
        data,
        error
    } = await sb
        .from("attendance_records")
        .update(
            {
                time_out:
                    timeOut.toISOString()
            }
        )
        .eq(
            "id",
            attendanceId
        )
        .select()
        .single();


    if (error) {

        throw error;

    }


    return data;

}


/* =========================================================
   PROCESS BARCODE
   ========================================================= */

async function processBarcode(
    barcode
) {

    if (isScanning) {

        return;

    }


    barcode =
        String(barcode || "")
            .trim();


    if (!barcode) {

        showWarning(
            "⚠ Please scan a barcode."
        );

        return;

    }


    isScanning = true;


    try {

        console.log(
            "Barcode scanned:",
            barcode
        );


        /* =================================================
           FIND STUDENT
           ================================================= */

        const student =
            await findStudentByBarcode(
                barcode
            );


        /* =================================================
           STUDENT NOT REGISTERED
           Automatically open registration
           ================================================= */

        if (!student) {

            console.warn(
                "Student not registered:",
                barcode
            );


            lastUnknownBarcode =
                barcode;


            resetStudentDisplay();


            showError(
                "❌ <strong>BARCODE NOT REGISTERED</strong><br>" +
                "Student ID: " +
                escapeHtml(barcode) +
                "<br><br>" +
                "Opening registration..."
            );


            /*
             * Small delay allows the user to see
             * the NOT REGISTERED message before
             * registration opens.
             */

            setTimeout(
                function () {

                    showRegister();

                },
                700
            );


            return;

        }


        /* =================================================
           STUDENT FOUND
           ================================================= */

        console.log(
            "Student found:",
            student.full_name,
            "ID:",
            student.id
        );


        displayStudent(
            student
        );


        /* =================================================
           CHECK TODAY'S ATTENDANCE
           ================================================= */

        const attendance =
            await findStudentAttendance(
                student.id
            );


        /* =================================================
           TIME IN
           ================================================= */

        if (!attendance) {

            const record =
                await recordTimeIn(
                    student
                );


            showSuccess(
                "✅ <strong>TIME IN RECORDED</strong><br><br>" +
                escapeHtml(student.full_name) +
                "<br>Student ID: " +
                escapeHtml(student.student_number) +
                "<br>🕒 " +
                formatTime(record.time_in)
            );


            await loadTodayCount();

            await loadTodayAttendance();


            return;

        }


        /* =================================================
           TIME OUT
           ================================================= */

        if (!attendance.time_out) {

            const record =
                await recordTimeOut(
                    attendance.id
                );


            showSuccess(
                "🚪 <strong>TIME OUT RECORDED</strong><br><br>" +
                escapeHtml(student.full_name) +
                "<br>Student ID: " +
                escapeHtml(student.student_number) +
                "<br>🕒 " +
                formatTime(record.time_out)
            );


            await loadTodayCount();

            await loadTodayAttendance();


            return;

        }


        /* =================================================
           ALREADY COMPLETED
           ================================================= */

        showWarning(
            "⚠ <strong>ATTENDANCE ALREADY COMPLETED</strong><br><br>" +
            escapeHtml(student.full_name) +
            "<br>" +
            "Time In: " +
            formatTime(attendance.time_in) +
            "<br>" +
            "Time Out: " +
            formatTime(attendance.time_out)
        );


    } catch (error) {

        console.error(
            "Barcode processing error:",
            error
        );


        showError(
            "❌ <strong>Unable to process barcode.</strong><br>" +
            escapeHtml(
                error.message ||
                "Unknown error"
            )
        );

    } finally {

        isScanning = false;


        if (barcodeInput) {

            barcodeInput.value = "";

        }


        /*
         * Return focus only when scanner page
         * is visible.
         */

        setTimeout(
            function () {

                const registerView =
                    document.getElementById(
                        "registerView"
                    );


                const registrationVisible =
                    registerView &&
                    !registerView.classList.contains(
                        "hidden"
                    );


                if (
                    !registrationVisible &&
                    barcodeInput
                ) {

                    barcodeInput.focus();

                }

            },
            150
        );

    }

}


/* =========================================================
   BARCODE INPUT EVENT
   ========================================================= */

if (barcodeInput) {

    barcodeInput.addEventListener(
        "keydown",
        async function (event) {

            if (
                event.key !== "Enter"
            ) {

                return;

            }


            event.preventDefault();


            if (isScanning) {

                return;

            }


            const barcode =
                barcodeInput.value.trim();


            await processBarcode(
                barcode
            );

        }
    );

}


/* =========================================================
   AUTO FOCUS
   ========================================================= */

document.addEventListener(
    "click",
    function () {

        const registerView =
            document.getElementById(
                "registerView"
            );


        if (
            registerView &&
            !registerView.classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        if (
            barcodeInput &&
            !isScanning
        ) {

            barcodeInput.focus();

        }

    }
);


/* =========================================================
   SHOW REGISTRATION PAGE
   ========================================================= */

window.showRegister =
    function () {

        const scannerView =
            document.getElementById(
                "scannerView"
            );


        const registerView =
            document.getElementById(
                "registerView"
            );


        /* ===== HIDE SCANNER ===== */

        if (scannerView) {

            scannerView.classList.add(
                "hidden"
            );

        }


        /* ===== SHOW REGISTRATION ===== */

        if (registerView) {

            registerView.classList.remove(
                "hidden"
            );

        }


        /* ===== STATUS ===== */

        const regStatus =
            document.getElementById(
                "regStatus"
            );


        if (regStatus) {

            regStatus.className =
                "reg-status";

            regStatus.innerHTML =
                "";

        }


        /* ===== FIELDS ===== */

        const fullName =
            document.getElementById(
                "regFullName"
            );


        const studentNumber =
            document.getElementById(
                "regStudentNumber"
            );


        const course =
            document.getElementById(
                "regCourse"
            );


        const yearLevel =
            document.getElementById(
                "regYearLevel"
            );


        if (fullName) {

            fullName.value = "";

        }


        /*
         * IMPORTANT:
         * Keep the unknown barcode here.
         */

        if (studentNumber) {

            studentNumber.value =
                lastUnknownBarcode || "";

        }


        if (course) {

            course.value = "";

        }


        if (yearLevel) {

            yearLevel.value = "";

        }


        /* ===== PHOTO RESET ===== */

        regPhotoDataUrl = "";


        const photoFile =
            document.getElementById(
                "regPhotoFile"
            );


        if (photoFile) {

            photoFile.value = "";

        }


        const preview =
            document.getElementById(
                "regPhotoPreview"
            );


        if (preview) {

            preview.src = "";

            preview.classList.add(
                "hidden"
            );

        }


        const uploadText =
            document.getElementById(
                "regUploadText"
            );


        if (uploadText) {

            uploadText.innerText =
                "Click to attach a photo";

        }


        /* ===== FOCUS NAME ===== */

        setTimeout(
            function () {

                if (fullName) {

                    fullName.focus();

                }

            },
            100
        );

    };


/* =========================================================
   SETUP REGISTRATION PHOTO UPLOAD
   ========================================================= */

function setupRegPhotoUpload() {

    const uploadBox =
        document.getElementById(
            "regUploadBox"
        );


    const fileInput =
        document.getElementById(
            "regPhotoFile"
        );


    if (
        !uploadBox ||
        !fileInput
    ) {

        console.warn(
            "Registration photo elements not found."
        );

        return;

    }


    uploadBox.addEventListener(
        "click",
        function () {

            fileInput.click();

        }
    );


    fileInput.addEventListener(
        "change",
        function () {

            const file =
                this.files &&
                this.files[0];


            if (!file) {

                return;

            }


            /* ===== FILE TYPE ===== */

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Please select an image file."
                );


                fileInput.value =
                    "";


                return;

            }


            /* ===== FILE SIZE ===== */

            /*
             * Keep the photo reasonably small.
             * Large base64 images can cause database
             * insertion problems.
             */

            const maxSize =
                2 * 1024 * 1024;


            if (
                file.size > maxSize
            ) {

                alert(
                    "Please select an image smaller than 2 MB."
                );


                fileInput.value =
                    "";


                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    regPhotoDataUrl =
                        event.target.result;


                    const preview =
                        document.getElementById(
                            "regPhotoPreview"
                        );


                    if (preview) {

                        preview.src =
                            regPhotoDataUrl;

                        preview.classList.remove(
                            "hidden"
                        );

                    }


                    const uploadText =
                        document.getElementById(
                            "regUploadText"
                        );


                    if (uploadText) {

                        uploadText.innerText =
                            file.name;

                    }

                };


            reader.onerror =
                function () {

                    console.error(
                        "Unable to read image."
                    );

                    alert(
                        "Unable to read the selected image."
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


setupRegPhotoUpload();


/* =========================================================
   SHOW SCANNER
   ========================================================= */

window.showScanner =
    function () {

        const registerView =
            document.getElementById(
                "registerView"
            );


        const scannerView =
            document.getElementById(
                "scannerView"
            );


        if (registerView) {

            registerView.classList.add(
                "hidden"
            );

        }


        if (scannerView) {

            scannerView.classList.remove(
                "hidden"
            );

        }


        if (barcodeInput) {

            barcodeInput.value = "";


            setTimeout(
                function () {

                    barcodeInput.focus();

                },
                100
            );

        }

    };


/* =========================================================
   REGISTER NEW STUDENT
   ========================================================= */

window.registerStudent =
    async function () {

        if (isRegistering) {

            return;

        }


        const fullName =
            document.getElementById(
                "regFullName"
            )?.value.trim();


        const studentNumber =
            document.getElementById(
                "regStudentNumber"
            )?.value.trim();


        const course =
            document.getElementById(
                "regCourse"
            )?.value.trim();


        const yearLevel =
            document.getElementById(
                "regYearLevel"
            )?.value;


        const regStatus =
            document.getElementById(
                "regStatus"
            );


        const regBtn =
            document.getElementById(
                "regSubmitBtn"
            );


        /* =================================================
           VALIDATE
           ================================================= */

        if (
            !fullName ||
            !studentNumber ||
            !course ||
            !yearLevel
        ) {

            if (regStatus) {

                regStatus.className =
                    "reg-status error";


                regStatus.innerHTML =
                    "❌ Please fill in Full Name, Student Number, Course, and Year Level.";

            }


            return;

        }


        isRegistering = true;


        if (regBtn) {

            regBtn.disabled = true;

            regBtn.innerText =
                "SAVING...";

        }


        if (regStatus) {

            regStatus.className =
                "reg-status";


            regStatus.innerHTML =
                "Registering student...";

        }


        try {

            /* =================================================
               CHECK DUPLICATE
               ================================================= */

            const {
                data: existing,
                error: existingError
            } = await sb
                .from("students")
                .select("id")
                .eq(
                    "student_number",
                    studentNumber
                )
                .maybeSingle();


            if (existingError) {

                throw existingError;

            }


            if (existing) {

                if (regStatus) {

                    regStatus.className =
                        "reg-status error";


                    regStatus.innerHTML =
                        "❌ That Student Number is already registered.";

                }


                return;

            }


            /* =================================================
               STUDENT DATA
               ================================================= */

            const studentData = {

                full_name:
                    fullName,

                student_number:
                    studentNumber,

                course:
                    course,

                year_level:
                    yearLevel,

                status:
                    "Active",

                photo_url:
                    regPhotoDataUrl ||
                    null

            };


            console.log(
                "Registering student:",
                studentData
            );


            /* =================================================
               INSERT STUDENT
               ================================================= */

            const {
                data: newStudent,
                error: insertError
            } = await sb
                .from("students")
                .insert(
                    studentData
                )
                .select("*")
                .single();


            if (insertError) {

                throw insertError;

            }


            console.log(
                "Student registered successfully:",
                newStudent
            );


            /* =================================================
               SUCCESS MESSAGE
               ================================================= */

            if (regStatus) {

                regStatus.className =
                    "reg-status success";


                regStatus.innerHTML =
                    "✅ Student registered successfully!";

            }


            lastUnknownBarcode = "";

            regPhotoDataUrl = "";


            /* =================================================
               RETURN TO SCANNER
               ================================================= */

            setTimeout(
                function () {

                    showScanner();


                    if (newStudent) {

                        displayStudent(
                            newStudent
                        );


                        showSuccess(
                            "✅ <strong>STUDENT REGISTERED</strong><br><br>" +
                            escapeHtml(
                                newStudent.full_name
                            ) +
                            "<br>Student ID: " +
                            escapeHtml(
                                newStudent.student_number
                            ) +
                            "<br><br>" +
                            "Ready for attendance scanning."
                        );

                    }

                },
                1200
            );


        } catch (error) {

            console.error(
                "Student registration error:",
                error
            );


            if (regStatus) {

                regStatus.className =
                    "reg-status error";


                regStatus.innerHTML =
                    "❌ Registration failed.<br>" +
                    escapeHtml(
                        error.message ||
                        "Unknown error"
                    );

            }

        } finally {

            isRegistering = false;


            if (regBtn) {

                regBtn.disabled =
                    false;

                regBtn.innerText =
                    "SAVE STUDENT";

            }

        }

    };


/* =========================================================
   LOGOUT
========================================================= */

window.logout = async function () {

    try {

        if (
            typeof window.sb !== "undefined" &&
            window.sb.auth &&
            typeof window.sb.auth.signOut === "function"
        ) {

            const { error } =
                await window.sb.auth.signOut();

            if (error) {
                throw error;
            }

        }

    } catch (error) {

        console.error(
            "Supabase logout error:",
            error
        );

    } finally {

        window.location.replace(
            "Login.html"
        );

    }

};


/* =========================================================
   ESP32 ATTENDANCE MONITOR
   =========================================================

   Instead of using Supabase Realtime WebSockets,
   this page checks attendance_records periodically.

   This avoids:
   • CHANNEL_ERROR
   • WebSocket reconnect loops
   • realtime connection instability
   • duplicate realtime notifications

   The ESP32 can still insert/update Supabase normally.

   The page checks every 2.5 seconds.
   ========================================================= */

async function checkForNewAttendance() {

    if (
        typeof sb === "undefined"
    ) {

        return;

    }


    /*
     * Do not interfere with manual scanning
     * or registration.
     */

    if (
        isScanning ||
        isRegistering
    ) {

        return;

    }


    try {

        const today =
            getToday();


        const {
            data,
            error
        } = await sb
            .from("attendance_records")
            .select(
                `
                id,
                student_id,
                attendance_date,
                time_in,
                time_out,
                status
                `
            )
            .eq(
                "attendance_date",
                today
            )
            .order(
                "time_in",
                {
                    ascending: false
                }
            )
            .limit(20);


        if (error) {

            console.warn(
                "Attendance monitor error:",
                error.message
            );

            return;

        }


        const records =
            data || [];


        /*
         * First load:
         * Just remember existing records.
         *
         * This prevents old attendance records
         * from suddenly appearing as new scans
         * when the page opens.
         */

        if (
            lastKnownAttendanceIds.size === 0
        ) {

            records.forEach(
                function (record) {

                    lastKnownAttendanceIds.add(
                        record.id
                    );

                }
            );


            return;

        }


        /* =================================================
           CHECK NEW RECORDS
           ================================================= */

        for (
            const record of records
        ) {

            if (
                !lastKnownAttendanceIds.has(
                    record.id
                )
            ) {

                lastKnownAttendanceIds.add(
                    record.id
                );


                await handleNewAttendanceRecord(
                    record
                );

            }

        }


        /*
         * Keep the Set from growing forever.
         */

        if (
            lastKnownAttendanceIds.size > 100
        ) {

            const ids =
                Array.from(
                    lastKnownAttendanceIds
                );


            lastKnownAttendanceIds =
                new Set(
                    ids.slice(-50)
                );

        }


        /* =================================================
           CHECK TIME-OUT UPDATES
           ================================================= */

        /*
         * Detect time-out changes made by ESP32
         * or another device.
         */

        for (
            const record of records
        ) {

            if (
                record.time_out
            ) {

                await checkForTimeOutUpdate(
                    record
                );

            }

        }

    } catch (error) {

        console.warn(
            "Attendance monitor exception:",
            error
        );

    }

}


/* =========================================================
   HANDLE NEW ATTENDANCE RECORD
   ========================================================= */

async function handleNewAttendanceRecord(
    record
) {

    try {

        if (!record.student_id) {

            return;

        }


        const {
            data: student,
            error
        } = await sb
            .from("students")
            .select("*")
            .eq(
                "id",
                record.student_id
            )
            .maybeSingle();


        if (error) {

            console.warn(
                "Unable to load realtime student:",
                error
            );

            return;

        }


        if (!student) {

            return;

        }


        /*
         * If this record was created by this
         * browser itself, do not show another
         * notification.
         */

        if (
            currentStudent &&
            currentStudent.id === student.id
        ) {

            return;

        }


        displayStudent(
            student
        );


        showSuccess(
            "✅ <strong>TIME IN RECORDED</strong><br><br>" +
            escapeHtml(
                student.full_name
            ) +
            "<br>Student ID: " +
            escapeHtml(
                student.student_number
            ) +
            "<br>🕒 " +
            formatTime(
                record.time_in
            )
        );


        await loadTodayCount();

        await loadTodayAttendance();


    } catch (error) {

        console.warn(
            "New attendance handler error:",
            error
        );

    }

}


/* =========================================================
   TRACK TIME-OUT UPDATES
   ========================================================= */

const displayedTimeOutRecords =
    new Set();


async function checkForTimeOutUpdate(
    record
) {

    if (
        displayedTimeOutRecords.has(
            record.id
        )
    ) {

        return;

    }


    /*
     * Do not show the time-out again if the
     * current browser already processed it.
     */

    if (
        currentStudent &&
        currentStudent.id === record.student_id
    ) {

        displayedTimeOutRecords.add(
            record.id
        );

        return;

    }


    displayedTimeOutRecords.add(
        record.id
    );


    try {

        const {
            data: student,
            error
        } = await sb
            .from("students")
            .select("*")
            .eq(
                "id",
                record.student_id
            )
            .maybeSingle();


        if (
            error ||
            !student
        ) {

            return;

        }


        displayStudent(
            student
        );


        showSuccess(
            "🚪 <strong>TIME OUT RECORDED</strong><br><br>" +
            escapeHtml(
                student.full_name
            ) +
            "<br>Student ID: " +
            escapeHtml(
                student.student_number
            ) +
            "<br>🕒 " +
            formatTime(
                record.time_out
            )
        );


        await loadTodayCount();

        await loadTodayAttendance();


    } catch (error) {

        console.warn(
            "Time-out monitor error:",
            error
        );

    }

}


/* =========================================================
   START ATTENDANCE MONITOR
   ========================================================= */

function startAttendanceMonitor() {

    /*
     * Prevent multiple timers.
     */

    if (
        attendancePollingTimer
    ) {

        clearInterval(
            attendancePollingTimer
        );

    }


    console.log(
        "Starting Attendance Monitor..."
    );


    /*
     * Check immediately.
     */

    checkForNewAttendance();


    /*
     * Then check every 2.5 seconds.
     */

    attendancePollingTimer =
        setInterval(
            checkForNewAttendance,
            2500
        );

}


/* =========================================================
   STOP ATTENDANCE MONITOR
   ========================================================= */

function stopAttendanceMonitor() {

    if (
        attendancePollingTimer
    ) {

        clearInterval(
            attendancePollingTimer
        );

        attendancePollingTimer =
            null;

    }

}


/* =========================================================
   INITIALIZE ATTENDANCE SYSTEM
   ========================================================= */

async function initializeAttendance() {

    console.log(
        "Initializing AMA Smart Attendance System..."
    );


    /* =====================================================
       CHECK SUPABASE
       ===================================================== */

    if (
        typeof sb === "undefined"
    ) {

        console.error(
            "Supabase client 'sb' is not available."
        );


        showError(
            "❌ Supabase is not initialized."
        );


        return;

    }


    console.log(
        "Supabase client detected."
    );


    /* =====================================================
       LOAD INITIAL DATA
       ===================================================== */

    await loadTodayCount();

    await loadTodayAttendance();


    /* =====================================================
       INITIALIZE ATTENDANCE ID TRACKING
       ===================================================== */

    lastKnownAttendanceIds =
        new Set();


    todayAttendance.forEach(
        function (record) {

            if (record.id) {

                lastKnownAttendanceIds.add(
                    record.id
                );

            }

        }
    );


    /* =====================================================
       FOCUS BARCODE INPUT
       ===================================================== */

    if (barcodeInput) {

        barcodeInput.focus();

    }


    /* =====================================================
       START ESP32 ATTENDANCE MONITOR
       ===================================================== */

    startAttendanceMonitor();


    console.log(
        "Attendance System initialized successfully."
    );

}


/* =========================================================
   PAGE VISIBILITY
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.hidden
        ) {

            stopAttendanceMonitor();

        } else {

            startAttendanceMonitor();


            if (
                barcodeInput
            ) {

                const registerView =
                    document.getElementById(
                        "registerView"
                    );


                const registrationVisible =
                    registerView &&
                    !registerView.classList.contains(
                        "hidden"
                    );


                if (
                    !registrationVisible
                ) {

                    barcodeInput.focus();

                }

            }

        }

    }
);


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    function () {

        stopAttendanceMonitor();

    }
);


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAttendance
    );

} else {

    initializeAttendance();

}
