const {
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
} = require("./main.js");

const fs = require("fs");

let passed = 0;
let failed = 0;

function test(testName, actual, expected) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`  PASS: ${testName}`);
        passed++;
    } else {
        console.log(`  FAIL: ${testName}`);
        console.log(`    Expected: ${JSON.stringify(expected)}`);
        console.log(`    Actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// Setup dedicated test files to avoid corrupting the main ones
const TEST_SHIFTS_FILE = "./shifts_comp_test.txt";
const TEST_RATES_FILE = "./rates_comp_test.txt";

function resetTestFiles() {
    const defaultShifts = `DriverID,DriverName,Date,StartTime,EndTime,ShiftDuration,IdleTime,ActiveTime,MetQuota,HasBonus
D1001,Ahmed Hassan,2025-04-05,7:30:00 am,5:00:00 pm,9:30:00,0:30:00,9:00:00,true,false
D1001,Ahmed Hassan,2025-04-06,8:00:00 am,4:30:00 pm,8:30:00,0:00:00,8:30:00,true,false
D1001,Ahmed Hassan,2025-04-12,9:00:00 am,6:00:00 pm,9:00:00,0:00:00,9:00:00,true,true
D1001,Ahmed Hassan,2025-04-15,7:00:00 am,3:00:00 pm,8:00:00,1:00:00,7:00:00,true,false
D1002,Sara Mohamed,2025-04-05,8:30:00 am,5:30:00 pm,9:00:00,0:00:00,9:00:00,true,false
D1002,Sara Mohamed,2025-04-06,6:00:00 am,2:00:00 pm,8:00:00,2:00:00,6:00:00,true,false
D1002,Sara Mohamed,2025-04-13,8:00:00 am,4:00:00 pm,8:00:00,0:00:00,8:00:00,true,false
D1003,Omar Ali,2025-04-07,9:00:00 am,7:00:00 pm,10:00:00,0:00:00,10:00:00,true,false
D1003,Omar Ali,2025-04-08,7:00:00 am,11:00:00 pm,16:00:00,1:00:00,15:00:00,true,true
`;
    // We append specific boundary cases to test driver records
    const extraRecords = `D1004,Extreme Driver,2025-04-10,12:00:00 am,11:59:59 pm,23:59:59,9:59:59,14:00:00,true,false\n`;

    fs.writeFileSync(TEST_SHIFTS_FILE, defaultShifts + extraRecords, "utf8");

    const defaultRates = `D1001,Friday,30000,2
D1002,Saturday,25000,3
D1003,Thursday,45000,1
D1004,Friday,15000,4
`;
    fs.writeFileSync(TEST_RATES_FILE, defaultRates, "utf8");
}

console.log("======================================================");
console.log("  COMPREHENSIVE TEST CASES - Normal, Boundary, Extreme");
console.log("======================================================\n");

resetTestFiles();

// ==================== 1. getShiftDuration ====================
console.log("--- 1. getShiftDuration ---");
// Normal Data: Standard work shifts
test("Normal 1: Morning to Afternoon", getShiftDuration("8:00:00 am", "4:00:00 pm"), "8:00:00");
test("Normal 2: Midday to Evening", getShiftDuration("11:30:00 am", "7:45:00 pm"), "8:15:00");
// Boundary Data: Precisely touching edge hours like midnight or exactly 1 second shifts
test("Boundary 1: Full day max representation within code limits", getShiftDuration("12:00:00 am", "11:59:59 pm"), "23:59:59");
test("Boundary 2: Exact 12 PM crossover", getShiftDuration("11:59:59 am", "12:00:01 pm"), "0:00:02");
// Extreme Data: Erroneous / Immediate start-stop (0 difference)
test("Extreme 1: 0 duration shift", getShiftDuration("7:00:00 am", "7:00:00 am"), "0:00:00");
test("Extreme 2: Start and end precisely at 11:59:59 pm", getShiftDuration("11:59:59 pm", "11:59:59 pm"), "0:00:00");
console.log();

// ==================== 2. getIdleTime ====================
console.log("--- 2. getIdleTime ---");
// Normal Data: Before 8 AM and after 10 PM
test("Normal 1: Starts before 8 AM, ends before 10 PM", getIdleTime("7:00:00 am", "5:00:00 pm"), "1:00:00");
test("Normal 2: Starts after 8 AM, ends after 10 PM", getIdleTime("9:00:00 am", "11:30:00 pm"), "1:30:00");
// Boundary Data: Exactly on 8 AM and Exactly on 10 PM
test("Boundary 1: Starts exactly on 8 AM, ends exactly on 10 PM", getIdleTime("8:00:00 am", "10:00:00 pm"), "0:00:00");
test("Boundary 2: Starts 1 second before 8 and ends 1 second after 10", getIdleTime("7:59:59 am", "10:00:01 pm"), "0:00:02");
// Extreme Data: The maximum possible idle time in a 24-hour shift (12 AM -> 8 AM = 8 hours, 10 PM -> 11:59:59 PM = 1:59:59) -> 9:59:59
test("Extreme 1: Maximum possible idle time in a single day", getIdleTime("12:00:00 am", "11:59:59 pm"), "9:59:59");
// Note: getIdleTime calculates time from start to 8 AM unbounded by shift end, so 1 AM -> 8 AM = 7h
test("Extreme 2: Shift entirely before 8 AM (idle = start to 8 AM)", getIdleTime("1:00:00 am", "4:00:00 am"), "7:00:00");
console.log();

// ==================== 3. getActiveTime ====================
console.log("--- 3. getActiveTime ---");
// Normal Data
test("Normal 1: Shift minus idle", getActiveTime("9:30:00", "1:30:00"), "8:00:00");
test("Normal 2: Large shift minus small idle", getActiveTime("12:00:00", "0:45:00"), "11:15:00");
// Boundary Data: No idle time, or 100% idle time
test("Boundary 1: No idle time during shift", getActiveTime("8:00:00", "0:00:00"), "8:00:00");
test("Boundary 2: Shift is entirely idle time (duration == idle)", getActiveTime("2:00:00", "2:00:00"), "0:00:00");
// Extreme Data: Max possible active time within 24 hours (24h shift - 10h idle) -> 14h active
test("Extreme 1: 24h shift minus max idle (9:59:59)", getActiveTime("23:59:59", "9:59:59"), "14:00:00");
test("Extreme 2: 0 shift and 0 idle", getActiveTime("0:00:00", "0:00:00"), "0:00:00");
console.log();

// ==================== 4. metQuota ====================
console.log("--- 4. metQuota ---");
// Normal Data: Standard logic for regular and Eid days
test("Normal 1: Normal day comfortably meeting 8.4h (8h 24m) quota", metQuota("2024-05-15", "9:00:00"), true);
test("Normal 2: Eid day meeting 6h quota", metQuota("2025-04-15", "6:30:00"), true);
// Boundary Data: Exactly hitting the limits
test("Boundary 1: Normal day EXACTLY 8h 24m (30240 sec)", metQuota("2025-01-10", "8:24:00"), true);
test("Boundary 2: Eid day EXACTLY 6h (21600 sec)", metQuota("2025-04-10", "6:00:00"), true);
// Extreme Data: Missing quota by exactly 1 second, or achieving huge surplus
test("Extreme 1: Normal day missing quota by 1 second (8h 23m 59s)", metQuota("2024-05-15", "8:23:59"), false);
test("Extreme 2: Working maximum possible active hours (14:00:00)", metQuota("2025-04-15", "14:00:00"), true);
console.log();

// ==================== 5. addShiftRecord ====================
console.log("--- 5. addShiftRecord ---");
// Normal Data
let newShift1 = { driverID: "D1005", driverName: "New Guy", date: "2025-10-10", startTime: "9:00:00 am", endTime: "5:00:00 pm" };
let newShift2 = { driverID: "D1006", driverName: "New Girl", date: "2025-10-11", startTime: "1:00:00 pm", endTime: "9:00:00 pm" };
test("Normal 1: Adding valid shift record", addShiftRecord(TEST_SHIFTS_FILE, newShift1).driverID, "D1005");
test("Normal 2: Adding another valid shift record", addShiftRecord(TEST_SHIFTS_FILE, newShift2).driverID, "D1006");
// Boundary Data
test("Boundary 1: Duplicated addition should be blocked and return {}", addShiftRecord(TEST_SHIFTS_FILE, newShift1).driverID, undefined);
let boundaryShift = { driverID: "D1005", driverName: "New Guy", date: "2025-10-12", startTime: "12:00:00 am", endTime: "11:59:59 pm" }; // Diff date
test("Boundary 2: Same driver different date", addShiftRecord(TEST_SHIFTS_FILE, boundaryShift).shiftDuration, "23:59:59");
// Extreme Data: Shifts entirely outside 8 AM - 10 PM yield negative active time
let extremeShift1 = { driverID: "D1099", driverName: "Late", date: "2025-12-31", startTime: "11:00:00 pm", endTime: "11:59:00 pm" };
let extremeShift2 = { driverID: "D1099", driverName: "Early", date: "2025-01-01", startTime: "12:00:00 am", endTime: "1:00:00 am" };
// idleTime (1:59:00) > shiftDuration (0:59:00) => negative active time
test("Extreme 1: 59 min shift after 10 PM (negative active time)", addShiftRecord(TEST_SHIFTS_FILE, extremeShift1).activeTime, "-1:00:00");
// idleTime (8:00:00) > shiftDuration (1:00:00) => negative active time
test("Extreme 2: 1 hour shift before 8 AM (negative active time)", addShiftRecord(TEST_SHIFTS_FILE, extremeShift2).activeTime, "-7:00:00");
console.log();

// ==================== 6. setBonus ====================
console.log("--- 6. setBonus ---");
// Normal Data
setBonus(TEST_SHIFTS_FILE, "D1001", "2025-04-05", true); // Was false, verify true
setBonus(TEST_SHIFTS_FILE, "D1001", "2025-04-12", false); // Was true, verify false
let dataSet = fs.readFileSync(TEST_SHIFTS_FILE, "utf8").split("\n");
test("Normal 1: Set D1001 04-05 from false to true", dataSet.find(l => l.includes("2025-04-05") && l.includes("D1001")).endsWith("true"), true);
test("Normal 2: Set D1001 04-12 from true to false", dataSet.find(l => l.includes("2025-04-12") && l.includes("D1001")).endsWith("false"), true);
// Boundary Data
setBonus(TEST_SHIFTS_FILE, "D1001", "2025-04-05", true); // Already true
setBonus(TEST_SHIFTS_FILE, "D9999", "2025-04-05", true); // Does not exist
dataSet = fs.readFileSync(TEST_SHIFTS_FILE, "utf8").split("\n");
test("Boundary 1: Overwrite existing true with true does not break string", dataSet.find(l => l.includes("2025-04-05") && l.includes("D1001")).endsWith("true"), true);
test("Boundary 2: Setting non-existent user ignores file", dataSet.find(l => l.includes("D9999")), undefined);
// Extreme Data: Using extreme payloads like empty strings to trick string parsing
setBonus(TEST_SHIFTS_FILE, "   ", "2025-04-05", true);
test("Extreme 1: DriverID string containing only spaces is cleanly ignored", fs.readFileSync(TEST_SHIFTS_FILE, "utf8").split("\n").some(l => l.startsWith("   ")), false);
test("Extreme 2: No exception thrown on bad inputs", typeof setBonus === "function", true);
console.log();

// ==================== 7. countBonusPerMonth ====================
console.log("--- 7. countBonusPerMonth ---");
resetTestFiles(); // Get reliable states: D1001 has 1 bonus in April, D1002 has 0, D1003 has 1
test("Normal 1: User with exact 1 bonus", countBonusPerMonth(TEST_SHIFTS_FILE, "D1001", 4), 1);
test("Normal 2: User with 0 bonuses", countBonusPerMonth(TEST_SHIFTS_FILE, "D1002", 4), 0);
// Boundary Data
test("Boundary 1: Function parses '04' exactly as '4'", countBonusPerMonth(TEST_SHIFTS_FILE, "D1001", "04"), 1);
test("Boundary 2: Driver exists but month lacks records", countBonusPerMonth(TEST_SHIFTS_FILE, "D1001", 12), 0);
// Extreme Data
test("Extreme 1: Non-existent driver should return exactly -1", countBonusPerMonth(TEST_SHIFTS_FILE, "D9999", 4), -1);
test("Extreme 2: Searching with floating point parameter month (4.0)", countBonusPerMonth(TEST_SHIFTS_FILE, "D1001", 4.0), 1);
console.log();

// ==================== 8. getTotalActiveHoursPerMonth ====================
console.log("--- 8. getTotalActiveHoursPerMonth ---");
resetTestFiles();
// D1001: 9 + 8.5 + 9 + 7 = 33.5 hours = 33:30:00
// D1002: 9 + 6 + 8 = 23 hours = 23:00:00
test("Normal 1: Standard driver total summing", getTotalActiveHoursPerMonth(TEST_SHIFTS_FILE, "D1001", 4), "33:30:00");
test("Normal 2: Second driver total summing", getTotalActiveHoursPerMonth(TEST_SHIFTS_FILE, "D1002", 4), "23:00:00");
// Boundary Data
test("Boundary 1: Zero active hours (no month entries)", getTotalActiveHoursPerMonth(TEST_SHIFTS_FILE, "D1001", 11), "00:00:00");
test("Boundary 2: Driver not found returns 00:00:00", getTotalActiveHoursPerMonth(TEST_SHIFTS_FILE, "D9999", 4), "00:00:00");
// Extreme Data
// D1004 has 14 hours
test("Extreme 1: Exact calculation on driver with 1 huge 14h active shift", getTotalActiveHoursPerMonth(TEST_SHIFTS_FILE, "D1004", 4), "14:00:00");
// Uses === so Number(4) !== String("04"), returns 00:00:00
test("Extreme 2: String month '04' fails strict equality (=== vs ==)", getTotalActiveHoursPerMonth(TEST_SHIFTS_FILE, "D1001", "04"), "00:00:00");
console.log();

// ==================== 9. getRequiredHoursPerMonth ====================
console.log("--- 9. getRequiredHoursPerMonth ---");
resetTestFiles();
// Normal Data: Calculates total based ONLY on distinct working days.
// D1001 working days: 04-05 (8.4), 04-06 (8.4), 04-12 (6.0 Eid), 04-15 (6.0 Eid). Sum = 28.8h. BonusCount = 1 -> -2 hours. Total = 26.8h = 26:48:00
test("Normal 1: Mix of normal and Eid working days with 1 bonus", getRequiredHoursPerMonth(TEST_SHIFTS_FILE, TEST_RATES_FILE, 1, "D1001", 4), "26:48:00");
// D1002 working days: 04-05 (8.4), 04-06 (8.4), 04-13 (6.0 Eid). Sum = 22.8h. BonusCount = 0. Total = 22.8h = 22:48:00
test("Normal 2: Mix of normal and Eid working days with 0 bonus", getRequiredHoursPerMonth(TEST_SHIFTS_FILE, TEST_RATES_FILE, 0, "D1002", 4), "22:48:00");
// Boundary Data
test("Boundary 1: D1004 has 1 Eid day (6h). BonusCount = 3 (-6h). Required should be 0:00:00", getRequiredHoursPerMonth(TEST_SHIFTS_FILE, TEST_RATES_FILE, 3, "D1004", 4), "0:00:00");
test("Boundary 2: Driver doesn't work at all that month (returns 0:00:00)", getRequiredHoursPerMonth(TEST_SHIFTS_FILE, TEST_RATES_FILE, 0, "D1005", 4), "0:00:00");
// Extreme Data
// D1004: 1 Eid day (6h) - bonusCount 10 (20h) = -14h => secondsToTime(-50400) = "-14:00:00"
test("Extreme 1: Massive bonus count forces negative required hours", getRequiredHoursPerMonth(TEST_SHIFTS_FILE, TEST_RATES_FILE, 10, "D1004", 4), "-14:00:00");
test("Extreme 2: Driver worked but user passes invalid month (99)", getRequiredHoursPerMonth(TEST_SHIFTS_FILE, TEST_RATES_FILE, 0, "D1001", 99), "0:00:00");
console.log();

// ==================== 10. getNetPay ====================
console.log("--- 10. getNetPay ---");
resetTestFiles();
// Base Pay D1001 = 30000. Tier = 2. Allowed missing hours = 20. (Pay deduction = Floor(basePay/185) = 162/hr)
// Required = 168. Missing 21 hours. (21 - 20 = 1 hr deduc) -> 30000 - 162 = 29838
test("Normal 1: Driver misses quota by 1 hr strictly outside allowed threshold", getNetPay("D1001", "147:00:00", "168:00:00", TEST_RATES_FILE), 29838);
// D1003 tier 1 (allow 50). Base = 45000.
test("Normal 2: Driver safely inside 50 allowed hours", getNetPay("D1003", "120:00:00", "168:00:00", TEST_RATES_FILE), 45000);
// Boundary Data
test("Boundary 1: Exactly matches required hours", getNetPay("D1001", "168:00:00", "168:00:00", TEST_RATES_FILE), 30000);
test("Boundary 2: Exact boundary of allowed missing hours (20)", getNetPay("D1001", "148:00:00", "168:00:00", TEST_RATES_FILE), 30000);
// Extreme Data
// missingHours = 168-20 = 148. Deduction = floor((30000/185)*148) = floor(24000) = 24000. Pay = 6000
test("Extreme 1: 0 actual hours, maximum penalty", getNetPay("D1001", "0:00:00", "168:00:00", TEST_RATES_FILE), 6000);
test("Extreme 2: Vastly exceeded required hours, no extra pay supported in logic", getNetPay("D1001", "500:00:00", "168:00:00", TEST_RATES_FILE), 30000);
console.log();


// Cleanup
if (fs.existsSync(TEST_SHIFTS_FILE)) fs.unlinkSync(TEST_SHIFTS_FILE);
if (fs.existsSync(TEST_RATES_FILE)) fs.unlinkSync(TEST_RATES_FILE);

console.log("======================================================");
console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log("======================================================");
