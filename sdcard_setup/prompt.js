function Prompt() {
  var stdin = process.stdin
  this.forResponse = function(message, callback) {
    if(stdin.isTTY)
    {
      stdin.setRawMode(true)
    }

    stdin.resume()
    stdin.setEncoding('utf8')

    process.stdout.write('\n'+message)
    var keyLog = []

    stdin.on('data', function keyCallback(key) {
      if (key == '\u0003') {// ctrl-c
        process.exit()
      } else if (key == '\u000D') {//Enter
        stdin.pause()
        stdin.removeListener('data', keyCallback)
        console.log('')
        if (callback) {
          var resp = keyLog.join('').toLowerCase()
          callback(resp)
        }
      } else {
        keyLog.push(key)
        process.stdout.write(key)
      }
    })
  }
  this.forAnyKey = function(message, callback) {
    if(stdin.isTTY)
    {
      stdin.setRawMode(true)
    }

    stdin.resume()
    stdin.setEncoding('utf8')

    console.log('\n'+message)
    stdin.once('data', function(key) {
      if (key == '\u0003') {
        process.exit()
      }// ctrl-c
      stdin.pause()
      if (callback) {
        callback()
      }
    })
  }
  this.yesOrNo = function(message, _default, callback) {
    if(stdin.isTTY)
    {
      stdin.setRawMode(true)
    }

    stdin.resume()
    stdin.setEncoding('utf8')

    message = '\n'+ message + ( _default ? ' [yes]: ' : ' [no]: ')
    process.stdout.write(message)
    var keyLog = []
    stdin.on('data', function keyCallback(key) {
      if (key == '\u0003') {// ctrl-c
        process.exit()
      } else if (key == '\u000D') {
        stdin.pause()
        stdin.removeListener('data', keyCallback)
        console.log('')
        if (keyLog.length === 0) {
          if (callback) {
            callback(_default)
          }
        } else if (callback) {
          var resp = keyLog.join('').toLowerCase()
          if (resp === 'yes' || resp == 'y') {
            callback(true)
          } else if (resp === 'no' || resp == 'n') {
            callback(false)
          } else {
            callback(false)
          }
        }
      } else if (key === ' ') {
        if (keyLog.length === 0) {
          stdin.pause()
          stdin.removeListener('data', keyCallback)
          console.log('')
          if (callback) {
            callback(_default)
          }
        } else {
          process.stdout.write(key)
        }
      } else {
        keyLog.push(key)
        process.stdout.write(key)
      }
    })
  }
}

module.exports = new Prompt()
