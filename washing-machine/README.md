# Get notified when washing machine is done

The script notify-wash-done.js can be executed on a Shelly Plug S. It will monitor the power usage of the attached device
and send a notification once the device doesn't use any power anymore (over 3 minutes). I use it to get a notification on my phone once
the washing machine is done. The notification is implemented via [Pushover](https://pushover.net/). 

- [Link to Shelly Script](./notify-wash-done.js)

This is how a notification looks like on the phone:
![Screenshot from Pushover App on Android](notification.jpg "Notification")

## Monitoring

If you have Grafana and InfluxDb already setup you only need to set the influxdb connection in the script and the
power usage of the washing machine will be reported to InfluxDb. You can then use Grafana to visualize the power usage over time.

![Screenshot Grafana](monitoring.png "Monitoring")


## PV Battery indicator

Running the washing machine is cheaper when enough PV power is available. 
The script battery-indicator.js monitors the battery level by calling the stats endpoint of 
my LG RESU10H BMS battery. It uses the LED ring to indicate the battery level.

A green ring means more than 50% battery level is available, a blue ring means 
between 15 and 50% battery level and a red ring is bellow 15% battery level. 
This way I can easily check if it is a good time to start the washing machine or 
if I should wait until more PV power is available.

- [Link to Shelly Script](./battery-indicator.js)
