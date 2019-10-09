# GoPiGo3 Setup for Cloud Derby
A simple script to automate the setup of the GoPiGo3 for the Cloud Derby.

## Requirements
- MacOS or Windows
- Raspberry Pi 3B+
- Tested on nodejs v12.0.0

## Installation
`npm install`

## Configuration
- Update the SSID and password for WiFi at the top of index.js
- Update the URL for the test script if it has changed at the top of index.js

## Running
- Ensure the SD is freshly imaged and inserted into the computer
- run `node index.js`

## Tasks performed
- Writes hostname to carYY to the SD card where YY is the car number
- Creates a blank ssh.txt file on the SD card (Potentially optionally)
- Writes the WPA Supplicant file for configuring WiFI SSID and PSK
- Fetches initial DHCP IP address assigned
- Sets a static IP where last octet is the car number
- Sets Gateway and DNS
- Fetches the python test script
- Runs the python test script
