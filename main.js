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
    return differenceTime(idleTime, shiftDuration);
}

function metQuota(date, activeTime) {
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
        if (lines[i].trim() == "") {
            continue;
        }
        const elements = lines[i].split(",");
        const driverID = elements[0].trim();
        const date = elements[2].trim();

        if (driverID === shiftObj.driverID && date === shiftObj.date) {
            return {};
        }
    }

    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const hasMetQuota = metQuota(shiftObj.date, activeTime);

    const newLine = shiftObj.driverID + "," +
        shiftObj.driverName + "," +
        shiftObj.date + "," +
        shiftObj.startTime + "," +
        shiftObj.endTime + "," +
        shiftDuration + "," +
        idleTime + "," +
        activeTime + "," +
        hasMetQuota + "," +
        "false";

    const newObject = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        hasMetQuota: hasMetQuota,
        hasBonus: false
    };

    fs.appendFileSync(textFile, "\n" + newLine);
    return newObject;
}

function setBonus(textFile, driverID, date, newValue) {
    const data = fs.readFileSync(textFile, "utf8");
    let lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const elements = lines[i].split(",");

        if (elements[0].trim() === driverID && elements[2] === date) {
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
        const thisDriverID = elements[0].trim();
        const isBonus = (elements[9].substring(0, 4) === "true");

        if (thisDriverID == driverID) {
            if (thisMonth == month && isBonus) {
                count++;
            }

            flag = true;
        }
    }

    if (flag === false) {
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
        const thisDriverID = elements[0].trim();

        if (thisDriverID === driverID && thisMonth === month) {
            const startTime = elements[3];
            const endTime = elements[4];
            total = addTime(total, getActiveTime(getShiftDuration(startTime, endTime), getIdleTime(startTime, endTime)));
        }
    }

    return total;
}

function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const data = fs.readFileSync(textFile, "utf8");
    const lines = data.split("\n");
    let hoursCount = 0;

    let workedDays = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") {
            continue;
        }

        const elements = lines[i].split(",");

        const thisDriverID = elements[0].trim();
        const date = elements[2].trim();
        const dateParts = date.split("-");

        if (dateParts.length >= 2) {
            const thisMonth = Number(dateParts[1]);
            if (thisDriverID === driverID && thisMonth === month) {
                let duplicate = false;
                for (let j = 0; j < workedDays.length; j++) {
                    if (workedDays[j] === date) {
                        duplicate = true;
                        break;
                    }
                }

                if (!duplicate) {
                    workedDays.push(date);
                }
            }
        }
    }

    for (let i = 0; i < workedDays.length; i++) {
        if (!isDateEid(workedDays[i])) {
            hoursCount += 8.4;
        } else {
            hoursCount += 6;
        }
    }

    const hoursReduced = bonusCount * 2;
    const secondsCount = (hoursCount - hoursReduced) * 60 * 60;

    return secondsToTime(Math.round(secondsCount));
}

function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // driverID, dayOff, basePay, tiers
    let missingHours = Math.floor((timeToSeconds(requiredHours) - timeToSeconds(actualHours)) / 3600);
    let basePay = 0;
    let tier = 0;

    const data = fs.readFileSync(rateFile, "utf8");
    const lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const elements = lines[i].split(",");
        const thisDriverID = elements[0].trim();

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
        actualPay -= Math.floor((basePay / 185) * missingHours);
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
    time = time.trim().toLowerCase();
    let isPM = time.includes("pm");
    time = time.split(" ")[0];
    let timeArray = time.split(":");

    if (isPM && Number(timeArray[0]) < 12) {
        timeArray[0] = String(Number(timeArray[0]) + 12);
    } else if (!isPM && Number(timeArray[0]) == 12) {
        timeArray[0] = "0";
    }

    time = timeArray.join(":");

    return time;
}

function timeToSeconds(time) {
    let timeArray = time.split(":");
    let hours = Number(timeArray[0]);
    let minutes = Number(timeArray[1]);
    let seconds = Number(timeArray[2]);

    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(totalSeconds) {
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    let time = hours + ":";

    if (minutes < 10) {
        time += "0" + minutes;
    } else {
        time += minutes;
    }

    time += ":";

    if (seconds < 10) {
        time += "0" + seconds;
    } else {
        time += seconds;
    }

    return time;
}

function differenceTime(startTime, endTime) {
    startTime = timeToSeconds(startTime);
    endTime = timeToSeconds(endTime);

    return secondsToTime(endTime - startTime);
}

function isDateEid(date) {
    let dateArray = date.split("-");
    let year = Number(dateArray[0]);
    let month = Number(dateArray[1]);
    let day = Number(dateArray[2]);

    return (year === 2025) && (month === 4) && (day >= 10 && day <= 30);
}

function addTime(time1, time2) {
    time1 = timeToSeconds(time1);
    time2 = timeToSeconds(time2);

    return secondsToTime(time1 + time2);
}

function countMonthDays(month, year) {
    switch (month) {
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            return 31;
        case 2:
            if (year % 4 == 0 && year % 100 != 0 && year % 400 == 0) {
                return 29;
            } else {
                return 28;
            }
        case 4:
        case 6:
        case 9:
        case 11:
            return 30;
    }
}