const fs = require("fs");

function getShiftDuration(startTime, endTime) {  
    return secondsToTime(differenceTime(convertTo24(startTime), convertTo24(endTime)));
}

function getIdleTime(startTime, endTime) {
    let idleTime = 0;

    // find time before 8 am
    let differenceStart = differenceTime(convertTo24(startTime), "08:00:00");

    if (differenceStart > 0) {
        idleTime += differenceStart;
    }

    // find time after 10 pm
    let differenceEnd = differenceTime("22:00:00", convertTo24(endTime));

    if (differenceEnd > 0) {
        idleTime += differenceEnd;
    }

    idleTime = secondsToTime(idleTime);

    return idleTime;
}

function getActiveTime(shiftDuration, idleTime) {
    function formatTime(time) {
        if (time.length !== 11) {
            time = "0" + time;
        }

        return time;
    }

    shiftDuration = formatTime(shiftDuration);
    idleTime = formatTime(idleTime);
    
    let difference = differenceTime(idleTime, shiftDuration);
    return secondsToTime(difference);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // TODO: Implement this function
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function convertTo24(time) {
    let isPM = time.toLowerCase().includes("pm");
    let currentHour = Number(time.slice(0, time.indexOf(":")));
    let newHour = currentHour;
    
    if (isPM && currentHour != 12) {
        newHour += 12;
    } else if (!isPM && currentHour == 12) {
        newHour = 0;
    }

    let newTime = "";

    if (newHour === 0) {
        newTime += String("00");
    } else {
        if (parseInt(newHour / 10) === 0) {
            newTime += "0";
        }

        newTime += newHour;
    }

    if (time.length === 11) {
        newTime += time.substring(2, 8);
    } else {
        newTime += time.substring(1, 7);
    }

    return newTime;
}

function timeToSeconds(time) {
    let hours = Number(time.substring(0, 2));
    let minutes = Number(time.substring(3, 5));
    let seconds = Number(time.substring(6, 8));

    minutes += (hours * 60);
    seconds += (minutes * 60);

    return seconds;
}

function differenceTime(startTime, endTime) {
    // convert to seconds
    startTime = timeToSeconds(startTime);
    endTime = timeToSeconds(endTime);

    // subtract from each other
    let difference = endTime - startTime;

    return difference;
}

function secondsToTime(totalSeconds) {
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    let time = "";

    if (Math.floor(hours / 10) === 0) {
        time += "0" + String(hours);
    } else {
        time += String(hours);
    }

    time += ":";

    if (Math.floor(minutes / 10) === 0) {
        time += "0" + String(minutes);
    } else {
        time += String(minutes);
    }

    time += ":";

    if (Math.floor(seconds / 10) === 0) {
        time += "0" + String(seconds);
    } else {
        time += String(seconds);
    }

    return time;
}

function main() {
    let shiftDuration =  "5:00:10";
    let idleTime = "2:30:00";
    let activeTime = getActiveTime(shiftDuration, idleTime);

    console.log(activeTime);
}

main();