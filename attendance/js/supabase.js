/* ==========================================
   SUPABASE DATABASE FUNCTIONS
========================================== */


/* ==========================================
   CHECK SUPABASE CLIENT
========================================== */

function checkSupabaseClient() {

    if (!window.sb) {

        console.error(
            "Supabase client is not initialized."
        );

        return false;

    }

    return true;

}


/* ==========================================
   FACULTY
========================================== */

async function getFacultyProfile(id) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };

    }

    return await window.sb.rpc(
        "get_faculty_profile",
        {
            p_id: id
        }
    );

}


/* ==========================================
   STUDENTS
========================================== */

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
            "full_name",
            {
                ascending: true
            }
        );

}


async function getStudentByNumber(
    studentNumber
) {

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
        .single();

}


/* ==========================================
   SECTIONS
========================================== */

async function getSections() {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };

    }

    return await window.sb
        .from("sections")
        .select(`
            id,
            section_name,
            year_level,
            courses (
                course_name
            )
        `);

}


async function getStudentSection(
    sectionId
) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };

    }

    return await window.sb
        .from("sections")
        .select(
            "section_name"
        )
        .eq(
            "id",
            sectionId
        )
        .single();

}


/* ==========================================
   SUBJECTS
========================================== */

async function getStudentSubject(
    studentId
) {

    if (!checkSupabaseClient()) {

        return {
            data: null,
            error: new Error(
                "Supabase client is not initialized."
            )
        };

    }

    return await window.sb
        .from("student_subjects")
        .select(`
            subject_id,
            subjects (
                subject_name
            )
        `)
        .eq(
            "student_id",
            studentId
        )
        .single();

}


/* ==========================================
   ATTENDANCE
========================================== */

async function getTodayAttendance(
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

    return await window.sb
        .from("attendance_records")
        .select("*")
        .eq(
            "attendance_date",
            today
        );

}


/* ==========================================
   STUDENT ATTENDANCE
========================================== */

async function getStudentAttendance(
    studentId,
    facultySubjectId,
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

    return await window.sb
        .from("attendance_records")
        .select("*")
        .eq(
            "student_id",
            studentId
        )
        .eq(
            "faculty_subject_id",
            facultySubjectId
        )
        .eq(
            "attendance_date",
            today
        )
        .maybeSingle();

}


/* ==========================================
   INSERT ATTENDANCE
========================================== */

async function insertAttendance(
    data
) {

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
        .insert(data);

}


/* ==========================================
   UPDATE TIME OUT
========================================== */

async function updateTimeOut(
    id
) {

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
        );

}


/* ==========================================
   ATTENDANCE + STUDENT INFORMATION
========================================== */

async function getAttendanceWithStudents(
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

    return await window.sb
        .from("attendance_records")
        .select(`
            id,
            student_id,
            faculty_subject_id,
            attendance_date,
            status,
            time_in,
            time_out,
            students (
                id,
                full_name,
                student_number,
                section_id,
                course,
                major,
                year_level,
                department
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

}


/* ==========================================
   RECENT ATTENDANCE
========================================== */

async function getRecentAttendance(
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

    return await window.sb
        .from("attendance_records")
        .select(`
            id,
            status,
            time_in,
            time_out,
            attendance_date,
            student_id,
            faculty_subject_id,
            students (
                id,
                full_name,
                student_number,
                section_id,
                course,
                major,
                year_level,
                department
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
        )
        .limit(5);

}