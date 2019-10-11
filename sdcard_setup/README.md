# GoPiGo3 Setup for Cloud Derby
A simple script to automate the setup of the GoPiGo3 for the Cloud Derby.

## Requirements
- MacOS or Windows
- Raspberry Pi 3B+ or 3B
- Tested on nodejs v12.0.0

## Installation
`npm install`

## Configuration
- Update the SSID and password for WiFi at the top of index.js
- Update the URL for the test script if it has changed at the top of index.js

## Running
- Ensure the SD is freshly imaged and inserted into the computer
- run `node index.js`

## Building Binaries
It is possible to generate executables for the supported platforms in order to eliminate the requirement for the user to have node.js installed.

- `npm install -g pkg`
- `npm run package`

## Tasks performed
- Writes hostname to carYY to the SD card where YY is the car number
- Writes the WPA Supplicant file for configuring WiFI SSID and PSK
- Optionally configures a static IP with the last octet being the car number
- Optionally configures DHCP and fetches the IP address based on hostname
- Runs the python test script
