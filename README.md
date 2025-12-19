# Shelly Automation Projects

This repository documents projects for automating household tasks using Shelly devices. Each project is located in its respective subfolder and includes scripts and instructions for setup.

---

## 1. Washing Machine Notification

**Folder:** `washing-machine`

This project uses a Shelly Plug S to monitor the power usage of a washing machine. It sends a notification to your phone via [Pushover](https://pushover.net/) when the washing machine finishes its cycle (i.e., when power usage drops to zero for over 3 minutes).

---

## 2. Garage Door Control

**Folder:** `garage-door`

This project uses a Shelly Plus 1 to control a garage door and monitor its status. It allows you to remotely open/close the garage door and notifies you if the door is left open after a certain time.

---

The projects are designed to make daily life easier by automating common household tasks. Refer to the respective subfolder's `README.md` for detailed setup instructions.



## Development

### Debugging

Connect to shelly to see debug output:
```shell
wscat --no-color --connect ws://192.168.1.78/debug/log
```