/* =========================================================
   AMA SMART ATTENDANCE SYSTEM
   SUPABASE CLIENT + DATABASE FUNCTIONS
========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL = "https://sxmqqklyfeyegmlepwbx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hVHVwb5OeYAI_rUMAq-YIw_dfQJSpvO";


/* =========================================================
   INITIALIZE SUPABASE
========================================================= */

if (
    typeof window.supabase === "undefined"
) {

    console.error(
        "Supabase JavaScript library was not loaded."
    );

} else {

    try {

        window.sb =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );

        console.log(
            "Supabase client initialized successfully."
        );

    } catch (error) {

        console.error(
            "Supabase initialization failed:",
            error
        );

    }

}


/* =========================================================
   SUPABASE CLIENT CHECK
========================================================= */

function checkSupabaseClient() {

    if (!window.sb) {

        console.error(
            "Supabase client is not initialized."
        );

        return false;
    }

    return true;
}


/* =========================================================
   PHILIPPINE DATE
========================================================= */

function getPhilippineDate() {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(new Date());
}


/* =========================================================
   FACULTY PROFILE
========================================================= */

async function getFacultyProfile(id) {

    if (!checkSupabaseClient()) {
        return {
            data: null,
            error: new Error("Supabase client is not initialized.")
        };
    }

    try {

        return await window.sb
            .rpc(
                "get_faculty_profile",
                {
                    p_id: id
                }
            );

    } catch (error) {

        console.error(
            "Faculty profile error:",
            error
        );

        return {
            data: null,
            error: error
        };
    }
}


/* =========================================================
   LOAD FACULTY
========================================================= */

async function loadFaculty() {

    if (!checkSupabaseClient()) {
        return [];
    }

    try {

        const {
            data,
            error
        } = await window.sb
            .from("faculty_accounts")
            .select(`
                id,
                employee_number,
                full_name,
                email,
                role,
                created_at,
                auth_user_id
            `)
            .order(
                "full_name",
                {
                    ascending: true
                }
            );

        if (error) {

            console.error(
                "Error loading faculty:",
                error
            );

            return [];
        }

        return data || [];

    } catch (error) {

        console.error(
            "Faculty loading exception:",
            error
        );

        return [];
    }
}


/* =========================================================
   GET SINGLE FACULTY
========================================================= */

