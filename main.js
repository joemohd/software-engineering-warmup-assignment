const fs = require("fs");

function getShiftDuration(startTime, endTime) {
    return differenceTime(convertTo24(startTime), convertTo24(endTime));
}

function getIdleTime(startTime, endTime) {
    let idleTime = 0;

    // find time before 8 am
    let differenceStart = timeToSeconds(differenceTime(convertTo24(startTime), "08:00:00"));

    if (differenceStart > 0) {
        idleTime += differenceStart;
    }

    // find time after 10 pm
    let differenceEnd = timeToSeconds(differenceTime("22:00:00", convertTo24(endTime)));

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
    return difference;
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
    return shiftObj;
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

function countBonusPerMonth(textFile, driverID, month) {
    const data = fs.readFileSync(textFile, "utf8");
    const lines = data.split("\n");

    let count = 0;
    let flag = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") {
            continue;
        }
        const elements = lines[i].split(",");
        const date = elements[2];
        const thisMonth = Number((date.split("-"))[1]);
        const thisDriverID = Number(elements[0]);
        const isBonus = Boolean(elements[9]);

        if (thisDriverID === driverID) {
            if (thisMonth === month && isBonus) {
                count++;
            }

            flag = true;
        }
    }

    if (!flag) {
        return -1;
    } else {
        return count;
    }
}

function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const data = fs.readFileSync(textFile, "utf8");
    const lines = data.split("\n");
    let total = "00:00:00";

    for (let i = 0; i < lines.length; i++) {
        const elements = lines[i].split(",");
        const date = String(elements[2]);
        const thisMonth = Number((date.split("-"))[1]); // yyyy-mm-dd
        const thisDriverID = Number(elements[0]);

        if (thisDriverID === driverID && thisMonth === month) {
            const startTime = elements[3];
            const endTime = elements[4];
            total = addTime(total, getActiveTime(getShiftDuration(startTime, endTime), getIdleTime(startTime, endTime)));
        } 
    }

    return total;
}

function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const hoursReduced = bonusCount * 2;
    const dayCount = countMonthDays(month);
    let hoursCount = 0;

    for (let i = 0; i < 9; i++) {
        if (!isDateEid("2024-" + month + "-" + (i + 1))) {
            hoursCount += 8.4;
        } else {
            hoursCount += 6;
        }
    }

    for (let i = 9; i < dayCount; i++) {
        if (!isDateEid("2024-" + month + "-" + (i + 1))) {
            hoursCount += 8.4;
        } else {
            hoursCount += 6;
        }
    }

    const secondsCount = (hoursCount - hoursReduced) * 60 * 60;

    return secondsToTime(secondsCount);
}

function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // driverID, dayOff, basePay, tiers
    let missingHours = timeToSeconds(requiredHours) - timeToSeconds(actualHours) / 3600;
    let basePay = 0;
    let tier = 0;
    
    const data = fs.readFileSync(rateFile, "utf8");
    const lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const elements = lines[i].split(",");
        const thisDriverID = Number(elements[0]);
        
        if (thisDriverID === driverID) {
            basePay = Number(elements[2]);
            tier = Number(elements[3]);
            break;
        }
    }

    let allowedMissingHours = 0;

    switch (tier) {
        case 1: allowedMissingHours = 50; break;
        case 2: allowedMissingHours = 20; break;
        case 3: allowedMissingHours = 10; break;
        case 4: allowedMissingHours = 3; break;
    }

    missingHours -= allowedMissingHours;

    let actualPay = basePay;

    if (missingHours > 0) {
        actualPay -= Math.roundDown((basePay / 185) * missingHours);
    }

    return actualPay;
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

// HELPER FUNCTIONS

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

    if (startTime > endTime) {
        return "error";
    }

    // subtract from each other
    let difference = endTime - startTime;

    return secondsToTime(difference);
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

function addTime(time1, time2) {
    time1 = timeToSeconds(time1);
    time2 = timeToSeconds(time2);

    let total = time1 + time2;

    return secondsToTime(total);
}

function countMonthDays(month) {
    month = Number(month);

    switch(month) {
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            return 31;
        case 2:
            return 29;
        case 4:
        case 6:
        case 9:
        case 11:
            return 30;
    }
}

function main() {
    let date =  "2025-04-05";
    let activeTime = "09:00:00";
    let hasMetQuota = metQuota(date, activeTime);

    console.log(hasMetQuota);
}

main();