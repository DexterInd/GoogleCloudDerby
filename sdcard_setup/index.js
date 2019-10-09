const WIFI_SSID = 'cloudderby'
const WIFI_PSK = 'googlecloud'

const PI_USER = 'pi'
const PI_SSH_PASS = 'robots1234'
const GATEWAY_IP = '192.168.0.1'

//A shared link looks like this 'https://drive.google.com/open?id=1rxAt9N_Yr5rzQdnCo4itBv-zfZ8hPmLl'
// Replace the ID in the following link with the ID from the shared link
const TEST_SCRIPT_URL = 'https://docs.google.com/uc?export=download&id=1rxAt9N_Yr5rzQdnCo4itBv-zfZ8hPmLl';

var CloudDerbySetup = function() {
  var async = require('async')
  const fs = require('fs');
  var prompt = require('./prompt.js')
  var dhcpUtil = require('./dhcpcdUtils.js')
  var exec = require('ssh-exec')

  var stdin = process.stdin

  var self = this
  this.drivePath = ""

  this.run = function() {
    var tasks = []

    if(process.platform == 'darwin') {
      tasks.push(discoverMacDrive)
    }
    else if(process.platform == 'win32') {
      tasks.push(discoverWinDrive)
      tasks.push(confirmDrive)
    }
    else {
      console.log("This script can only be ran from Windows or Mac.")
      process.exit()
    }

    tasks = tasks.concat(
      [
        promptCarNumber,
        writeHostName,
        promptForStaticIP,
        createWPASupplicant,
        promptInstructions,
        enableFileExpansion,
        reboot,
        runTestScript
      ]
    )

    async.waterfall(tasks, waterfallFinished)
  }

  this.runTests = function(){
    async.waterfall([
      fetchTestScript,
      runTestScript
    ], waterfallFinished)
  }

  function waterfallFinished(err, success) {
    if(err) {
      console.log(err)
      return
    }
    console.log("Success!")
  }

  function discoverMacDrive(callback) {
    if(fs.existsSync('/Volumes/boot')) {
      self.drivePath = '/Volumes/boot'
      prompt.forAnyKey('Found the SD card at /Volumes/boot. Press any key to continue.', callback)
    }
    else {
      callback('Unable to locate the SD card.')
    }
  }

  function discoverWinDrive(callback) {
    console.log("Looking for the SD card drive....")
    var driveDiscover = `wmic logicaldisk where volumename="boot" get name, volumename\n`
    var stdout = '';
    var spawn = require('child_process').spawn,
            list  = spawn('cmd');

    list.stdout.on('data', function (data) {
        stdout += data;
    });

    list.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    list.on('exit', function (code) {
        if (code == 0) {
          var data = stdout.split('\r\n');
          data = data.splice(4,data.length - 7);
          data = data.map(Function.prototype.call, String.prototype.trim);
          //TODO: Handle multiple SD cards
          callback(null, data);
        } else {
          var err = 'child process exited with code ' + code;
          callback(err);
        }
    });

    list.stdin.write(driveDiscover);
    list.stdin.end();
  }

  function confirmDrive(driveData, callback) {
    if(driveData.length < 1) {
      callback('Unable to locate the SDCard')
      return
    }

    //Should match ie "D:     boot"
    if(!driveData[0].match(/([A-Z]):\s*boot+/g)){
      callback('Unable to locate the SDCard')
      return
    }

    //"D:     boot" -> "D:"
    var drive = driveData[0].split(/\s+/g)[0]

    prompt.yesOrNo(`Found drive ${drive} Is this correct? `, true, function(result) {
      if(!result){
        prompt.forResponse("What is the drive letter of the SD Card? (ie: 'D') ", function(val){
          var val = val.replace(/[^A-Za-z]/g, '').replace(':', "");
          if(!val){
            callback("Invalid drive was specified. Aborting.")
            return
          }
          self.drivePath = val+":"
          callback(null)
        })
      }
      else{
        self.drivePath = drive
        callback(null)
      }
    })
  }

  function promptCarNumber(callback) {
    prompt.forResponse("What is the car number? : ", function(carNumber){
      carNumber = parseInt(carNumber)
      if(!carNumber){
        callback("Invalid car number.")
        return
      }
      self.carNumber = carNumber
      callback(null)
    })
  }

  function writeHostName(callback) {
    var hostname = "car"+self.carNumber
    console.log(`Writing hostname to ${hostname}...`)
    fs.writeFile(self.drivePath+'/hostname', hostname, 'ascii', callback);
  }

  function createWPASupplicant(callback) {
    var wpaSupplicant =
`ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
        ssid="${WIFI_SSID}"
        psk="${WIFI_PSK}"
        key_mgmt=WPA-PSK
}`
    console.log(`Writing wpa_supplicant for ${WIFI_SSID} SSID...`)
    fs.writeFile(self.drivePath+'/network/wpa_supplicant.conf', wpaSupplicant, 'ascii', callback);
  }

  function promptInstructions(callback) {
    var message =
`\n\n1. Put SD card into car and power up the robot.\n
2. It should reboot a few times. Wait for power led on the Red Board to be stable. Don’t despair.\n
3. Wait for the antenna LED to turn white/purple (if it turns red, abort and investigate network issues).\n\n
Press any key when the antenna LED is lit or ctrl+c to abort.
`
    prompt.forAnyKey(message, callback)
  }

  function pingHostName(callback) {
    console.log(`Attempting to locate the current IP of car #${self.carNumber}...`)
    const dns = require('dns')
    dns.lookup(`car${self.carNumber}.local`, function(err, result) {
      if(err){
        callback(err)
      }
      else{
        if(!result){
          callback(`Unable to find the IP for ${seld.carNumber}`)
          return
        }
        self.carIpAddress = result
        console.log(`Found the car's IP at ${self.carIpAddress}`)
        callback(null)
      }
    })
  }

  function promptForStaticIP(callback) {
    //Prompt if use DHCP or static
    prompt.yesOrNo("Do you want to assign a static IP?", true, function(result){
      if(result) {
        setStaticIP(callback)
      }
      else {
        async.waterfall([
          setDHCP,
          promptInstructions,
          reboot,
          pingHostName
        ], function(err, success){
          callback(err)
        });
      }
    });
  }

  function setDHCP(callback) {
    console.log(`Using DHCP...`)
    dhcpUtil.replaceIPConfig(self.drivePath+'/network/dhcpcd.conf', false, callback)
  }

  function setStaticIP(callback) {
    var ipParts = GATEWAY_IP.split('.')

    //Determine the new static IP
    ipParts[3] = self.carNumber
    var staticIP = ipParts.join('.')
    self.staticIP = staticIP
    self.carIpAddress = staticIP

    //Determine the gateway IP
    ipParts[3] = 1
    var gatewayIP = ipParts.join('.')

    console.log(`Setting a static IP to ${staticIP}...`)
    dhcpUtil.replaceIPConfig(self.drivePath+'/network/dhcpcd.conf', true, staticIP, gatewayIP, '8.8.8.8', callback)
  }

  function reboot(callback) {
    console.log("Rebooting to assign IP address and hostname...")
    var command = `sudo shutdown -r now`
    exec(command, {
                      user: PI_USER,
                      host: self.carIpAddress,
                      password: PI_SSH_PASS
                  }, function (err, stdout, stderr) {
                        if(err){
                          callback(err)
                          return
                        }

                        prompt.forAnyKey('Press any key when the PI has restarted. ', function(){
                          callback(err)
                        })
                    })
  }

  function fetchTestScript(callback) {

    var command = `wget --no-check-certificate '${TEST_SCRIPT_URL}' -Otest_cloud_derby.py`
    console.log('Fetching the test script...')
    exec(command, {
                      user: PI_USER,
                      host: self.staticIP,
                      password: PI_SSH_PASS
                    }, function (err, stdout, stderr) {
                        console.log(err, stdout, stderr)
                        callback(err)
                      })
  }

  function enableFileExpansion(callback) {
    console.log("Expanding the filesystem on the SD card. This takes a bit...")
    var command = `sudo raspi-config nonint do_expand_rootfs`
    exec(command, {
                      user: PI_USER,
                      host: self.staticIP,
                      password: PI_SSH_PASS
                    }, function (err, stdout, stderr) {
                        process.platform == 'darwin' ? console.log('Finished expanding filesystem.') : console.log(stdout, stderr)
                        callback(err)
                      }).pipe(process.stdout)
  }

  function runTestScript(callback) {
    prompt.forAnyKey('Press any key when you are ready to run the test script. ', function(){
      var command = `sudo python ~/test_cloud_derby.py`
      console.log('Running the test script...')
      exec(command, {
                        user: PI_USER,
                        host: self.staticIP,
                        password: PI_SSH_PASS
                      }, function (err, stdout, stderr) {
                          process.platform == 'darwin' ? console.log('Finished.') : console.log(stdout, stderr)
                          callback(err)
                        }).pipe(process.stdout)
    })
  }
}

var setup = new CloudDerbySetup()
setup.run()
