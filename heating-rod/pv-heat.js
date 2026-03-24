// This script calls an LG RESU10H BMS Stats Endpoint which returns the percentage level
// how full the PV battery is (in html form).
// Depending on the current time and the required battery level the shelly
// will be turned on or not.
//
// Set debug to true to have debug output (will not register a timer)
let debug=false;

// LG RESU10H BMS Stats Endpoint
let batteryStatsEndpoint = "http://192.168.1.76/getbmsdata";

// Set an influxDb endpoint for monitoring the heating rod (example: http://sample.host/write?db=monitoring )
let influxDbEndpoint = "";
let shellyName = "";

// Check every 5 minute if enough power is in battery
let timerInterval = 5 * 60 * 1000;

// array(hour) -> minimumBatteryLevel  (-1 == turn heating off)
let minimalBatteryPercentagePerHour = [
    -1,-1,-1,-1,  // 0-3 hour
    -1,-1,50,50,  // 4-7 hour
    60,60,70,70,  // 8-11 hour
    70,70,70,70,  // 12-15 hour
    80,80,80,80,  // 16-19 hour
    80,80,-1,-1   // 20-23 hour
];

function switchOnOff(desiredState, user_data) {
    if (desiredState === user_data.switchedOn) {
        if (debug) print("Already ", desiredState, ", nothing to do");
        return;
    }
    if (debug) print("Needs toggle to ", desiredState);
    user_data.step = "switch";
    Shelly.call("switch.set", { id: 0, on: desiredState }, main, user_data);
}

function parseBatteryStatsResponse(input) {
    try {
        let socPos = input.indexOf('>SOC<');
        let startOfNumber = socPos + 13;
        let endOfNumber = input.indexOf('<', startOfNumber);
        let numberStr = input.slice(startOfNumber, endOfNumber);
        let number = JSON.parse(numberStr);
        return number / 100;
    } catch (e) { if (debug) print(e);}
    return 0;
}

function evaluateData(user_data) {
    if (debug) print("Evaluate data: ", JSON.stringify(user_data));
    let minimalBatLevel = minimalBatteryPercentagePerHour[user_data.hour];
    if (debug) print("Minimal Battery Level: ", minimalBatLevel, " Current: ", user_data.batteryLevel);
    if (minimalBatLevel < 0) {
        if (debug) print("Switch off due to no heating time");
        switchOnOff(false, user_data);
    } else if (minimalBatLevel >= user_data.batteryLevel) {
        if (debug) print("Switch off due to low battery");
        switchOnOff(false, user_data);
    } else if (minimalBatLevel < user_data.batteryLevel) {
        if (debug) print("Switch on due to full battery");
        switchOnOff(true, user_data);
    }
}

function updateInfluxDb(user_data) {
    if (influxDbEndpoint !== "") {
        let power = user_data.switchedOn ? 1 : 0;
        let body = "heizstab,device=" + shellyName + " battery=" + user_data.batteryLevel + ",power=" + power;
        if (debug) print("Updating influxdb...");
        Shelly.call("HTTP.POST", {
            url: influxDbEndpoint,
            timeout: 5,
            body: body,
            content_type: "application/text",
            ssl_ca: "*"
        }, null, null);
    }
}

function main(result, err_code, err_message, user_data) {
    if (debug) {
        print("In function main: " + JSON.stringify(user_data));
        print("Result: " + JSON.stringify(result));
    }

    if (user_data.step === "start") {
        user_data.time = Shelly.getComponentStatus("sys").time; // 23:59
        user_data.hour = JSON.parse(user_data.time); // 23

        user_data.step = "switchState";
        Shelly.call("switch.GetStatus", { id: 0 }, main, user_data);
    } else if (user_data.step === "switchState") {
        user_data.switchedOn = result.output;
        user_data.step = "batteryLevel";
        if (debug) print("Calling GET ", batteryStatsEndpoint);
        Shelly.call("HTTP.GET", { url: batteryStatsEndpoint, timeout: 5 }, main, user_data);
    } else if (user_data.step === "batteryLevel") {
        // result can be null on a timeout
        if (result === null || result === undefined) {
            user_data.batteryLevel = 0;
            if (debug) {
                print("Request failed");
            }
        } else {
            if (result.code === 200) {
                let battery = parseBatteryStatsResponse(result.body);
                user_data.batteryLevel = battery;
            } else if (debug) {
                print("Request failed with code ", result.code);
                user_data.batteryLevel = 0;
            }
        }
        evaluateData(user_data);
        updateInfluxDb(user_data);
    } else if (user_data.step === "switch") {
        if (debug) print("switched was toggled");
    } else {
        print("Unknown step: ", user_data.step)
    }
}

function startIt() {
    main(null, null, null, { step: "start" });
}

if (shellyName === "") {
    shellyName = Shelly.getDeviceInfo().id;
}

if (debug) {
    print("Debug is enabled - not starting timer");
    startIt();
} else {
    Timer.set(timerInterval, true, startIt, null);
}