async function getFaculty(facultyId) {

    if (!checkSupabaseClient()) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await window.sb
            .from("faculty_accounts")
            .select(`
                id,
                employee_number,
                full_name,
                email,
                role,
                created_at,
                auth_user_id
            `)
            .eq(
                "id",
                facultyId
            )
            .maybeSingle();

        if (error) {

            console.error(
                "Get faculty error:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "Get faculty exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   STUDENTS
========================================================= */

async function loadStudents() {

    if (!checkSupabaseClient()) {
        return [];
    }

    try {

        const {
            data,
            error
        } = await window.sb
            .from("students")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {

            console.error(
                "Error loading students:",
                error
            );

            return [];
        }

        return data || [];

    } catch (error) {

        console.error(
            "Student loading exception:",
            error
        );

        return [];
    }
}


/* =========================================================
   GET ALL STUDENTS
========================================================= */

async function getStudents() {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    return await window.sb
        .from("students")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );
}


/* =========================================================
   GET SINGLE STUDENT
========================================================= */

async function getStudent(studentId) {

    if (!checkSupabaseClient()) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await window.sb
            .from("students")
            .select("*")
            .eq(
                "id",
                studentId
            )
            .maybeSingle();

        if (error) {

            console.error(
                "Error loading student:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "Get student exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET STUDENT BY NUMBER
========================================================= */

async function getStudentByNumber(studentNumber) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    return await window.sb
        .from("students")
        .select("*")
        .eq(
            "student_number",
            studentNumber
        )
        .maybeSingle();
}


/* =========================================================
   UPDATE STUDENT
========================================================= */

async function updateStudent(
    studentId,
    studentData
) {

    if (!checkSupabaseClient()) {

        return {
            success: false,
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    try {

        const {
            data,
            error
        } = await window.sb
            .from("students")
            .update(studentData)
            .eq(
                "id",
                studentId
            )
            .select()
            .maybeSingle();

        if (error) {

            console.error(
                "Update student error:",
                error
            );

            return {
                success: false,
                data: null,
                error: error
            };
        }

        return {
            success: true,
            data: data || null,
            error: null
        };

    } catch (error) {

        console.error(
            "Update student exception:",
            error
        );

        return {
            success: false,
            data: null,
            error: error
        };
    }
}


/* =========================================================
   DELETE STUDENT
========================================================= */

async function deleteStudentFromDatabase(studentId) {

    if (!checkSupabaseClient()) {

        return {
            success: false,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    try {

        const {
            error
        } = await window.sb
            .from("students")
            .delete()
            .eq(
                "id",
                studentId
            );

        if (error) {

            console.error(
                "Delete student error:",
                error
            );

            return {
                success: false,
                error: error
            };
        }

        return {
            success: true,
            error: null
        };

    } catch (error) {

        console.error(
            "Delete student exception:",
            error
        );

        return {
            success: false,
            error: error
        };
    }
}


/* =========================================================
   STUDENT PHOTO UPLOAD
========================================================= */

async function uploadStudentPhoto(file) {

    if (!checkSupabaseClient()) {
        return null;
    }

    if (!file) {
        return null;
    }

    try {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        const fileName =
            "student-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8) +
            "." +
            extension;

        const filePath =
            "students/" +
            fileName;

        const bucketName =
            "student-photos";

        const {
            error: uploadError
        } = await window.sb.storage
            .from(bucketName)
            .upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );

        if (uploadError) {

            console.error(
                "Student photo upload error:",
                uploadError
            );

            return null;
        }

        const {
            data
        } = window.sb.storage
            .from(bucketName)
            .getPublicUrl(
                filePath
            );

        return data?.publicUrl || null;

    } catch (error) {

        console.error(
            "Student photo upload exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   TODAY ATTENDANCE
========================================================= */

async function loadTodayAttendance() {

    if (!checkSupabaseClient()) {
        return [];
    }

    try {

        const today =
            getPhilippineDate();

        const {
            data,
            error
        } = await window.sb
            .from("attendance_records")
            .select(`
                id,
                student_id,
                attendance_date,
                status,
                time_in,
                time_out,
                students (
                    id,
                    full_name,
                    student_number,
                    department,
                    course,
                    major,
                    year_level
                )
            `)
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
                "Error loading today's attendance:",
                error
            );

            return [];
        }

        return data || [];

    } catch (error) {

        console.error(
            "Attendance loading exception:",
            error
        );

        return [];
    }
}


/* =========================================================
   GET TODAY ATTENDANCE
========================================================= */

async function getTodayAttendance(today) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    const attendanceDate =
        today ||
        getPhilippineDate();

    return await window.sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            attendance_date,
            status,
            time_in,
            time_out
        `)
        .eq(
            "attendance_date",
            attendanceDate
        )
        .order(
            "time_in",
            {
                ascending: false
            }
        );
}


/* =========================================================
   STUDENT ATTENDANCE
========================================================= */

async function getStudentAttendance(
    studentId,
    today
) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    const attendanceDate =
        today ||
        getPhilippineDate();

    return await window.sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            attendance_date,
            status,
            time_in,
            time_out
        `)
        .eq(
            "student_id",
            studentId
        )
        .eq(
            "attendance_date",
            attendanceDate
        )
        .maybeSingle();
}


/* =========================================================
   INSERT ATTENDANCE
========================================================= */

async function insertAttendance(data) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    return await window.sb
        .from("attendance_records")
        .insert(data)
        .select()
        .maybeSingle();
}


/* =========================================================
   UPDATE TIME OUT
========================================================= */

async function updateTimeOut(id) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    return await window.sb
        .from("attendance_records")
        .update({
            time_out:
                new Date().toISOString()
        })
        .eq(
            "id",
            id
        )
        .select()
        .maybeSingle();
}


/* =========================================================
   ATTENDANCE WITH STUDENT INFORMATION
========================================================= */

async function getAttendanceWithStudents(today) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    const attendanceDate =
        today ||
        getPhilippineDate();

    return await window.sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            attendance_date,
            status,
            time_in,
            time_out,
            students (
                id,
                full_name,
                student_number,
                department,
                course,
                major,
                year_level
            )
        `)
        .eq(
            "attendance_date",
            attendanceDate
        )
        .order(
            "time_in",
            {
                ascending: false
            }
        );
}


/* =========================================================
   RECENT ATTENDANCE
========================================================= */

async function getRecentAttendance(today) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };
    }

    const attendanceDate =
        today ||
        getPhilippineDate();

    return await window.sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            attendance_date,
            status,
            time_in,
            time_out,
            students (
                id,
                full_name,
                student_number,
                department,
                course,
                major,
                year_level
            )
        `)
        .eq(
            "attendance_date",
            attendanceDate
        )
        .order(
            "time_in",
            {
                ascending: false
            }
        )
        .limit(5);
}


/* =========================================================
   CURRENT ADMIN SESSION
========================================================= */

async function getCurrentAdmin() {

    if (!checkSupabaseClient()) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await window.sb.auth.getSession();

        if (error) {

            console.error(
                "Get admin session error:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.error(
            "Admin session exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   CURRENT AUTH USER
========================================================= */

async function getCurrentUser() {

    if (!checkSupabaseClient()) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await window.sb.auth.getUser();

        if (error) {

            console.error(
                "Get current user error:",
                error
            );

            return null;
        }

        return data?.user || null;

    } catch (error) {

        console.error(
            "Current user exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   ADMIN LOGOUT
========================================================= */

async function logoutAdmin() {

    try {

        if (checkSupabaseClient()) {

            const {
                error
            } = await window.sb.auth.signOut();

            if (error) {

                console.error(
                    "Supabase logout error:",
                    error
                );
            }
        }

    } catch (error) {

        console.error(
            "Logout exception:",
            error
        );

    } finally {

        localStorage.removeItem("faculty");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("admin");

        window.location.replace(
            "Login.html"
        );
    }
}


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.checkSupabaseClient =
    checkSupabaseClient;

window.getPhilippineDate =
    getPhilippineDate;

window.getFacultyProfile =
    getFacultyProfile;

window.loadFaculty =
    loadFaculty;

window.getFaculty =
    getFaculty;

window.loadStudents =
    loadStudents;

window.getStudents =
    getStudents;

window.getStudent =
    getStudent;

window.getStudentByNumber =
    getStudentByNumber;

window.updateStudent =
    updateStudent;

window.deleteStudentFromDatabase =
    deleteStudentFromDatabase;

window.uploadStudentPhoto =
    uploadStudentPhoto;

window.loadTodayAttendance =
    loadTodayAttendance;

window.getTodayAttendance =
    getTodayAttendance;

window.getStudentAttendance =
    getStudentAttendance;

window.insertAttendance =
    insertAttendance;

window.updateTimeOut =
    updateTimeOut;

window.getAttendanceWithStudents =
    getAttendanceWithStudents;

window.getRecentAttendance =
    getRecentAttendance;

window.getCurrentAdmin =
    getCurrentAdmin;

window.getCurrentUser =
    getCurrentUser;

window.logoutAdmin =
    logoutAdmin;