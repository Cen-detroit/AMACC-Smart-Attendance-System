/* ==========================================================
   SUPABASE DATABASE FUNCTIONS
   AMA FACULTY ATTENDANCE DASHBOARD
   ==========================================================

   CURRENT SYSTEM:

   Faculty authentication:
       faculty_accounts.id

   Attendance:
       Whole-day attendance / DTR style

   Attendance flow:
       First scan  = Time In
       Second scan = Time Out

   Main tables:
       faculty_accounts
       students
       attendance_records

   ========================================================== */


/* ==========================================================
   CHECK SUPABASE CLIENT
========================================================== */

function checkSupabaseClient() {

    if (!window.sb) {

        console.error(
            "Supabase client is not initialized."
        );

        return false;

    }

    return true;

}


/* ==========================================================
   FACULTY
========================================================== */


/*
   Get faculty profile.

   IMPORTANT:

   Option A authentication uses:

       faculty_accounts.id

   NOT:

       faculty_accounts.auth_user_id
*/

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
            p_id: Number(id)
        }
    );

}


/* ==========================================================
   GET ALL STUDENTS
========================================================== */

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

        .order(
            "full_name",
            {
                ascending: true
            }
        );

}


/* ==========================================================
   GET STUDENT BY STUDENT NUMBER
========================================================== */

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

        .eq(
            "student_number",
            studentNumber
        )

        .maybeSingle();

}


/* ==========================================================
   ATTENDANCE
========================================================== */


/*
   Get today's attendance records.

   This does NOT use faculty_subject_id.
*/

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

        .eq(
            "attendance_date",
            today
        )

        .order(
            "time_in",
            {
                ascending: false,
                nullsFirst: false
            }
        );

}


/* ==========================================================
   GET STUDENT ATTENDANCE FOR TODAY
========================================================== */


/*
   Finds the student's attendance record
   for the current date.

   No subject is required.
*/

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


    return await window.sb

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

        .eq(
            "student_id",
            studentId
        )

        .eq(
            "attendance_date",
            today
        )

        .maybeSingle();

}


/* ==========================================================
   INSERT ATTENDANCE
========================================================== */


/*
   Example:

   await insertAttendance({
       student_id: studentId,
       attendance_date: today,
       time_in: new Date().toISOString(),
       status: "Present"
   });
*/

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

        .insert(data)

        .select()

        .single();

}


/* ==========================================================
   UPDATE TIME OUT
========================================================== */


/*
   Updates the existing attendance record
   with the current Time Out.
*/

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
        )

        .select()

        .single();

}


/* ==========================================================
   UPDATE ATTENDANCE TIME OUT
========================================================== */


/*
   Allows a specific Time Out timestamp
   to be supplied.

   Useful if the scanner system already
   generated the timestamp.
*/

async function updateAttendanceTimeOut(
    id,
    timeOut
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
                timeOut

        })

        .eq(
            "id",
            id
        )

        .select()

        .single();

}


/* ==========================================================
   ATTENDANCE + STUDENT INFORMATION
========================================================== */


/*
   Gets attendance records together
   with student information.

   Used by the Faculty Dashboard.
*/

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
            attendance_date,
            status,
            remarks,
            time_in,
            time_out,
            created_at,

            students (
                id,
                full_name,
                student_number,
                photo_url,
                status,
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
                ascending: false,
                nullsFirst: false
            }
        );

}


/* ==========================================================
   RECENT ATTENDANCE
========================================================== */


/*
   Returns the five most recent
   attendance records for today.
*/

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
            student_id,
            attendance_date,
            status,
            remarks,
            time_in,
            time_out,
            created_at,

            students (
                id,
                full_name,
                student_number,
                photo_url,
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
                ascending: false,
                nullsFirst: false
            }
        )

        .limit(5);

}


/* ==========================================================
   ATTENDANCE HISTORY
========================================================== */


/*
   Gets all attendance records.

   Used by the Faculty Dashboard
   Attendance History section.
*/

async function getAttendanceHistory() {

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
            attendance_date,
            status,
            remarks,
            time_in,
            time_out,
            created_at,

            students (
                id,
                full_name,
                student_number,
                photo_url,
                course,
                major,
                year_level,
                department
            )
        `)

        .order(
            "attendance_date",
            {
                ascending: false
            }
        )

        .order(
            "time_in",
            {
                ascending: false,
                nullsFirst: false
            }
        );

}


/* ==========================================================
   UPDATE ATTENDANCE STATUS
========================================================== */


/*
   Allows the Faculty Dashboard to change
   the attendance status if needed.

   Example:

       Present
       Late
       Absent
*/

async function updateAttendanceStatus(
    id,
    status
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

            status:
                status

        })

        .eq(
            "id",
            id
        )

        .select()

        .single();

}


/* ==========================================================
   UPDATE ATTENDANCE REMARKS
========================================================== */

async function updateAttendanceRemarks(
    id,
    remarks
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

            remarks:
                remarks

        })

        .eq(
            "id",
            id
        )

        .select()

        .single();

}


/* ==========================================================
   REALTIME ATTENDANCE CHANNEL
========================================================== */


/*
   Creates a realtime subscription
   for attendance_records.

   The Faculty Dashboard can use this
   to automatically refresh when the
   scanner creates or updates attendance.
*/

function createAttendanceRealtimeChannel(
    callback
) {

    if (!checkSupabaseClient()) {

        return null;

    }


    const channel =
        window.sb

            .channel(
                "faculty-attendance-live"
            )

            .on(

                "postgres_changes",

                {

                    event: "*",

                    schema: "public",

                    table:
                        "attendance_records"

                },

                payload => {

                    console.log(
                        "Attendance realtime update:",
                        payload
                    );


                    if (
                        typeof callback ===
                        "function"
                    ) {

                        callback(
                            payload
                        );

                    }

                }

            )

            .subscribe(

                status => {

                    console.log(
                        "Attendance realtime status:",
                        status
                    );

                }

            );


    return channel;

}


/* ==========================================================
   REMOVE REALTIME CHANNEL
========================================================== */

async function removeAttendanceRealtimeChannel(
    channel
) {

    if (
        !channel ||
        !checkSupabaseClient()
    ) {

        return;

    }


    try {

        await window.sb.removeChannel(
            channel
        );

    }
    catch (error) {

        console.error(
            "Unable to remove realtime channel:",
            error
        );

    }

}


/* ==========================================================
   FACULTY LOGOUT
========================================================== */

function clearFacultySession() {

    localStorage.removeItem(
        "faculty"
    );

    localStorage.removeItem(
        "loggedIn"
    );

}

/* ==========================================
   FACULTY REPORTS
========================================== */

async function createFacultyReport(
    facultyId,
    subject,
    message
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
        .from("faculty_reports")
        .insert({
            faculty_id: facultyId,
            subject: subject,
            message: message,
            status: "Pending"
        })
        .select()
        .single();

}


/* ==========================================
   GET FACULTY REPORTS
========================================== */

async function getFacultyReports(
    facultyId
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
        .from("faculty_reports")
        .select(`
            id,
            faculty_id,
            subject,
            message,
            status,
            created_at,
            updated_at
        `)
        .eq(
            "faculty_id",
            facultyId
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

}