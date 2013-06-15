var util = require('util'),
  stream = require('stream'),
  child = require('child_process');

var detectPitch = require("detect-pitch");

util.inherits(Driver,stream);
util.inherits(Device,stream);

function Driver(opts,app) {
  var self = this;

  app.on('client::up',function(){
    self.emit('register', new Device(app));
  });

}

Buffer.prototype.toByteArray = function () {
  return Array.prototype.slice.call(this, 0);
};

function Device(app) {
  var self = this;

  this._app = app;
  this.writeable = false;
  this.readable = false;
  this.V = 0;
  this.D = 14;
  this.G = 'Pitch';
  this.name = 'Pitch - ' + require('os').hostname();

  var proc = child.spawn('rec', '-c 2 -r 44.1k -t raw -'.split(' '));

  var last = 0, number = 0;

  proc.stdout.on('data', function(data) {

    var arr = data.toByteArray();

    var signal = new Float32Array(arr.length);

    // This is ugly. Fix me
    var x = [];
    arr.forEach(function(a, i) {
      signal[i] = a;
    });
    var pitch = detectPitch(signal, {
      threshold: 0.2,
      start_bin: 10
    });
    if (pitch < 100 && pitch > 0) {
      if (Math.abs(last - pitch) < 3) {
        number++;
      } else {
        last = pitch;
        number = 0;
      }
    }

    if (number > 10) {
      self.emit('data', pitch);
      number = 0;
    }

  });
  proc.stderr.on('data', function(data) {
    //console.log('error>', data.toString());
  });

}

module.exports = Driver;
