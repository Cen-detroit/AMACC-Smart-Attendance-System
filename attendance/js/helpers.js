// ========================================
// HELPER FUNCTIONS
// ========================================

// Update Live Date & Time
function updateDateTime() {

    const now = new Date();

    const day = document.getElementById("currentDay");
    const date = document.getElementById("currentDate");
    const time = document.getElementById("currentTime");

    if(day){
        day.innerHTML = now.toLocaleDateString("en-US", {
            weekday: "long"
        });
    }

    if(date){
        date.innerHTML = now.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    }

    if(time){
        time.innerHTML = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        });
    }

}

// Format Time
function formatTime(datetime){

    if(!datetime) return "--:--";

    return new Date(datetime).toLocaleTimeString([],{
        hour:"numeric",
        minute:"2-digit"
    });

}

// Format Date
function formatDate(date){

    return new Date(date).toLocaleDateString();

}

// Logout
function logout(){

    localStorage.removeItem("faculty");
    localStorage.removeItem("facultyNameOverride");
    localStorage.removeItem("facultyEmailOverride");

    window.location.href = "Login.html";

}