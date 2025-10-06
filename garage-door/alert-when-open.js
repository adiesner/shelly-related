// Pushover settings for notification when garage is still open
let pushoverMessage = "Garage is still open";
let pushoverToken = "<secretToken>";
let pushoverUser = "<userid>";
let pushoverUrl = "https://api.pushover.net/1/messages.json";
let pushoverDevice = "Xiaomi_11T";

function notify() {
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

let inputstate = Shelly.getComponentStatus("input:0").state

// inputstate is true when the door is closed
if (!inputstate) {
    notify()
}