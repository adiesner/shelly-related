// This script calls an LG RESU10H BMS Stats Endpoint which returns the percentage level
// how full the PV battery is (in html form).
// If the battery level is above 50% the LED ring will be green,
// if it is between 15% and 50% it will be blue and if it is below 15% it will be red.
// The brightness of the LED ring will be at maximum when the battery level is at 0% and linearly fade to minimum
// brightness at 15%, then linearly fade back to maximum brightness at 100%.
//
// This is used as an indicator if it is a good time to start the washing machine or not.
//
// You need to disable Matter on the shelly to have enough memory for the script to run.
//

// set to true if you want to debug the script
const debug = false;

const MAX_COLOR_VALUE = 100;
const LED_MAX_BRIGHTNESS = 100;
const LED_MIN_BRIGHTNESS = 20;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// LG RESU10H BMS Stats Endpoint
let batteryStatsEndpoint = "http://192.168.1.76/getbmsdata";


function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getLedColorForPercent(percent) {
    let numericPercent = Number(percent);
    if (isNaN(numericPercent)) {
        return null;
    }

    numericPercent = clamp(numericPercent, 0, 100);

    if (numericPercent > 50) {
        return { red: 0, green: MAX_COLOR_VALUE, blue: 0 };
    } else if ((numericPercent > 15) && (numericPercent <= 50)) {
        return {red: 0, green: 0 , blue: MAX_COLOR_VALUE};
    } else {
        return { red: MAX_COLOR_VALUE, green: 0, blue: 0 };
    }
}

function getBrightness(percent) {
    let numericPercent = Number(percent);
    if (isNaN(numericPercent) || (numericPercent < 0)) {
        return LED_MAX_BRIGHTNESS;
    }

    numericPercent = clamp(numericPercent, 0, 100);

    if (numericPercent === 0) {
        return LED_MAX_BRIGHTNESS;
    } else if (numericPercent <= 15) {
        // Linearly fade from max at 0% to min at 15%.
        let t = numericPercent / 15;
        return Math.round(LED_MAX_BRIGHTNESS - t * (LED_MAX_BRIGHTNESS - LED_MIN_BRIGHTNESS));
    } else if (numericPercent > 15) {
        let t = (numericPercent - 15) / 85;
        return Math.round(LED_MIN_BRIGHTNESS + t * (LED_MAX_BRIGHTNESS - LED_MIN_BRIGHTNESS));
    }
}

function setBatteryIndicator(percent) {
    let color = getLedColorForPercent(percent);
    if (color === null) {
        if (debug) print("Ignoring invalid battery percentage: " + JSON.stringify(percent));
        return false;
    }

    let brightness = getBrightness(percent);
    if (debug) print("Setting LED ring for " + percent + "% to rgb(" + color.red + ", " + color.green + ", " + color.blue + ") : Brightness: " + brightness);

    let payload = {
        id: 0,
        config: {
            leds: {
                mode: "switch",
                colors: {
                    "switch:0": {
                        on: {
                            rgb: [color.red, color.green, color.blue],
                            brightness: brightness
                        },
                        off: {
                            rgb: [0, 0, 0],
                            brightness: 0
                        }
                    }
                }
            }
        }
    };

    if (debug) print("LED payload: " + JSON.stringify({ method: "PLUGS_UI.SetConfig", params: payload }));

    Shelly.call("PLUGS_UI.SetConfig", payload, function (result, error_code, error_message) {
        if (debug && error_code !== 0) {
            print("Failed to update LED ring: [" + error_code + "] " + error_message + " payload=" + JSON.stringify({ method: "PLUGS_UI.SetConfig", params: payload }));
        }
    }, null);

    return true;
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

function batteryStatsHandler(result, error_code, error_message, user_data) {
    // result can be null on timeout or transport errors
    if (result === null || result === undefined) {
        if (debug) print("Request failed" + (error_message ? (": " + error_message) : ""));
        return;
    }

    if (result.code === 200) {
        let battery = parseBatteryStatsResponse(result.body);
        setBatteryIndicator(battery);
    } else {
        if (debug) print("Request failed with code " + result.code);
        setBatteryIndicator(0);
    }
}

function pollBatteryStats() {
    Shelly.call("HTTP.GET", {
        url: batteryStatsEndpoint,
        timeout: 5
    }, batteryStatsHandler, null);
}

// Run once on startup, then every 5 minutes.
pollBatteryStats();
Timer.set(POLL_INTERVAL_MS, true, pollBatteryStats, null);

// Test code to set the battery indicator to 42%:
// setBatteryIndicator(42);
