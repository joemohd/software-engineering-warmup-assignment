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
    shiftDuration = formatTime(shiftDuration);
    idleTime = formatTime(idleTime);
    
    let difference = differenceTime(idleTime, shiftDuration);
    return secondsToTime(difference);
}

function metQuota(date, activeTime) {
    activeTime = formatTime(activeTime);
    let isEid = isDateEid(date);
    let timeInSeconds = timeToSeconds(activeTime);

    if (!isEid && timeInSeconds >= 30240) {
        return true;
    } else if (isEid && timeInSeconds >= 21600) {
        return true;
    } else {
        return false;
    }
}

function addShiftRecord(textFile, shiftObj) {
    const data = fs.readFileSync(textFile, "utf8");
    const lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const elements = lines[i].split(",");
        const driverID = elements[0];
        const date = elements[2];

        if (!(driverID === shiftObj.driverID && date === shiftObj.date)) {
            return {};
        }
    }

    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);

    const newLine = shiftObj.driverID + "," +
                    shiftObj.driverName + "," +
                    shiftObj.date + "," +
                    shiftObj.startTime + "," +
                    shiftObj.endTime + "," +
                    shiftDuration + "," +
                    idleTime + "," +
                    activeTime + "," +
                    metQuota(shiftObj.date, activeTime) + "," +
                    "false";
    
    fs.appendFileSync(textFile, "\n" + newLine);
}

function setBonus(textFile, driverID, date, newValue) {
    const data = fs.readFileSync(textFile, "utf8");
    let lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const elements = lines[i].split(",");

        if (elements[0] === driverID && elements[2] === date) {
            let newLine = "";

            for (let j = 0; j < elements.length - 1; j++) {
                newLine += elements[j] + ",";
            }

            newLine += String(newValue);

            lines[i] = newLine;
            const newData = lines.join("\n");
            fs.writeFileSync(textFile, newData);
        }
    }
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

function formatTime(time) {
    if (time.length !== 11 && time.length !== 8) {
        return "0" + String(time);
    } else {
        return time;
    }
}

function isDateEid(date) {
    let year = Number(date.substring(0, 4));
    let month = Number(date.substring(5, 7));
    let day = Number(date.substring(8, 10));

    return (year === 2025) && (month === 4) && (day >= 10 && day <= 30);
}

function main() {
    let date =  "2025-04-05";
    let activeTime = "09:00:00";
    let hasMetQuota = metQuota(date, activeTime);

    console.log(hasMetQuota);
}

main();