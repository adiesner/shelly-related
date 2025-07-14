// Set an influxDb endpoint for monitoring the washing machine (example: http://sample.host/write?db=monitoring )
let influxDbEndpoint = "";
// specify a custom name for your shelly (only used for influxdb)
let shellyName = "";
// set to true if you want to debug the script
let debug = false;

// Pushover settings for notification when washing is done
let pushoverMessage = "Washing machine is done";
let pushoverToken = "<secretToken>";
let pushoverUser = "<userid>";
let pushoverUrl = "https://api.pushover.net/1/messages.json";
let pushoverDevice = "Xiaomi_11T";

// Internal state to track if the washing machine is currently active
let isCurrentlyActive = false;

function updateInfluxDb(data) {
    if (influxDbEndpoint !== "") {
        let body = "shellyplug,device=" + shellyName + " byMinute=" + data.delta.aenergy.by_minute[0] + ",total=" + data.delta.aenergy.total;
        if (debug) print("Updating influxdb...");
        // add ssl_ca: "*" if you have troubles
        Shelly.call("HTTP.POST", {
            url: influxDbEndpoint,
            timeout: 5,
            body: body,
            content_type: "application/text"
        }, null, null);
    }
}

function notifyFinishedWashing() {
    let payload = {
        token: pushoverToken,
        user: pushoverUser,
        message: pushoverMessage,
        device: pushoverDevice
    }
    Shelly.call("HTTP.POST", {
        url: pushoverUrl,
        timeout: 5,
        body: payload,
        content_type: "application/json"
    }, null, null);
}

function statusHandler(event, user_data) {
    if (typeof event.delta.aenergy !== "undefined") {
        let isThreeMinOff = event.delta.aenergy.by_minute[0] == 0 && event.delta.aenergy.by_minute[1] == 0 && event.delta.aenergy.by_minute[2] == 0;
        let isThreeMinOn = event.delta.aenergy.by_minute[0] > 0 && event.delta.aenergy.by_minute[1] > 0 && event.delta.aenergy.by_minute[2] > 0;
        if (isCurrentlyActive && isThreeMinOff) {
            if (debug) print("Changed from active to inactive...");
            isCurrentlyActive = false
            notifyFinishedWashing();
        } else if (!isCurrentlyActive && isThreeMinOn) {
            if (debug) print("Changed from inactive to active...");
            isCurrentlyActive = true
        }
        updateInfluxDb(event);
    }
}

if (shellyName === "") {
    shellyName = Shelly.getDeviceInfo().id;
}

Shelly.addStatusHandler(statusHandler, null);