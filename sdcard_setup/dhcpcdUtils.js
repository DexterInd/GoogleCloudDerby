function DCHPUtilities(){
  const fs = require('fs')
  var self = this;
  this.stripIPConfig = function(path, callback){
    var interfaceFound = false
    var cloudDerbyComments = false
    //Read file
    fs.readFile(path, 'ascii', function(err, data){
      if(err){
        callback(err)
        return
      }
      var lines = data.split('\n');

      for(var i = 0; i < lines.length; i++){
        if(lines[i].includes('interface wlan0')){
          interfaceFound = true
          lines.splice(i, 1);
          i--;
        }
        else if(lines[i].startsWith('interface')){
          interfaceFound = false
        }
        else if((lines[i].startsWith("noipv6") || lines[i].startsWith("static")) && interfaceFound){
          lines.splice(i, 1);
          i--;
        }
        else if(lines[i].startsWith('# CLOUD DERBY:')){
          cloudDerbyComments = true;
          lines.splice(i, 1);
          i--;
        }
        else if(cloudDerbyComments && lines[i].startsWith('#')){
          lines.splice(i, 1);
          i--;
        }
        else if(cloudDerbyComments) {
          cloudDerbyComments = false
        }
      }

      callback(null, lines.join('\n'))
    });
  }

  this.replaceIPConfig = function(path, staticIPEnabled, ip, gateway, dns, callback){
    self.stripIPConfig(path, function(err, data){
      if(err){
        callback(err)
        return
      }

      if(!staticIPEnabled && !callback){
        callback = ip
      }

      self.writeIPConfig(path, staticIPEnabled, data, ip, gateway, dns, callback);
    })
  }

  this.writeIPConfig = function(path, staticIPEnabled, config, ip, gateway, dns, callback){

    if(!staticIPEnabled && !callback){
      callback = ip
    }

    var dhcpcdConfig = ''

    if(staticIPEnabled){
      dhcpcdConfig = [
        '#Begin IP Configuration',
        '#Using DHCP, uncomment the following lines to set a static IP.',
        `interface wlan0`,
        `noipv6`,
        `static ip_address=${ip}/24`,
        `static routers=${gateway}`,
        `static domain_name_servers=${dns}`,
        '# End IP Configuration'
      ].join('\n')
    }
    else {
      dhcpcdConfig = [
        '#Begin IP Configuration',
        '#Using DHCP, uncomment the following lines to set a static IP.',
        `#interface wlan0`,
        `#noipv6`,
        `#static ip_address=192.168.0.88/24`,
        `#static routers=192.168.0.1`,
        '#static domain_name_servers=8.8.8.8',
        '# End IP Configuration\n'
      ].join('\n')

    }


    //Append the static IP information to the config
    data = dhcpcdConfig + config
    fs.writeFile(path, data, 'ascii', callback);
  }
}

module.exports = new DCHPUtilities()




// dhcpUtil.replaceIPConfig('D:/network/dhcpcd.conf', true, '192.168.0.30', '192.168.0.1', '8.8.8.8', function(err, val){
//   console.log(err, val)
// })

// dhcpUtil.replaceIPConfig('D:/network/dhcpcd.conf', false, function(err, val){
//   console.log(err, val)
// })


// dhcpUtil.stripIPConfig('D:/network/dhcpcd.conf', function(err, val){
//   console.log(err, val)
// })
