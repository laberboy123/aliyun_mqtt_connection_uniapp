if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  function commonjsRequire(path) {
    throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
  }
  var mqtt$1 = { exports: {} };
  (function(module, exports) {
    (function(f) {
      {
        module.exports = f();
      }
    })(function() {
      return (/* @__PURE__ */ function() {
        function r(e, n, t) {
          function o(i2, f) {
            if (!n[i2]) {
              if (!e[i2]) {
                var c = "function" == typeof commonjsRequire && commonjsRequire;
                if (!f && c)
                  return c(i2, true);
                if (u)
                  return u(i2, true);
                var a = new Error("Cannot find module '" + i2 + "'");
                throw a.code = "MODULE_NOT_FOUND", a;
              }
              var p = n[i2] = { exports: {} };
              e[i2][0].call(p.exports, function(r2) {
                var n2 = e[i2][1][r2];
                return o(n2 || r2);
              }, p, p.exports, r, e, n, t);
            }
            return n[i2].exports;
          }
          for (var u = "function" == typeof commonjsRequire && commonjsRequire, i = 0; i < t.length; i++)
            o(t[i]);
          return o;
        }
        return r;
      }())({ 1: [function(require2, module3, exports3) {
        (function(process, global2) {
          var events = require2("events");
          var Store = require2("./store");
          var mqttPacket = require2("mqtt-packet");
          var Writable = require2("readable-stream").Writable;
          var inherits = require2("inherits");
          var reInterval = require2("reinterval");
          var validations = require2("./validations");
          var xtend = require2("xtend");
          var setImmediate = global2.setImmediate || function(callback) {
            process.nextTick(callback);
          };
          var defaultConnectOptions = {
            keepalive: 60,
            reschedulePings: true,
            protocolId: "MQTT",
            protocolVersion: 4,
            reconnectPeriod: 1e3,
            connectTimeout: 30 * 1e3,
            clean: true,
            resubscribe: true
          };
          var errors = {
            0: "",
            1: "Unacceptable protocol version",
            2: "Identifier rejected",
            3: "Server unavailable",
            4: "Bad username or password",
            5: "Not authorized",
            16: "No matching subscribers",
            17: "No subscription existed",
            128: "Unspecified error",
            129: "Malformed Packet",
            130: "Protocol Error",
            131: "Implementation specific error",
            132: "Unsupported Protocol Version",
            133: "Client Identifier not valid",
            134: "Bad User Name or Password",
            135: "Not authorized",
            136: "Server unavailable",
            137: "Server busy",
            138: "Banned",
            139: "Server shutting down",
            140: "Bad authentication method",
            141: "Keep Alive timeout",
            142: "Session taken over",
            143: "Topic Filter invalid",
            144: "Topic Name invalid",
            145: "Packet identifier in use",
            146: "Packet Identifier not found",
            147: "Receive Maximum exceeded",
            148: "Topic Alias invalid",
            149: "Packet too large",
            150: "Message rate too high",
            151: "Quota exceeded",
            152: "Administrative action",
            153: "Payload format invalid",
            154: "Retain not supported",
            155: "QoS not supported",
            156: "Use another server",
            157: "Server moved",
            158: "Shared Subscriptions not supported",
            159: "Connection rate exceeded",
            160: "Maximum connect time",
            161: "Subscription Identifiers not supported",
            162: "Wildcard Subscriptions not supported"
          };
          function defaultId() {
            return "mqttjs_" + Math.random().toString(16).substr(2, 8);
          }
          function sendPacket(client, packet, cb) {
            client.emit("packetsend", packet);
            var result = mqttPacket.writeToStream(packet, client.stream, client.options);
            if (!result && cb) {
              client.stream.once("drain", cb);
            } else if (cb) {
              cb();
            }
          }
          function flush(queue) {
            if (queue) {
              Object.keys(queue).forEach(function(messageId) {
                if (typeof queue[messageId].cb === "function") {
                  queue[messageId].cb(new Error("Connection closed"));
                  delete queue[messageId];
                }
              });
            }
          }
          function flushVolatile(queue) {
            if (queue) {
              Object.keys(queue).forEach(function(messageId) {
                if (queue[messageId].volatile && typeof queue[messageId].cb === "function") {
                  queue[messageId].cb(new Error("Connection closed"));
                  delete queue[messageId];
                }
              });
            }
          }
          function storeAndSend(client, packet, cb, cbStorePut) {
            client.outgoingStore.put(packet, function storedPacket(err) {
              if (err) {
                return cb && cb(err);
              }
              cbStorePut();
              sendPacket(client, packet, cb);
            });
          }
          function nop() {
          }
          function MqttClient(streamBuilder, options) {
            var k;
            var that = this;
            if (!(this instanceof MqttClient)) {
              return new MqttClient(streamBuilder, options);
            }
            this.options = options || {};
            for (k in defaultConnectOptions) {
              if (typeof this.options[k] === "undefined") {
                this.options[k] = defaultConnectOptions[k];
              } else {
                this.options[k] = options[k];
              }
            }
            this.options.clientId = typeof options.clientId === "string" ? options.clientId : defaultId();
            this.options.customHandleAcks = options.protocolVersion === 5 && options.customHandleAcks ? options.customHandleAcks : function() {
              arguments[3](0);
            };
            this.streamBuilder = streamBuilder;
            this.outgoingStore = options.outgoingStore || new Store();
            this.incomingStore = options.incomingStore || new Store();
            this.queueQoSZero = options.queueQoSZero === void 0 ? true : options.queueQoSZero;
            this._resubscribeTopics = {};
            this.messageIdToTopic = {};
            this.pingTimer = null;
            this.connected = false;
            this.disconnecting = false;
            this.queue = [];
            this.connackTimer = null;
            this.reconnectTimer = null;
            this._storeProcessing = false;
            this._packetIdsDuringStoreProcessing = {};
            this.nextId = Math.max(1, Math.floor(Math.random() * 65535));
            this.outgoing = {};
            this._firstConnection = true;
            this.on("close", function() {
              this.connected = false;
              clearTimeout(this.connackTimer);
            });
            this.on("connect", function() {
              var queue = this.queue;
              function deliver() {
                var entry = queue.shift();
                var packet = null;
                if (!entry) {
                  return;
                }
                packet = entry.packet;
                that._sendPacket(
                  packet,
                  function(err) {
                    if (entry.cb) {
                      entry.cb(err);
                    }
                    deliver();
                  }
                );
              }
              deliver();
            });
            this.on("close", function() {
              if (that.pingTimer !== null) {
                that.pingTimer.clear();
                that.pingTimer = null;
              }
            });
            this.on("close", this._setupReconnect);
            events.EventEmitter.call(this);
            this._setupStream();
          }
          inherits(MqttClient, events.EventEmitter);
          MqttClient.prototype._setupStream = function() {
            var connectPacket;
            var that = this;
            var writable = new Writable();
            var parser = mqttPacket.parser(this.options);
            var completeParse = null;
            var packets = [];
            this._clearReconnect();
            this.stream = this.streamBuilder(this);
            parser.on("packet", function(packet) {
              packets.push(packet);
            });
            function nextTickWork() {
              if (packets.length) {
                process.nextTick(work);
              } else {
                var done = completeParse;
                completeParse = null;
                done();
              }
            }
            function work() {
              var packet = packets.shift();
              if (packet) {
                that._handlePacket(packet, nextTickWork);
              } else {
                var done = completeParse;
                completeParse = null;
                if (done)
                  done();
              }
            }
            writable._write = function(buf, enc, done) {
              completeParse = done;
              parser.parse(buf);
              work();
            };
            this.stream.pipe(writable);
            this.stream.on("error", nop);
            this.stream.on("close", function() {
              flushVolatile(that.outgoing);
              that.emit("close");
            });
            connectPacket = Object.create(this.options);
            connectPacket.cmd = "connect";
            sendPacket(this, connectPacket);
            parser.on("error", this.emit.bind(this, "error"));
            if (this.options.properties) {
              if (!this.options.properties.authenticationMethod && this.options.properties.authenticationData) {
                this.emit("error", new Error("Packet has no Authentication Method"));
                return this;
              }
              if (this.options.properties.authenticationMethod && this.options.authPacket && typeof this.options.authPacket === "object") {
                var authPacket = xtend({ cmd: "auth", reasonCode: 0 }, this.options.authPacket);
                sendPacket(this, authPacket);
              }
            }
            this.stream.setMaxListeners(1e3);
            clearTimeout(this.connackTimer);
            this.connackTimer = setTimeout(function() {
              that._cleanUp(true);
            }, this.options.connectTimeout);
          };
          MqttClient.prototype._handlePacket = function(packet, done) {
            var options = this.options;
            if (options.protocolVersion === 5 && options.properties && options.properties.maximumPacketSize && options.properties.maximumPacketSize < packet.length) {
              this.emit("error", new Error("exceeding packets size " + packet.cmd));
              this.end({ reasonCode: 149, properties: { reasonString: "Maximum packet size was exceeded" } });
              return this;
            }
            this.emit("packetreceive", packet);
            switch (packet.cmd) {
              case "publish":
                this._handlePublish(packet, done);
                break;
              case "puback":
              case "pubrec":
              case "pubcomp":
              case "suback":
              case "unsuback":
                this._handleAck(packet);
                done();
                break;
              case "pubrel":
                this._handlePubrel(packet, done);
                break;
              case "connack":
                this._handleConnack(packet);
                done();
                break;
              case "pingresp":
                this._handlePingresp(packet);
                done();
                break;
              case "disconnect":
                this._handleDisconnect(packet);
                done();
                break;
            }
          };
          MqttClient.prototype._checkDisconnecting = function(callback) {
            if (this.disconnecting) {
              if (callback) {
                callback(new Error("client disconnecting"));
              } else {
                this.emit("error", new Error("client disconnecting"));
              }
            }
            return this.disconnecting;
          };
          MqttClient.prototype.publish = function(topic, message, opts, callback) {
            var packet;
            var options = this.options;
            if (typeof opts === "function") {
              callback = opts;
              opts = null;
            }
            var defaultOpts = { qos: 0, retain: false, dup: false };
            opts = xtend(defaultOpts, opts);
            if (this._checkDisconnecting(callback)) {
              return this;
            }
            packet = {
              cmd: "publish",
              topic,
              payload: message,
              qos: opts.qos,
              retain: opts.retain,
              messageId: this._nextId(),
              dup: opts.dup
            };
            if (options.protocolVersion === 5) {
              packet.properties = opts.properties;
              if (!options.properties && packet.properties && packet.properties.topicAlias || opts.properties && options.properties && (opts.properties.topicAlias && options.properties.topicAliasMaximum && opts.properties.topicAlias > options.properties.topicAliasMaximum || !options.properties.topicAliasMaximum && opts.properties.topicAlias)) {
                delete packet.properties.topicAlias;
              }
            }
            switch (opts.qos) {
              case 1:
              case 2:
                this.outgoing[packet.messageId] = {
                  volatile: false,
                  cb: callback || nop
                };
                if (this._storeProcessing) {
                  this._packetIdsDuringStoreProcessing[packet.messageId] = false;
                  this._storePacket(packet, void 0, opts.cbStorePut);
                } else {
                  this._sendPacket(packet, void 0, opts.cbStorePut);
                }
                break;
              default:
                if (this._storeProcessing) {
                  this._storePacket(packet, callback, opts.cbStorePut);
                } else {
                  this._sendPacket(packet, callback, opts.cbStorePut);
                }
                break;
            }
            return this;
          };
          MqttClient.prototype.subscribe = function() {
            var packet;
            var args = new Array(arguments.length);
            for (var i = 0; i < arguments.length; i++) {
              args[i] = arguments[i];
            }
            var subs = [];
            var obj = args.shift();
            var resubscribe = obj.resubscribe;
            var callback = args.pop() || nop;
            var opts = args.pop();
            var invalidTopic;
            var that = this;
            var version = this.options.protocolVersion;
            delete obj.resubscribe;
            if (typeof obj === "string") {
              obj = [obj];
            }
            if (typeof callback !== "function") {
              opts = callback;
              callback = nop;
            }
            invalidTopic = validations.validateTopics(obj);
            if (invalidTopic !== null) {
              setImmediate(callback, new Error("Invalid topic " + invalidTopic));
              return this;
            }
            if (this._checkDisconnecting(callback)) {
              return this;
            }
            var defaultOpts = {
              qos: 0
            };
            if (version === 5) {
              defaultOpts.nl = false;
              defaultOpts.rap = false;
              defaultOpts.rh = 0;
            }
            opts = xtend(defaultOpts, opts);
            if (Array.isArray(obj)) {
              obj.forEach(function(topic) {
                if (!that._resubscribeTopics.hasOwnProperty(topic) || that._resubscribeTopics[topic].qos < opts.qos || resubscribe) {
                  var currentOpts = {
                    topic,
                    qos: opts.qos
                  };
                  if (version === 5) {
                    currentOpts.nl = opts.nl;
                    currentOpts.rap = opts.rap;
                    currentOpts.rh = opts.rh;
                    currentOpts.properties = opts.properties;
                  }
                  subs.push(currentOpts);
                }
              });
            } else {
              Object.keys(obj).forEach(function(k) {
                if (!that._resubscribeTopics.hasOwnProperty(k) || that._resubscribeTopics[k].qos < obj[k].qos || resubscribe) {
                  var currentOpts = {
                    topic: k,
                    qos: obj[k].qos
                  };
                  if (version === 5) {
                    currentOpts.nl = obj[k].nl;
                    currentOpts.rap = obj[k].rap;
                    currentOpts.rh = obj[k].rh;
                    currentOpts.properties = opts.properties;
                  }
                  subs.push(currentOpts);
                }
              });
            }
            packet = {
              cmd: "subscribe",
              subscriptions: subs,
              qos: 1,
              retain: false,
              dup: false,
              messageId: this._nextId()
            };
            if (opts.properties) {
              packet.properties = opts.properties;
            }
            if (!subs.length) {
              callback(null, []);
              return;
            }
            if (this.options.resubscribe) {
              var topics = [];
              subs.forEach(function(sub) {
                if (that.options.reconnectPeriod > 0) {
                  var topic = { qos: sub.qos };
                  if (version === 5) {
                    topic.nl = sub.nl || false;
                    topic.rap = sub.rap || false;
                    topic.rh = sub.rh || 0;
                    topic.properties = sub.properties;
                  }
                  that._resubscribeTopics[sub.topic] = topic;
                  topics.push(sub.topic);
                }
              });
              that.messageIdToTopic[packet.messageId] = topics;
            }
            this.outgoing[packet.messageId] = {
              volatile: true,
              cb: function(err, packet2) {
                if (!err) {
                  var granted = packet2.granted;
                  for (var i2 = 0; i2 < granted.length; i2 += 1) {
                    subs[i2].qos = granted[i2];
                  }
                }
                callback(err, subs);
              }
            };
            this._sendPacket(packet);
            return this;
          };
          MqttClient.prototype.unsubscribe = function() {
            var packet = {
              cmd: "unsubscribe",
              qos: 1,
              messageId: this._nextId()
            };
            var that = this;
            var args = new Array(arguments.length);
            for (var i = 0; i < arguments.length; i++) {
              args[i] = arguments[i];
            }
            var topic = args.shift();
            var callback = args.pop() || nop;
            var opts = args.pop();
            if (typeof topic === "string") {
              topic = [topic];
            }
            if (typeof callback !== "function") {
              opts = callback;
              callback = nop;
            }
            if (this._checkDisconnecting(callback)) {
              return this;
            }
            if (typeof topic === "string") {
              packet.unsubscriptions = [topic];
            } else if (typeof topic === "object" && topic.length) {
              packet.unsubscriptions = topic;
            }
            if (this.options.resubscribe) {
              packet.unsubscriptions.forEach(function(topic2) {
                delete that._resubscribeTopics[topic2];
              });
            }
            if (typeof opts === "object" && opts.properties) {
              packet.properties = opts.properties;
            }
            this.outgoing[packet.messageId] = {
              volatile: true,
              cb: callback
            };
            this._sendPacket(packet);
            return this;
          };
          MqttClient.prototype.end = function() {
            var that = this;
            var force = arguments[0];
            var opts = arguments[1];
            var cb = arguments[2];
            if (force == null || typeof force !== "boolean") {
              cb = opts || nop;
              opts = force;
              force = false;
              if (typeof opts !== "object") {
                cb = opts;
                opts = null;
                if (typeof cb !== "function") {
                  cb = nop;
                }
              }
            }
            if (typeof opts !== "object") {
              cb = opts;
              opts = null;
            }
            cb = cb || nop;
            function closeStores() {
              that.disconnected = true;
              that.incomingStore.close(function() {
                that.outgoingStore.close(function() {
                  if (cb) {
                    cb.apply(null, arguments);
                  }
                  that.emit("end");
                });
              });
              if (that._deferredReconnect) {
                that._deferredReconnect();
              }
            }
            function finish() {
              that._cleanUp(force, setImmediate.bind(null, closeStores), opts);
            }
            if (this.disconnecting) {
              return this;
            }
            this._clearReconnect();
            this.disconnecting = true;
            if (!force && Object.keys(this.outgoing).length > 0) {
              this.once("outgoingEmpty", setTimeout.bind(null, finish, 10));
            } else {
              finish();
            }
            return this;
          };
          MqttClient.prototype.removeOutgoingMessage = function(mid) {
            var cb = this.outgoing[mid] ? this.outgoing[mid].cb : null;
            delete this.outgoing[mid];
            this.outgoingStore.del({ messageId: mid }, function() {
              cb(new Error("Message removed"));
            });
            return this;
          };
          MqttClient.prototype.reconnect = function(opts) {
            var that = this;
            var f = function() {
              if (opts) {
                that.options.incomingStore = opts.incomingStore;
                that.options.outgoingStore = opts.outgoingStore;
              } else {
                that.options.incomingStore = null;
                that.options.outgoingStore = null;
              }
              that.incomingStore = that.options.incomingStore || new Store();
              that.outgoingStore = that.options.outgoingStore || new Store();
              that.disconnecting = false;
              that.disconnected = false;
              that._deferredReconnect = null;
              that._reconnect();
            };
            if (this.disconnecting && !this.disconnected) {
              this._deferredReconnect = f;
            } else {
              f();
            }
            return this;
          };
          MqttClient.prototype._reconnect = function() {
            this.emit("reconnect");
            this._setupStream();
          };
          MqttClient.prototype._setupReconnect = function() {
            var that = this;
            if (!that.disconnecting && !that.reconnectTimer && that.options.reconnectPeriod > 0) {
              if (!this.reconnecting) {
                this.emit("offline");
                this.reconnecting = true;
              }
              that.reconnectTimer = setInterval(function() {
                that._reconnect();
              }, that.options.reconnectPeriod);
            }
          };
          MqttClient.prototype._clearReconnect = function() {
            if (this.reconnectTimer) {
              clearInterval(this.reconnectTimer);
              this.reconnectTimer = null;
            }
          };
          MqttClient.prototype._cleanUp = function(forced, done) {
            var opts = arguments[2];
            if (done) {
              this.stream.on("close", done);
            }
            if (forced) {
              if (this.options.reconnectPeriod === 0 && this.options.clean) {
                flush(this.outgoing);
              }
              this.stream.destroy();
            } else {
              var packet = xtend({ cmd: "disconnect" }, opts);
              this._sendPacket(
                packet,
                setImmediate.bind(
                  null,
                  this.stream.end.bind(this.stream)
                )
              );
            }
            if (!this.disconnecting) {
              this._clearReconnect();
              this._setupReconnect();
            }
            if (this.pingTimer !== null) {
              this.pingTimer.clear();
              this.pingTimer = null;
            }
            if (done && !this.connected) {
              this.stream.removeListener("close", done);
              done();
            }
          };
          MqttClient.prototype._sendPacket = function(packet, cb, cbStorePut) {
            cbStorePut = cbStorePut || nop;
            if (!this.connected) {
              this._storePacket(packet, cb, cbStorePut);
              return;
            }
            this._shiftPingInterval();
            switch (packet.cmd) {
              case "publish":
                break;
              case "pubrel":
                storeAndSend(this, packet, cb, cbStorePut);
                return;
              default:
                sendPacket(this, packet, cb);
                return;
            }
            switch (packet.qos) {
              case 2:
              case 1:
                storeAndSend(this, packet, cb, cbStorePut);
                break;
              case 0:
              default:
                sendPacket(this, packet, cb);
                break;
            }
          };
          MqttClient.prototype._storePacket = function(packet, cb, cbStorePut) {
            cbStorePut = cbStorePut || nop;
            if ((packet.qos || 0) === 0 && this.queueQoSZero || packet.cmd !== "publish") {
              this.queue.push({ packet, cb });
            } else if (packet.qos > 0) {
              cb = this.outgoing[packet.messageId] ? this.outgoing[packet.messageId].cb : null;
              this.outgoingStore.put(packet, function(err) {
                if (err) {
                  return cb && cb(err);
                }
                cbStorePut();
              });
            } else if (cb) {
              cb(new Error("No connection to broker"));
            }
          };
          MqttClient.prototype._setupPingTimer = function() {
            var that = this;
            if (!this.pingTimer && this.options.keepalive) {
              this.pingResp = true;
              this.pingTimer = reInterval(function() {
                that._checkPing();
              }, this.options.keepalive * 1e3);
            }
          };
          MqttClient.prototype._shiftPingInterval = function() {
            if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
              this.pingTimer.reschedule(this.options.keepalive * 1e3);
            }
          };
          MqttClient.prototype._checkPing = function() {
            if (this.pingResp) {
              this.pingResp = false;
              this._sendPacket({ cmd: "pingreq" });
            } else {
              this._cleanUp(true);
            }
          };
          MqttClient.prototype._handlePingresp = function() {
            this.pingResp = true;
          };
          MqttClient.prototype._handleConnack = function(packet) {
            var options = this.options;
            var version = options.protocolVersion;
            var rc = version === 5 ? packet.reasonCode : packet.returnCode;
            clearTimeout(this.connackTimer);
            if (packet.properties) {
              if (packet.properties.topicAliasMaximum) {
                if (!options.properties) {
                  options.properties = {};
                }
                options.properties.topicAliasMaximum = packet.properties.topicAliasMaximum;
              }
              if (packet.properties.serverKeepAlive && options.keepalive) {
                options.keepalive = packet.properties.serverKeepAlive;
                this._shiftPingInterval();
              }
              if (packet.properties.maximumPacketSize) {
                if (!options.properties) {
                  options.properties = {};
                }
                options.properties.maximumPacketSize = packet.properties.maximumPacketSize;
              }
            }
            if (rc === 0) {
              this.reconnecting = false;
              this._onConnect(packet);
            } else if (rc > 0) {
              var err = new Error("Connection refused: " + errors[rc]);
              err.code = rc;
              this.emit("error", err);
            }
          };
          MqttClient.prototype._handlePublish = function(packet, done) {
            done = typeof done !== "undefined" ? done : nop;
            var topic = packet.topic.toString();
            var message = packet.payload;
            var qos = packet.qos;
            var mid = packet.messageId;
            var that = this;
            var options = this.options;
            var validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153];
            switch (qos) {
              case 2: {
                options.customHandleAcks(topic, message, packet, function(error, code) {
                  if (!(error instanceof Error)) {
                    code = error;
                    error = null;
                  }
                  if (error) {
                    return that.emit("error", error);
                  }
                  if (validReasonCodes.indexOf(code) === -1) {
                    return that.emit("error", new Error("Wrong reason code for pubrec"));
                  }
                  if (code) {
                    that._sendPacket({ cmd: "pubrec", messageId: mid, reasonCode: code }, done);
                  } else {
                    that.incomingStore.put(packet, function() {
                      that._sendPacket({ cmd: "pubrec", messageId: mid }, done);
                    });
                  }
                });
                break;
              }
              case 1: {
                options.customHandleAcks(topic, message, packet, function(error, code) {
                  if (!(error instanceof Error)) {
                    code = error;
                    error = null;
                  }
                  if (error) {
                    return that.emit("error", error);
                  }
                  if (validReasonCodes.indexOf(code) === -1) {
                    return that.emit("error", new Error("Wrong reason code for puback"));
                  }
                  if (!code) {
                    that.emit("message", topic, message, packet);
                  }
                  that.handleMessage(packet, function(err) {
                    if (err) {
                      return done && done(err);
                    }
                    that._sendPacket({ cmd: "puback", messageId: mid, reasonCode: code }, done);
                  });
                });
                break;
              }
              case 0:
                this.emit("message", topic, message, packet);
                this.handleMessage(packet, done);
                break;
            }
          };
          MqttClient.prototype.handleMessage = function(packet, callback) {
            callback();
          };
          MqttClient.prototype._handleAck = function(packet) {
            var mid = packet.messageId;
            var type = packet.cmd;
            var response = null;
            var cb = this.outgoing[mid] ? this.outgoing[mid].cb : null;
            var that = this;
            var err;
            if (!cb) {
              return;
            }
            switch (type) {
              case "pubcomp":
              case "puback":
                var pubackRC = packet.reasonCode;
                if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
                  err = new Error("Publish error: " + errors[pubackRC]);
                  err.code = pubackRC;
                  cb(err, packet);
                }
                delete this.outgoing[mid];
                this.outgoingStore.del(packet, cb);
                break;
              case "pubrec":
                response = {
                  cmd: "pubrel",
                  qos: 2,
                  messageId: mid
                };
                var pubrecRC = packet.reasonCode;
                if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
                  err = new Error("Publish error: " + errors[pubrecRC]);
                  err.code = pubrecRC;
                  cb(err, packet);
                } else {
                  this._sendPacket(response);
                }
                break;
              case "suback":
                delete this.outgoing[mid];
                for (var grantedI = 0; grantedI < packet.granted.length; grantedI++) {
                  if ((packet.granted[grantedI] & 128) !== 0) {
                    var topics = this.messageIdToTopic[mid];
                    if (topics) {
                      topics.forEach(function(topic) {
                        delete that._resubscribeTopics[topic];
                      });
                    }
                  }
                }
                cb(null, packet);
                break;
              case "unsuback":
                delete this.outgoing[mid];
                cb(null);
                break;
              default:
                that.emit("error", new Error("unrecognized packet type"));
            }
            if (this.disconnecting && Object.keys(this.outgoing).length === 0) {
              this.emit("outgoingEmpty");
            }
          };
          MqttClient.prototype._handlePubrel = function(packet, callback) {
            callback = typeof callback !== "undefined" ? callback : nop;
            var mid = packet.messageId;
            var that = this;
            var comp = { cmd: "pubcomp", messageId: mid };
            that.incomingStore.get(packet, function(err, pub) {
              if (!err) {
                that.emit("message", pub.topic, pub.payload, pub);
                that.handleMessage(pub, function(err2) {
                  if (err2) {
                    return callback(err2);
                  }
                  that.incomingStore.del(pub, nop);
                  that._sendPacket(comp, callback);
                });
              } else {
                that._sendPacket(comp, callback);
              }
            });
          };
          MqttClient.prototype._handleDisconnect = function(packet) {
            this.emit("disconnect", packet);
          };
          MqttClient.prototype._nextId = function() {
            var id = this.nextId++;
            if (this.nextId === 65536) {
              this.nextId = 1;
            }
            return id;
          };
          MqttClient.prototype.getLastMessageId = function() {
            return this.nextId === 1 ? 65535 : this.nextId - 1;
          };
          MqttClient.prototype._resubscribe = function(connack) {
            var _resubscribeTopicsKeys = Object.keys(this._resubscribeTopics);
            if (!this._firstConnection && (this.options.clean || this.options.protocolVersion === 5 && !connack.sessionPresent) && _resubscribeTopicsKeys.length > 0) {
              if (this.options.resubscribe) {
                if (this.options.protocolVersion === 5) {
                  for (var topicI = 0; topicI < _resubscribeTopicsKeys.length; topicI++) {
                    var resubscribeTopic = {};
                    resubscribeTopic[_resubscribeTopicsKeys[topicI]] = this._resubscribeTopics[_resubscribeTopicsKeys[topicI]];
                    resubscribeTopic.resubscribe = true;
                    this.subscribe(resubscribeTopic, { properties: resubscribeTopic[_resubscribeTopicsKeys[topicI]].properties });
                  }
                } else {
                  this._resubscribeTopics.resubscribe = true;
                  this.subscribe(this._resubscribeTopics);
                }
              } else {
                this._resubscribeTopics = {};
              }
            }
            this._firstConnection = false;
          };
          MqttClient.prototype._onConnect = function(packet) {
            if (this.disconnected) {
              this.emit("connect", packet);
              return;
            }
            var that = this;
            this._setupPingTimer();
            this._resubscribe(packet);
            this.connected = true;
            function startStreamProcess() {
              var outStore = that.outgoingStore.createStream();
              function clearStoreProcessing() {
                that._storeProcessing = false;
                that._packetIdsDuringStoreProcessing = {};
              }
              that.once("close", remove);
              outStore.on("error", function(err) {
                clearStoreProcessing();
                that.removeListener("close", remove);
                that.emit("error", err);
              });
              function remove() {
                outStore.destroy();
                outStore = null;
                clearStoreProcessing();
              }
              function storeDeliver() {
                if (!outStore) {
                  return;
                }
                that._storeProcessing = true;
                var packet2 = outStore.read(1);
                var cb;
                if (!packet2) {
                  outStore.once("readable", storeDeliver);
                  return;
                }
                if (that._packetIdsDuringStoreProcessing[packet2.messageId]) {
                  storeDeliver();
                  return;
                }
                if (!that.disconnecting && !that.reconnectTimer) {
                  cb = that.outgoing[packet2.messageId] ? that.outgoing[packet2.messageId].cb : null;
                  that.outgoing[packet2.messageId] = {
                    volatile: false,
                    cb: function(err, status) {
                      if (cb) {
                        cb(err, status);
                      }
                      storeDeliver();
                    }
                  };
                  that._packetIdsDuringStoreProcessing[packet2.messageId] = true;
                  that._sendPacket(packet2);
                } else if (outStore.destroy) {
                  outStore.destroy();
                }
              }
              outStore.on("end", function() {
                var allProcessed = true;
                for (var id in that._packetIdsDuringStoreProcessing) {
                  if (!that._packetIdsDuringStoreProcessing[id]) {
                    allProcessed = false;
                    break;
                  }
                }
                if (allProcessed) {
                  clearStoreProcessing();
                  that.removeListener("close", remove);
                  that.emit("connect", packet);
                } else {
                  startStreamProcess();
                }
              });
              storeDeliver();
            }
            startStreamProcess();
          };
          module3.exports = MqttClient;
        }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
      }, { "./store": 7, "./validations": 8, "_process": 92, "events": 13, "inherits": 80, "mqtt-packet": 84, "readable-stream": 108, "reinterval": 109, "xtend": 121 }], 2: [function(require2, module3, exports3) {
        (function(Buffer) {
          var Transform = require2("readable-stream").Transform;
          var duplexify = require2("duplexify");
          var base64 = require2("base64-js");
          var my;
          var proxy;
          var stream;
          var isInitialized = false;
          function buildProxy() {
            var proxy2 = new Transform();
            proxy2._write = function(chunk, encoding, next) {
              my.sendSocketMessage({
                data: chunk.buffer,
                success: function() {
                  next();
                },
                fail: function() {
                  next(new Error());
                }
              });
            };
            proxy2._flush = function socketEnd(done) {
              my.closeSocket({
                success: function() {
                  done();
                }
              });
            };
            return proxy2;
          }
          function setDefaultOpts(opts) {
            if (!opts.hostname) {
              opts.hostname = "localhost";
            }
            if (!opts.path) {
              opts.path = "/";
            }
            if (!opts.wsOptions) {
              opts.wsOptions = {};
            }
          }
          function buildUrl(opts, client) {
            var protocol = opts.protocol === "alis" ? "wss" : "ws";
            var url = protocol + "://" + opts.hostname + opts.path;
            if (opts.port && opts.port !== 80 && opts.port !== 443) {
              url = protocol + "://" + opts.hostname + ":" + opts.port + opts.path;
            }
            if (typeof opts.transformWsUrl === "function") {
              url = opts.transformWsUrl(url, opts, client);
            }
            return url;
          }
          function bindEventHandler() {
            if (isInitialized)
              return;
            isInitialized = true;
            my.onSocketOpen(function() {
              stream.setReadable(proxy);
              stream.setWritable(proxy);
              stream.emit("connect");
            });
            my.onSocketMessage(function(res) {
              if (typeof res.data === "string") {
                var array = base64.toByteArray(res.data);
                var buffer = Buffer.from(array);
                proxy.push(buffer);
              } else {
                var reader = new FileReader();
                reader.addEventListener("load", function() {
                  var data = reader.result;
                  if (data instanceof ArrayBuffer)
                    data = Buffer.from(data);
                  else
                    data = Buffer.from(data, "utf8");
                  proxy.push(data);
                });
                reader.readAsArrayBuffer(res.data);
              }
            });
            my.onSocketClose(function() {
              stream.end();
              stream.destroy();
            });
            my.onSocketError(function(res) {
              stream.destroy(res);
            });
          }
          function buildStream(client, opts) {
            opts.hostname = opts.hostname || opts.host;
            if (!opts.hostname) {
              throw new Error("Could not determine host. Specify host manually.");
            }
            var websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
            setDefaultOpts(opts);
            var url = buildUrl(opts, client);
            my = opts.my;
            my.connectSocket({
              url,
              protocols: websocketSubProtocol
            });
            proxy = buildProxy();
            stream = duplexify.obj();
            bindEventHandler();
            return stream;
          }
          module3.exports = buildStream;
        }).call(this, require2("buffer").Buffer);
      }, { "base64-js": 10, "buffer": 12, "duplexify": 17, "readable-stream": 108 }], 3: [function(require2, module3, exports3) {
        var net = require2("net");
        function buildBuilder(client, opts) {
          var port, host;
          opts.port = opts.port || 1883;
          opts.hostname = opts.hostname || opts.host || "localhost";
          port = opts.port;
          host = opts.hostname;
          return net.createConnection(port, host);
        }
        module3.exports = buildBuilder;
      }, { "net": 11 }], 4: [function(require2, module3, exports3) {
        var tls = require2("tls");
        function buildBuilder(mqttClient, opts) {
          var connection;
          opts.port = opts.port || 8883;
          opts.host = opts.hostname || opts.host || "localhost";
          opts.rejectUnauthorized = opts.rejectUnauthorized !== false;
          delete opts.path;
          connection = tls.connect(opts);
          connection.on("secureConnect", function() {
            if (opts.rejectUnauthorized && !connection.authorized) {
              connection.emit("error", new Error("TLS not authorized"));
            } else {
              connection.removeListener("error", handleTLSerrors);
            }
          });
          function handleTLSerrors(err) {
            if (opts.rejectUnauthorized) {
              mqttClient.emit("error", err);
            }
            connection.end();
          }
          connection.on("error", handleTLSerrors);
          return connection;
        }
        module3.exports = buildBuilder;
      }, { "tls": 11 }], 5: [function(require2, module3, exports3) {
        (function(process) {
          var websocket = require2("websocket-stream");
          var urlModule = require2("url");
          var WSS_OPTIONS = [
            "rejectUnauthorized",
            "ca",
            "cert",
            "key",
            "pfx",
            "passphrase"
          ];
          var IS_BROWSER = process.title === "browser";
          function buildUrl(opts, client) {
            var url = opts.protocol + "://" + opts.hostname + ":" + opts.port + opts.path;
            if (typeof opts.transformWsUrl === "function") {
              url = opts.transformWsUrl(url, opts, client);
            }
            return url;
          }
          function setDefaultOpts(opts) {
            if (!opts.hostname) {
              opts.hostname = "localhost";
            }
            if (!opts.port) {
              if (opts.protocol === "wss") {
                opts.port = 443;
              } else {
                opts.port = 80;
              }
            }
            if (!opts.path) {
              opts.path = "/";
            }
            if (!opts.wsOptions) {
              opts.wsOptions = {};
            }
            if (!IS_BROWSER && opts.protocol === "wss") {
              WSS_OPTIONS.forEach(function(prop) {
                if (opts.hasOwnProperty(prop) && !opts.wsOptions.hasOwnProperty(prop)) {
                  opts.wsOptions[prop] = opts[prop];
                }
              });
            }
          }
          function createWebSocket(client, opts) {
            var websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
            setDefaultOpts(opts);
            var url = buildUrl(opts, client);
            return websocket(url, [websocketSubProtocol], opts.wsOptions);
          }
          function buildBuilder(client, opts) {
            return createWebSocket(client, opts);
          }
          function buildBuilderBrowser(client, opts) {
            if (!opts.hostname) {
              opts.hostname = opts.host;
            }
            if (!opts.hostname) {
              if (typeof document === "undefined") {
                throw new Error("Could not determine host. Specify host manually.");
              }
              var parsed = urlModule.parse(document.URL);
              opts.hostname = parsed.hostname;
              if (!opts.port) {
                opts.port = parsed.port;
              }
            }
            return createWebSocket(client, opts);
          }
          if (IS_BROWSER) {
            module3.exports = buildBuilderBrowser;
          } else {
            module3.exports = buildBuilder;
          }
        }).call(this, require2("_process"));
      }, { "_process": 92, "url": 113, "websocket-stream": 118 }], 6: [function(require2, module3, exports3) {
        (function(process, Buffer) {
          var Transform = require2("readable-stream").Transform;
          var duplexify = require2("duplexify");
          var socketTask;
          var proxy;
          var stream;
          function buildProxy() {
            var proxy2 = new Transform();
            proxy2._write = function(chunk, encoding, next) {
              socketTask.send({
                data: chunk.buffer,
                success: function() {
                  next();
                },
                fail: function(errMsg) {
                  next(new Error(errMsg));
                }
              });
            };
            proxy2._flush = function socketEnd(done) {
              socketTask.close({
                success: function() {
                  done();
                }
              });
            };
            return proxy2;
          }
          function setDefaultOpts(opts) {
            if (!opts.hostname) {
              opts.hostname = "localhost";
            }
            if (!opts.path) {
              opts.path = "/";
            }
            if (!opts.wsOptions) {
              opts.wsOptions = {};
            }
          }
          function buildUrl(opts, client) {
            var protocol = opts.protocol === "wxs" ? "wss" : "ws";
            var url = protocol + "://" + opts.hostname + opts.path;
            if (opts.port && opts.port !== 80 && opts.port !== 443) {
              url = protocol + "://" + opts.hostname + ":" + opts.port + opts.path;
            }
            if (typeof opts.transformWsUrl === "function") {
              url = opts.transformWsUrl(url, opts, client);
            }
            return url;
          }
          function bindEventHandler() {
            socketTask.onOpen(function() {
              stream.setReadable(proxy);
              stream.setWritable(proxy);
              stream.emit("connect");
            });
            socketTask.onMessage(function(res) {
              var data = res.data;
              if (data instanceof ArrayBuffer)
                data = Buffer.from(data);
              else
                data = Buffer.from(data, "utf8");
              proxy.push(data);
            });
            socketTask.onClose(function() {
              stream.end();
              stream.destroy();
            });
            socketTask.onError(function(res) {
              stream.destroy(new Error(res.errMsg));
            });
          }
          function buildStream(client, opts) {
            opts.hostname = opts.hostname || opts.host;
            if (!opts.hostname) {
              throw new Error("Could not determine host. Specify host manually.");
            }
            var websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
            setDefaultOpts(opts);
            var url = buildUrl(opts, client);
            socketTask = wx.connectSocket({
              url,
              protocols: websocketSubProtocol
            });
            proxy = buildProxy();
            stream = duplexify.obj();
            stream._destroy = function(err, cb) {
              socketTask.close({
                success: function() {
                  cb && cb(err);
                }
              });
            };
            var destroyRef = stream.destroy;
            stream.destroy = (function() {
              stream.destroy = destroyRef;
              var self2 = this;
              process.nextTick(function() {
                socketTask.close({
                  fail: function() {
                    self2._destroy(new Error());
                  }
                });
              });
            }).bind(stream);
            bindEventHandler();
            return stream;
          }
          module3.exports = buildStream;
        }).call(this, require2("_process"), require2("buffer").Buffer);
      }, { "_process": 92, "buffer": 12, "duplexify": 17, "readable-stream": 108 }], 7: [function(require2, module3, exports3) {
        (function(process) {
          var xtend = require2("xtend");
          var Readable = require2("readable-stream").Readable;
          var streamsOpts = { objectMode: true };
          var defaultStoreOptions = {
            clean: true
          };
          var Map2 = require2("es6-map");
          function Store(options) {
            if (!(this instanceof Store)) {
              return new Store(options);
            }
            this.options = options || {};
            this.options = xtend(defaultStoreOptions, options);
            this._inflights = new Map2();
          }
          Store.prototype.put = function(packet, cb) {
            this._inflights.set(packet.messageId, packet);
            if (cb) {
              cb();
            }
            return this;
          };
          Store.prototype.createStream = function() {
            var stream = new Readable(streamsOpts);
            var destroyed = false;
            var values = [];
            var i = 0;
            this._inflights.forEach(function(value, key) {
              values.push(value);
            });
            stream._read = function() {
              if (!destroyed && i < values.length) {
                this.push(values[i++]);
              } else {
                this.push(null);
              }
            };
            stream.destroy = function() {
              if (destroyed) {
                return;
              }
              var self2 = this;
              destroyed = true;
              process.nextTick(function() {
                self2.emit("close");
              });
            };
            return stream;
          };
          Store.prototype.del = function(packet, cb) {
            packet = this._inflights.get(packet.messageId);
            if (packet) {
              this._inflights.delete(packet.messageId);
              cb(null, packet);
            } else if (cb) {
              cb(new Error("missing packet"));
            }
            return this;
          };
          Store.prototype.get = function(packet, cb) {
            packet = this._inflights.get(packet.messageId);
            if (packet) {
              cb(null, packet);
            } else if (cb) {
              cb(new Error("missing packet"));
            }
            return this;
          };
          Store.prototype.close = function(cb) {
            if (this.options.clean) {
              this._inflights = null;
            }
            if (cb) {
              cb();
            }
          };
          module3.exports = Store;
        }).call(this, require2("_process"));
      }, { "_process": 92, "es6-map": 67, "readable-stream": 108, "xtend": 121 }], 8: [function(require2, module3, exports3) {
        function validateTopic(topic) {
          var parts = topic.split("/");
          for (var i = 0; i < parts.length; i++) {
            if (parts[i] === "+") {
              continue;
            }
            if (parts[i] === "#") {
              return i === parts.length - 1;
            }
            if (parts[i].indexOf("+") !== -1 || parts[i].indexOf("#") !== -1) {
              return false;
            }
          }
          return true;
        }
        function validateTopics(topics) {
          if (topics.length === 0) {
            return "empty_topic_list";
          }
          for (var i = 0; i < topics.length; i++) {
            if (!validateTopic(topics[i])) {
              return topics[i];
            }
          }
          return null;
        }
        module3.exports = {
          validateTopics
        };
      }, {}], 9: [function(require2, module3, exports3) {
        (function(process) {
          var MqttClient = require2("../client");
          var Store = require2("../store");
          var url = require2("url");
          var xtend = require2("xtend");
          var protocols = {};
          if (process.title !== "browser") {
            protocols.mqtt = require2("./tcp");
            protocols.tcp = require2("./tcp");
            protocols.ssl = require2("./tls");
            protocols.tls = require2("./tls");
            protocols.mqtts = require2("./tls");
          } else {
            protocols.wx = require2("./wx");
            protocols.wxs = require2("./wx");
            protocols.ali = require2("./ali");
            protocols.alis = require2("./ali");
          }
          protocols.ws = require2("./ws");
          protocols.wss = require2("./ws");
          function parseAuthOptions(opts) {
            var matches;
            if (opts.auth) {
              matches = opts.auth.match(/^(.+):(.+)$/);
              if (matches) {
                opts.username = matches[1];
                opts.password = matches[2];
              } else {
                opts.username = opts.auth;
              }
            }
          }
          function connect(brokerUrl, opts) {
            if (typeof brokerUrl === "object" && !opts) {
              opts = brokerUrl;
              brokerUrl = null;
            }
            opts = opts || {};
            if (brokerUrl) {
              var parsed = url.parse(brokerUrl, true);
              if (parsed.port != null) {
                parsed.port = Number(parsed.port);
              }
              opts = xtend(parsed, opts);
              if (opts.protocol === null) {
                throw new Error("Missing protocol");
              }
              opts.protocol = opts.protocol.replace(/:$/, "");
            }
            parseAuthOptions(opts);
            if (opts.query && typeof opts.query.clientId === "string") {
              opts.clientId = opts.query.clientId;
            }
            if (opts.cert && opts.key) {
              if (opts.protocol) {
                if (["mqtts", "wss", "wxs", "alis"].indexOf(opts.protocol) === -1) {
                  switch (opts.protocol) {
                    case "mqtt":
                      opts.protocol = "mqtts";
                      break;
                    case "ws":
                      opts.protocol = "wss";
                      break;
                    case "wx":
                      opts.protocol = "wxs";
                      break;
                    case "ali":
                      opts.protocol = "alis";
                      break;
                    default:
                      throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!');
                  }
                }
              } else {
                throw new Error("Missing secure protocol key");
              }
            }
            if (!protocols[opts.protocol]) {
              var isSecure = ["mqtts", "wss"].indexOf(opts.protocol) !== -1;
              opts.protocol = [
                "mqtt",
                "mqtts",
                "ws",
                "wss",
                "wx",
                "wxs",
                "ali",
                "alis"
              ].filter(function(key, index) {
                if (isSecure && index % 2 === 0) {
                  return false;
                }
                return typeof protocols[key] === "function";
              })[0];
            }
            if (opts.clean === false && !opts.clientId) {
              throw new Error("Missing clientId for unclean clients");
            }
            if (opts.protocol) {
              opts.defaultProtocol = opts.protocol;
            }
            function wrapper(client) {
              if (opts.servers) {
                if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
                  client._reconnectCount = 0;
                }
                opts.host = opts.servers[client._reconnectCount].host;
                opts.port = opts.servers[client._reconnectCount].port;
                opts.protocol = !opts.servers[client._reconnectCount].protocol ? opts.defaultProtocol : opts.servers[client._reconnectCount].protocol;
                opts.hostname = opts.host;
                client._reconnectCount++;
              }
              return protocols[opts.protocol](client, opts);
            }
            return new MqttClient(wrapper, opts);
          }
          module3.exports = connect;
          module3.exports.connect = connect;
          module3.exports.MqttClient = MqttClient;
          module3.exports.Store = Store;
        }).call(this, require2("_process"));
      }, { "../client": 1, "../store": 7, "./ali": 2, "./tcp": 3, "./tls": 4, "./ws": 5, "./wx": 6, "_process": 92, "url": 113, "xtend": 121 }], 10: [function(require2, module3, exports3) {
        exports3.byteLength = byteLength;
        exports3.toByteArray = toByteArray;
        exports3.fromByteArray = fromByteArray;
        var lookup = [];
        var revLookup = [];
        var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
        var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for (var i = 0, len = code.length; i < len; ++i) {
          lookup[i] = code[i];
          revLookup[code.charCodeAt(i)] = i;
        }
        revLookup["-".charCodeAt(0)] = 62;
        revLookup["_".charCodeAt(0)] = 63;
        function getLens(b64) {
          var len2 = b64.length;
          if (len2 % 4 > 0) {
            throw new Error("Invalid string. Length must be a multiple of 4");
          }
          var validLen = b64.indexOf("=");
          if (validLen === -1)
            validLen = len2;
          var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
          return [validLen, placeHoldersLen];
        }
        function byteLength(b64) {
          var lens = getLens(b64);
          var validLen = lens[0];
          var placeHoldersLen = lens[1];
          return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
        }
        function _byteLength(b64, validLen, placeHoldersLen) {
          return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
        }
        function toByteArray(b64) {
          var tmp;
          var lens = getLens(b64);
          var validLen = lens[0];
          var placeHoldersLen = lens[1];
          var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
          var curByte = 0;
          var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
          for (var i2 = 0; i2 < len2; i2 += 4) {
            tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
            arr[curByte++] = tmp >> 16 & 255;
            arr[curByte++] = tmp >> 8 & 255;
            arr[curByte++] = tmp & 255;
          }
          if (placeHoldersLen === 2) {
            tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
            arr[curByte++] = tmp & 255;
          }
          if (placeHoldersLen === 1) {
            tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
            arr[curByte++] = tmp >> 8 & 255;
            arr[curByte++] = tmp & 255;
          }
          return arr;
        }
        function tripletToBase64(num) {
          return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
        }
        function encodeChunk(uint8, start, end) {
          var tmp;
          var output = [];
          for (var i2 = start; i2 < end; i2 += 3) {
            tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
            output.push(tripletToBase64(tmp));
          }
          return output.join("");
        }
        function fromByteArray(uint8) {
          var tmp;
          var len2 = uint8.length;
          var extraBytes = len2 % 3;
          var parts = [];
          var maxChunkLength = 16383;
          for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
            parts.push(encodeChunk(
              uint8,
              i2,
              i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength
            ));
          }
          if (extraBytes === 1) {
            tmp = uint8[len2 - 1];
            parts.push(
              lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
            );
          } else if (extraBytes === 2) {
            tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
            parts.push(
              lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
            );
          }
          return parts.join("");
        }
      }, {}], 11: [function(require2, module3, exports3) {
      }, {}], 12: [function(require2, module3, exports3) {
        var base64 = require2("base64-js");
        var ieee754 = require2("ieee754");
        exports3.Buffer = Buffer;
        exports3.SlowBuffer = SlowBuffer;
        exports3.INSPECT_MAX_BYTES = 50;
        var K_MAX_LENGTH = 2147483647;
        exports3.kMaxLength = K_MAX_LENGTH;
        Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();
        if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
          formatAppLog(
            "error",
            "at node_modules/mqtt/dist/mqtt.js:2450",
            "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
          );
        }
        function typedArraySupport() {
          try {
            var arr = new Uint8Array(1);
            arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function() {
              return 42;
            } };
            return arr.foo() === 42;
          } catch (e) {
            return false;
          }
        }
        Object.defineProperty(Buffer.prototype, "parent", {
          enumerable: true,
          get: function() {
            if (!Buffer.isBuffer(this))
              return void 0;
            return this.buffer;
          }
        });
        Object.defineProperty(Buffer.prototype, "offset", {
          enumerable: true,
          get: function() {
            if (!Buffer.isBuffer(this))
              return void 0;
            return this.byteOffset;
          }
        });
        function createBuffer(length) {
          if (length > K_MAX_LENGTH) {
            throw new RangeError('The value "' + length + '" is invalid for option "size"');
          }
          var buf = new Uint8Array(length);
          buf.__proto__ = Buffer.prototype;
          return buf;
        }
        function Buffer(arg, encodingOrOffset, length) {
          if (typeof arg === "number") {
            if (typeof encodingOrOffset === "string") {
              throw new TypeError(
                'The "string" argument must be of type string. Received type number'
              );
            }
            return allocUnsafe(arg);
          }
          return from(arg, encodingOrOffset, length);
        }
        if (typeof Symbol !== "undefined" && Symbol.species != null && Buffer[Symbol.species] === Buffer) {
          Object.defineProperty(Buffer, Symbol.species, {
            value: null,
            configurable: true,
            enumerable: false,
            writable: false
          });
        }
        Buffer.poolSize = 8192;
        function from(value, encodingOrOffset, length) {
          if (typeof value === "string") {
            return fromString(value, encodingOrOffset);
          }
          if (ArrayBuffer.isView(value)) {
            return fromArrayLike(value);
          }
          if (value == null) {
            throw TypeError(
              "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
            );
          }
          if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
            return fromArrayBuffer(value, encodingOrOffset, length);
          }
          if (typeof value === "number") {
            throw new TypeError(
              'The "value" argument must not be of type number. Received type number'
            );
          }
          var valueOf = value.valueOf && value.valueOf();
          if (valueOf != null && valueOf !== value) {
            return Buffer.from(valueOf, encodingOrOffset, length);
          }
          var b = fromObject(value);
          if (b)
            return b;
          if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
            return Buffer.from(
              value[Symbol.toPrimitive]("string"),
              encodingOrOffset,
              length
            );
          }
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
          );
        }
        Buffer.from = function(value, encodingOrOffset, length) {
          return from(value, encodingOrOffset, length);
        };
        Buffer.prototype.__proto__ = Uint8Array.prototype;
        Buffer.__proto__ = Uint8Array;
        function assertSize(size) {
          if (typeof size !== "number") {
            throw new TypeError('"size" argument must be of type number');
          } else if (size < 0) {
            throw new RangeError('The value "' + size + '" is invalid for option "size"');
          }
        }
        function alloc(size, fill, encoding) {
          assertSize(size);
          if (size <= 0) {
            return createBuffer(size);
          }
          if (fill !== void 0) {
            return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
          }
          return createBuffer(size);
        }
        Buffer.alloc = function(size, fill, encoding) {
          return alloc(size, fill, encoding);
        };
        function allocUnsafe(size) {
          assertSize(size);
          return createBuffer(size < 0 ? 0 : checked(size) | 0);
        }
        Buffer.allocUnsafe = function(size) {
          return allocUnsafe(size);
        };
        Buffer.allocUnsafeSlow = function(size) {
          return allocUnsafe(size);
        };
        function fromString(string, encoding) {
          if (typeof encoding !== "string" || encoding === "") {
            encoding = "utf8";
          }
          if (!Buffer.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          var length = byteLength(string, encoding) | 0;
          var buf = createBuffer(length);
          var actual = buf.write(string, encoding);
          if (actual !== length) {
            buf = buf.slice(0, actual);
          }
          return buf;
        }
        function fromArrayLike(array) {
          var length = array.length < 0 ? 0 : checked(array.length) | 0;
          var buf = createBuffer(length);
          for (var i = 0; i < length; i += 1) {
            buf[i] = array[i] & 255;
          }
          return buf;
        }
        function fromArrayBuffer(array, byteOffset, length) {
          if (byteOffset < 0 || array.byteLength < byteOffset) {
            throw new RangeError('"offset" is outside of buffer bounds');
          }
          if (array.byteLength < byteOffset + (length || 0)) {
            throw new RangeError('"length" is outside of buffer bounds');
          }
          var buf;
          if (byteOffset === void 0 && length === void 0) {
            buf = new Uint8Array(array);
          } else if (length === void 0) {
            buf = new Uint8Array(array, byteOffset);
          } else {
            buf = new Uint8Array(array, byteOffset, length);
          }
          buf.__proto__ = Buffer.prototype;
          return buf;
        }
        function fromObject(obj) {
          if (Buffer.isBuffer(obj)) {
            var len = checked(obj.length) | 0;
            var buf = createBuffer(len);
            if (buf.length === 0) {
              return buf;
            }
            obj.copy(buf, 0, 0, len);
            return buf;
          }
          if (obj.length !== void 0) {
            if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
              return createBuffer(0);
            }
            return fromArrayLike(obj);
          }
          if (obj.type === "Buffer" && Array.isArray(obj.data)) {
            return fromArrayLike(obj.data);
          }
        }
        function checked(length) {
          if (length >= K_MAX_LENGTH) {
            throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
          }
          return length | 0;
        }
        function SlowBuffer(length) {
          if (+length != length) {
            length = 0;
          }
          return Buffer.alloc(+length);
        }
        Buffer.isBuffer = function isBuffer(b) {
          return b != null && b._isBuffer === true && b !== Buffer.prototype;
        };
        Buffer.compare = function compare(a, b) {
          if (isInstance(a, Uint8Array))
            a = Buffer.from(a, a.offset, a.byteLength);
          if (isInstance(b, Uint8Array))
            b = Buffer.from(b, b.offset, b.byteLength);
          if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
            throw new TypeError(
              'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
            );
          }
          if (a === b)
            return 0;
          var x = a.length;
          var y = b.length;
          for (var i = 0, len = Math.min(x, y); i < len; ++i) {
            if (a[i] !== b[i]) {
              x = a[i];
              y = b[i];
              break;
            }
          }
          if (x < y)
            return -1;
          if (y < x)
            return 1;
          return 0;
        };
        Buffer.isEncoding = function isEncoding(encoding) {
          switch (String(encoding).toLowerCase()) {
            case "hex":
            case "utf8":
            case "utf-8":
            case "ascii":
            case "latin1":
            case "binary":
            case "base64":
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return true;
            default:
              return false;
          }
        };
        Buffer.concat = function concat(list, length) {
          if (!Array.isArray(list)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          }
          if (list.length === 0) {
            return Buffer.alloc(0);
          }
          var i;
          if (length === void 0) {
            length = 0;
            for (i = 0; i < list.length; ++i) {
              length += list[i].length;
            }
          }
          var buffer = Buffer.allocUnsafe(length);
          var pos = 0;
          for (i = 0; i < list.length; ++i) {
            var buf = list[i];
            if (isInstance(buf, Uint8Array)) {
              buf = Buffer.from(buf);
            }
            if (!Buffer.isBuffer(buf)) {
              throw new TypeError('"list" argument must be an Array of Buffers');
            }
            buf.copy(buffer, pos);
            pos += buf.length;
          }
          return buffer;
        };
        function byteLength(string, encoding) {
          if (Buffer.isBuffer(string)) {
            return string.length;
          }
          if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
            return string.byteLength;
          }
          if (typeof string !== "string") {
            throw new TypeError(
              'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
            );
          }
          var len = string.length;
          var mustMatch = arguments.length > 2 && arguments[2] === true;
          if (!mustMatch && len === 0)
            return 0;
          var loweredCase = false;
          for (; ; ) {
            switch (encoding) {
              case "ascii":
              case "latin1":
              case "binary":
                return len;
              case "utf8":
              case "utf-8":
                return utf8ToBytes(string).length;
              case "ucs2":
              case "ucs-2":
              case "utf16le":
              case "utf-16le":
                return len * 2;
              case "hex":
                return len >>> 1;
              case "base64":
                return base64ToBytes(string).length;
              default:
                if (loweredCase) {
                  return mustMatch ? -1 : utf8ToBytes(string).length;
                }
                encoding = ("" + encoding).toLowerCase();
                loweredCase = true;
            }
          }
        }
        Buffer.byteLength = byteLength;
        function slowToString(encoding, start, end) {
          var loweredCase = false;
          if (start === void 0 || start < 0) {
            start = 0;
          }
          if (start > this.length) {
            return "";
          }
          if (end === void 0 || end > this.length) {
            end = this.length;
          }
          if (end <= 0) {
            return "";
          }
          end >>>= 0;
          start >>>= 0;
          if (end <= start) {
            return "";
          }
          if (!encoding)
            encoding = "utf8";
          while (true) {
            switch (encoding) {
              case "hex":
                return hexSlice(this, start, end);
              case "utf8":
              case "utf-8":
                return utf8Slice(this, start, end);
              case "ascii":
                return asciiSlice(this, start, end);
              case "latin1":
              case "binary":
                return latin1Slice(this, start, end);
              case "base64":
                return base64Slice(this, start, end);
              case "ucs2":
              case "ucs-2":
              case "utf16le":
              case "utf-16le":
                return utf16leSlice(this, start, end);
              default:
                if (loweredCase)
                  throw new TypeError("Unknown encoding: " + encoding);
                encoding = (encoding + "").toLowerCase();
                loweredCase = true;
            }
          }
        }
        Buffer.prototype._isBuffer = true;
        function swap(b, n, m) {
          var i = b[n];
          b[n] = b[m];
          b[m] = i;
        }
        Buffer.prototype.swap16 = function swap16() {
          var len = this.length;
          if (len % 2 !== 0) {
            throw new RangeError("Buffer size must be a multiple of 16-bits");
          }
          for (var i = 0; i < len; i += 2) {
            swap(this, i, i + 1);
          }
          return this;
        };
        Buffer.prototype.swap32 = function swap32() {
          var len = this.length;
          if (len % 4 !== 0) {
            throw new RangeError("Buffer size must be a multiple of 32-bits");
          }
          for (var i = 0; i < len; i += 4) {
            swap(this, i, i + 3);
            swap(this, i + 1, i + 2);
          }
          return this;
        };
        Buffer.prototype.swap64 = function swap64() {
          var len = this.length;
          if (len % 8 !== 0) {
            throw new RangeError("Buffer size must be a multiple of 64-bits");
          }
          for (var i = 0; i < len; i += 8) {
            swap(this, i, i + 7);
            swap(this, i + 1, i + 6);
            swap(this, i + 2, i + 5);
            swap(this, i + 3, i + 4);
          }
          return this;
        };
        Buffer.prototype.toString = function toString() {
          var length = this.length;
          if (length === 0)
            return "";
          if (arguments.length === 0)
            return utf8Slice(this, 0, length);
          return slowToString.apply(this, arguments);
        };
        Buffer.prototype.toLocaleString = Buffer.prototype.toString;
        Buffer.prototype.equals = function equals(b) {
          if (!Buffer.isBuffer(b))
            throw new TypeError("Argument must be a Buffer");
          if (this === b)
            return true;
          return Buffer.compare(this, b) === 0;
        };
        Buffer.prototype.inspect = function inspect() {
          var str = "";
          var max = exports3.INSPECT_MAX_BYTES;
          str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
          if (this.length > max)
            str += " ... ";
          return "<Buffer " + str + ">";
        };
        Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
          if (isInstance(target, Uint8Array)) {
            target = Buffer.from(target, target.offset, target.byteLength);
          }
          if (!Buffer.isBuffer(target)) {
            throw new TypeError(
              'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
            );
          }
          if (start === void 0) {
            start = 0;
          }
          if (end === void 0) {
            end = target ? target.length : 0;
          }
          if (thisStart === void 0) {
            thisStart = 0;
          }
          if (thisEnd === void 0) {
            thisEnd = this.length;
          }
          if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
            throw new RangeError("out of range index");
          }
          if (thisStart >= thisEnd && start >= end) {
            return 0;
          }
          if (thisStart >= thisEnd) {
            return -1;
          }
          if (start >= end) {
            return 1;
          }
          start >>>= 0;
          end >>>= 0;
          thisStart >>>= 0;
          thisEnd >>>= 0;
          if (this === target)
            return 0;
          var x = thisEnd - thisStart;
          var y = end - start;
          var len = Math.min(x, y);
          var thisCopy = this.slice(thisStart, thisEnd);
          var targetCopy = target.slice(start, end);
          for (var i = 0; i < len; ++i) {
            if (thisCopy[i] !== targetCopy[i]) {
              x = thisCopy[i];
              y = targetCopy[i];
              break;
            }
          }
          if (x < y)
            return -1;
          if (y < x)
            return 1;
          return 0;
        };
        function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
          if (buffer.length === 0)
            return -1;
          if (typeof byteOffset === "string") {
            encoding = byteOffset;
            byteOffset = 0;
          } else if (byteOffset > 2147483647) {
            byteOffset = 2147483647;
          } else if (byteOffset < -2147483648) {
            byteOffset = -2147483648;
          }
          byteOffset = +byteOffset;
          if (numberIsNaN(byteOffset)) {
            byteOffset = dir ? 0 : buffer.length - 1;
          }
          if (byteOffset < 0)
            byteOffset = buffer.length + byteOffset;
          if (byteOffset >= buffer.length) {
            if (dir)
              return -1;
            else
              byteOffset = buffer.length - 1;
          } else if (byteOffset < 0) {
            if (dir)
              byteOffset = 0;
            else
              return -1;
          }
          if (typeof val === "string") {
            val = Buffer.from(val, encoding);
          }
          if (Buffer.isBuffer(val)) {
            if (val.length === 0) {
              return -1;
            }
            return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
          } else if (typeof val === "number") {
            val = val & 255;
            if (typeof Uint8Array.prototype.indexOf === "function") {
              if (dir) {
                return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
              } else {
                return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
              }
            }
            return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
          }
          throw new TypeError("val must be string, number or Buffer");
        }
        function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
          var indexSize = 1;
          var arrLength = arr.length;
          var valLength = val.length;
          if (encoding !== void 0) {
            encoding = String(encoding).toLowerCase();
            if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
              if (arr.length < 2 || val.length < 2) {
                return -1;
              }
              indexSize = 2;
              arrLength /= 2;
              valLength /= 2;
              byteOffset /= 2;
            }
          }
          function read(buf, i2) {
            if (indexSize === 1) {
              return buf[i2];
            } else {
              return buf.readUInt16BE(i2 * indexSize);
            }
          }
          var i;
          if (dir) {
            var foundIndex = -1;
            for (i = byteOffset; i < arrLength; i++) {
              if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
                if (foundIndex === -1)
                  foundIndex = i;
                if (i - foundIndex + 1 === valLength)
                  return foundIndex * indexSize;
              } else {
                if (foundIndex !== -1)
                  i -= i - foundIndex;
                foundIndex = -1;
              }
            }
          } else {
            if (byteOffset + valLength > arrLength)
              byteOffset = arrLength - valLength;
            for (i = byteOffset; i >= 0; i--) {
              var found = true;
              for (var j = 0; j < valLength; j++) {
                if (read(arr, i + j) !== read(val, j)) {
                  found = false;
                  break;
                }
              }
              if (found)
                return i;
            }
          }
          return -1;
        }
        Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
          return this.indexOf(val, byteOffset, encoding) !== -1;
        };
        Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
          return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
        };
        Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
          return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
        };
        function hexWrite(buf, string, offset, length) {
          offset = Number(offset) || 0;
          var remaining = buf.length - offset;
          if (!length) {
            length = remaining;
          } else {
            length = Number(length);
            if (length > remaining) {
              length = remaining;
            }
          }
          var strLen = string.length;
          if (length > strLen / 2) {
            length = strLen / 2;
          }
          for (var i = 0; i < length; ++i) {
            var parsed = parseInt(string.substr(i * 2, 2), 16);
            if (numberIsNaN(parsed))
              return i;
            buf[offset + i] = parsed;
          }
          return i;
        }
        function utf8Write(buf, string, offset, length) {
          return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
        }
        function asciiWrite(buf, string, offset, length) {
          return blitBuffer(asciiToBytes(string), buf, offset, length);
        }
        function latin1Write(buf, string, offset, length) {
          return asciiWrite(buf, string, offset, length);
        }
        function base64Write(buf, string, offset, length) {
          return blitBuffer(base64ToBytes(string), buf, offset, length);
        }
        function ucs2Write(buf, string, offset, length) {
          return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
        }
        Buffer.prototype.write = function write(string, offset, length, encoding) {
          if (offset === void 0) {
            encoding = "utf8";
            length = this.length;
            offset = 0;
          } else if (length === void 0 && typeof offset === "string") {
            encoding = offset;
            length = this.length;
            offset = 0;
          } else if (isFinite(offset)) {
            offset = offset >>> 0;
            if (isFinite(length)) {
              length = length >>> 0;
              if (encoding === void 0)
                encoding = "utf8";
            } else {
              encoding = length;
              length = void 0;
            }
          } else {
            throw new Error(
              "Buffer.write(string, encoding, offset[, length]) is no longer supported"
            );
          }
          var remaining = this.length - offset;
          if (length === void 0 || length > remaining)
            length = remaining;
          if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
            throw new RangeError("Attempt to write outside buffer bounds");
          }
          if (!encoding)
            encoding = "utf8";
          var loweredCase = false;
          for (; ; ) {
            switch (encoding) {
              case "hex":
                return hexWrite(this, string, offset, length);
              case "utf8":
              case "utf-8":
                return utf8Write(this, string, offset, length);
              case "ascii":
                return asciiWrite(this, string, offset, length);
              case "latin1":
              case "binary":
                return latin1Write(this, string, offset, length);
              case "base64":
                return base64Write(this, string, offset, length);
              case "ucs2":
              case "ucs-2":
              case "utf16le":
              case "utf-16le":
                return ucs2Write(this, string, offset, length);
              default:
                if (loweredCase)
                  throw new TypeError("Unknown encoding: " + encoding);
                encoding = ("" + encoding).toLowerCase();
                loweredCase = true;
            }
          }
        };
        Buffer.prototype.toJSON = function toJSON() {
          return {
            type: "Buffer",
            data: Array.prototype.slice.call(this._arr || this, 0)
          };
        };
        function base64Slice(buf, start, end) {
          if (start === 0 && end === buf.length) {
            return base64.fromByteArray(buf);
          } else {
            return base64.fromByteArray(buf.slice(start, end));
          }
        }
        function utf8Slice(buf, start, end) {
          end = Math.min(buf.length, end);
          var res = [];
          var i = start;
          while (i < end) {
            var firstByte = buf[i];
            var codePoint = null;
            var bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
            if (i + bytesPerSequence <= end) {
              var secondByte, thirdByte, fourthByte, tempCodePoint;
              switch (bytesPerSequence) {
                case 1:
                  if (firstByte < 128) {
                    codePoint = firstByte;
                  }
                  break;
                case 2:
                  secondByte = buf[i + 1];
                  if ((secondByte & 192) === 128) {
                    tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                    if (tempCodePoint > 127) {
                      codePoint = tempCodePoint;
                    }
                  }
                  break;
                case 3:
                  secondByte = buf[i + 1];
                  thirdByte = buf[i + 2];
                  if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                    tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                    if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                      codePoint = tempCodePoint;
                    }
                  }
                  break;
                case 4:
                  secondByte = buf[i + 1];
                  thirdByte = buf[i + 2];
                  fourthByte = buf[i + 3];
                  if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                    tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                    if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                      codePoint = tempCodePoint;
                    }
                  }
              }
            }
            if (codePoint === null) {
              codePoint = 65533;
              bytesPerSequence = 1;
            } else if (codePoint > 65535) {
              codePoint -= 65536;
              res.push(codePoint >>> 10 & 1023 | 55296);
              codePoint = 56320 | codePoint & 1023;
            }
            res.push(codePoint);
            i += bytesPerSequence;
          }
          return decodeCodePointsArray(res);
        }
        var MAX_ARGUMENTS_LENGTH = 4096;
        function decodeCodePointsArray(codePoints) {
          var len = codePoints.length;
          if (len <= MAX_ARGUMENTS_LENGTH) {
            return String.fromCharCode.apply(String, codePoints);
          }
          var res = "";
          var i = 0;
          while (i < len) {
            res += String.fromCharCode.apply(
              String,
              codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
            );
          }
          return res;
        }
        function asciiSlice(buf, start, end) {
          var ret = "";
          end = Math.min(buf.length, end);
          for (var i = start; i < end; ++i) {
            ret += String.fromCharCode(buf[i] & 127);
          }
          return ret;
        }
        function latin1Slice(buf, start, end) {
          var ret = "";
          end = Math.min(buf.length, end);
          for (var i = start; i < end; ++i) {
            ret += String.fromCharCode(buf[i]);
          }
          return ret;
        }
        function hexSlice(buf, start, end) {
          var len = buf.length;
          if (!start || start < 0)
            start = 0;
          if (!end || end < 0 || end > len)
            end = len;
          var out = "";
          for (var i = start; i < end; ++i) {
            out += toHex(buf[i]);
          }
          return out;
        }
        function utf16leSlice(buf, start, end) {
          var bytes = buf.slice(start, end);
          var res = "";
          for (var i = 0; i < bytes.length; i += 2) {
            res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
          }
          return res;
        }
        Buffer.prototype.slice = function slice(start, end) {
          var len = this.length;
          start = ~~start;
          end = end === void 0 ? len : ~~end;
          if (start < 0) {
            start += len;
            if (start < 0)
              start = 0;
          } else if (start > len) {
            start = len;
          }
          if (end < 0) {
            end += len;
            if (end < 0)
              end = 0;
          } else if (end > len) {
            end = len;
          }
          if (end < start)
            end = start;
          var newBuf = this.subarray(start, end);
          newBuf.__proto__ = Buffer.prototype;
          return newBuf;
        };
        function checkOffset(offset, ext, length) {
          if (offset % 1 !== 0 || offset < 0)
            throw new RangeError("offset is not uint");
          if (offset + ext > length)
            throw new RangeError("Trying to access beyond buffer length");
        }
        Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
          offset = offset >>> 0;
          byteLength2 = byteLength2 >>> 0;
          if (!noAssert)
            checkOffset(offset, byteLength2, this.length);
          var val = this[offset];
          var mul = 1;
          var i = 0;
          while (++i < byteLength2 && (mul *= 256)) {
            val += this[offset + i] * mul;
          }
          return val;
        };
        Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
          offset = offset >>> 0;
          byteLength2 = byteLength2 >>> 0;
          if (!noAssert) {
            checkOffset(offset, byteLength2, this.length);
          }
          var val = this[offset + --byteLength2];
          var mul = 1;
          while (byteLength2 > 0 && (mul *= 256)) {
            val += this[offset + --byteLength2] * mul;
          }
          return val;
        };
        Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 1, this.length);
          return this[offset];
        };
        Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          return this[offset] | this[offset + 1] << 8;
        };
        Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          return this[offset] << 8 | this[offset + 1];
        };
        Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
        };
        Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
        };
        Buffer.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
          offset = offset >>> 0;
          byteLength2 = byteLength2 >>> 0;
          if (!noAssert)
            checkOffset(offset, byteLength2, this.length);
          var val = this[offset];
          var mul = 1;
          var i = 0;
          while (++i < byteLength2 && (mul *= 256)) {
            val += this[offset + i] * mul;
          }
          mul *= 128;
          if (val >= mul)
            val -= Math.pow(2, 8 * byteLength2);
          return val;
        };
        Buffer.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
          offset = offset >>> 0;
          byteLength2 = byteLength2 >>> 0;
          if (!noAssert)
            checkOffset(offset, byteLength2, this.length);
          var i = byteLength2;
          var mul = 1;
          var val = this[offset + --i];
          while (i > 0 && (mul *= 256)) {
            val += this[offset + --i] * mul;
          }
          mul *= 128;
          if (val >= mul)
            val -= Math.pow(2, 8 * byteLength2);
          return val;
        };
        Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 1, this.length);
          if (!(this[offset] & 128))
            return this[offset];
          return (255 - this[offset] + 1) * -1;
        };
        Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          var val = this[offset] | this[offset + 1] << 8;
          return val & 32768 ? val | 4294901760 : val;
        };
        Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          var val = this[offset + 1] | this[offset] << 8;
          return val & 32768 ? val | 4294901760 : val;
        };
        Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
        };
        Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
        };
        Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return ieee754.read(this, offset, true, 23, 4);
        };
        Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return ieee754.read(this, offset, false, 23, 4);
        };
        Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 8, this.length);
          return ieee754.read(this, offset, true, 52, 8);
        };
        Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
          offset = offset >>> 0;
          if (!noAssert)
            checkOffset(offset, 8, this.length);
          return ieee754.read(this, offset, false, 52, 8);
        };
        function checkInt(buf, value, offset, ext, max, min) {
          if (!Buffer.isBuffer(buf))
            throw new TypeError('"buffer" argument must be a Buffer instance');
          if (value > max || value < min)
            throw new RangeError('"value" argument is out of bounds');
          if (offset + ext > buf.length)
            throw new RangeError("Index out of range");
        }
        Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
          value = +value;
          offset = offset >>> 0;
          byteLength2 = byteLength2 >>> 0;
          if (!noAssert) {
            var maxBytes = Math.pow(2, 8 * byteLength2) - 1;
            checkInt(this, value, offset, byteLength2, maxBytes, 0);
          }
          var mul = 1;
          var i = 0;
          this[offset] = value & 255;
          while (++i < byteLength2 && (mul *= 256)) {
            this[offset + i] = value / mul & 255;
          }
          return offset + byteLength2;
        };
        Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
          value = +value;
          offset = offset >>> 0;
          byteLength2 = byteLength2 >>> 0;
          if (!noAssert) {
            var maxBytes = Math.pow(2, 8 * byteLength2) - 1;
            checkInt(this, value, offset, byteLength2, maxBytes, 0);
          }
          var i = byteLength2 - 1;
          var mul = 1;
          this[offset + i] = value & 255;
          while (--i >= 0 && (mul *= 256)) {
            this[offset + i] = value / mul & 255;
          }
          return offset + byteLength2;
        };
        Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 1, 255, 0);
          this[offset] = value & 255;
          return offset + 1;
        };
        Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 65535, 0);
          this[offset] = value & 255;
          this[offset + 1] = value >>> 8;
          return offset + 2;
        };
        Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 65535, 0);
          this[offset] = value >>> 8;
          this[offset + 1] = value & 255;
          return offset + 2;
        };
        Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 4294967295, 0);
          this[offset + 3] = value >>> 24;
          this[offset + 2] = value >>> 16;
          this[offset + 1] = value >>> 8;
          this[offset] = value & 255;
          return offset + 4;
        };
        Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 4294967295, 0);
          this[offset] = value >>> 24;
          this[offset + 1] = value >>> 16;
          this[offset + 2] = value >>> 8;
          this[offset + 3] = value & 255;
          return offset + 4;
        };
        Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert) {
            var limit = Math.pow(2, 8 * byteLength2 - 1);
            checkInt(this, value, offset, byteLength2, limit - 1, -limit);
          }
          var i = 0;
          var mul = 1;
          var sub = 0;
          this[offset] = value & 255;
          while (++i < byteLength2 && (mul *= 256)) {
            if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
              sub = 1;
            }
            this[offset + i] = (value / mul >> 0) - sub & 255;
          }
          return offset + byteLength2;
        };
        Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert) {
            var limit = Math.pow(2, 8 * byteLength2 - 1);
            checkInt(this, value, offset, byteLength2, limit - 1, -limit);
          }
          var i = byteLength2 - 1;
          var mul = 1;
          var sub = 0;
          this[offset + i] = value & 255;
          while (--i >= 0 && (mul *= 256)) {
            if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
              sub = 1;
            }
            this[offset + i] = (value / mul >> 0) - sub & 255;
          }
          return offset + byteLength2;
        };
        Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 1, 127, -128);
          if (value < 0)
            value = 255 + value + 1;
          this[offset] = value & 255;
          return offset + 1;
        };
        Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 32767, -32768);
          this[offset] = value & 255;
          this[offset + 1] = value >>> 8;
          return offset + 2;
        };
        Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 32767, -32768);
          this[offset] = value >>> 8;
          this[offset + 1] = value & 255;
          return offset + 2;
        };
        Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 2147483647, -2147483648);
          this[offset] = value & 255;
          this[offset + 1] = value >>> 8;
          this[offset + 2] = value >>> 16;
          this[offset + 3] = value >>> 24;
          return offset + 4;
        };
        Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 2147483647, -2147483648);
          if (value < 0)
            value = 4294967295 + value + 1;
          this[offset] = value >>> 24;
          this[offset + 1] = value >>> 16;
          this[offset + 2] = value >>> 8;
          this[offset + 3] = value & 255;
          return offset + 4;
        };
        function checkIEEE754(buf, value, offset, ext, max, min) {
          if (offset + ext > buf.length)
            throw new RangeError("Index out of range");
          if (offset < 0)
            throw new RangeError("Index out of range");
        }
        function writeFloat(buf, value, offset, littleEndian, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert) {
            checkIEEE754(buf, value, offset, 4);
          }
          ieee754.write(buf, value, offset, littleEndian, 23, 4);
          return offset + 4;
        }
        Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
          return writeFloat(this, value, offset, true, noAssert);
        };
        Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
          return writeFloat(this, value, offset, false, noAssert);
        };
        function writeDouble(buf, value, offset, littleEndian, noAssert) {
          value = +value;
          offset = offset >>> 0;
          if (!noAssert) {
            checkIEEE754(buf, value, offset, 8);
          }
          ieee754.write(buf, value, offset, littleEndian, 52, 8);
          return offset + 8;
        }
        Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
          return writeDouble(this, value, offset, true, noAssert);
        };
        Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
          return writeDouble(this, value, offset, false, noAssert);
        };
        Buffer.prototype.copy = function copy(target, targetStart, start, end) {
          if (!Buffer.isBuffer(target))
            throw new TypeError("argument should be a Buffer");
          if (!start)
            start = 0;
          if (!end && end !== 0)
            end = this.length;
          if (targetStart >= target.length)
            targetStart = target.length;
          if (!targetStart)
            targetStart = 0;
          if (end > 0 && end < start)
            end = start;
          if (end === start)
            return 0;
          if (target.length === 0 || this.length === 0)
            return 0;
          if (targetStart < 0) {
            throw new RangeError("targetStart out of bounds");
          }
          if (start < 0 || start >= this.length)
            throw new RangeError("Index out of range");
          if (end < 0)
            throw new RangeError("sourceEnd out of bounds");
          if (end > this.length)
            end = this.length;
          if (target.length - targetStart < end - start) {
            end = target.length - targetStart + start;
          }
          var len = end - start;
          if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
            this.copyWithin(targetStart, start, end);
          } else if (this === target && start < targetStart && targetStart < end) {
            for (var i = len - 1; i >= 0; --i) {
              target[i + targetStart] = this[i + start];
            }
          } else {
            Uint8Array.prototype.set.call(
              target,
              this.subarray(start, end),
              targetStart
            );
          }
          return len;
        };
        Buffer.prototype.fill = function fill(val, start, end, encoding) {
          if (typeof val === "string") {
            if (typeof start === "string") {
              encoding = start;
              start = 0;
              end = this.length;
            } else if (typeof end === "string") {
              encoding = end;
              end = this.length;
            }
            if (encoding !== void 0 && typeof encoding !== "string") {
              throw new TypeError("encoding must be a string");
            }
            if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
              throw new TypeError("Unknown encoding: " + encoding);
            }
            if (val.length === 1) {
              var code = val.charCodeAt(0);
              if (encoding === "utf8" && code < 128 || encoding === "latin1") {
                val = code;
              }
            }
          } else if (typeof val === "number") {
            val = val & 255;
          }
          if (start < 0 || this.length < start || this.length < end) {
            throw new RangeError("Out of range index");
          }
          if (end <= start) {
            return this;
          }
          start = start >>> 0;
          end = end === void 0 ? this.length : end >>> 0;
          if (!val)
            val = 0;
          var i;
          if (typeof val === "number") {
            for (i = start; i < end; ++i) {
              this[i] = val;
            }
          } else {
            var bytes = Buffer.isBuffer(val) ? val : Buffer.from(val, encoding);
            var len = bytes.length;
            if (len === 0) {
              throw new TypeError('The value "' + val + '" is invalid for argument "value"');
            }
            for (i = 0; i < end - start; ++i) {
              this[i + start] = bytes[i % len];
            }
          }
          return this;
        };
        var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
        function base64clean(str) {
          str = str.split("=")[0];
          str = str.trim().replace(INVALID_BASE64_RE, "");
          if (str.length < 2)
            return "";
          while (str.length % 4 !== 0) {
            str = str + "=";
          }
          return str;
        }
        function toHex(n) {
          if (n < 16)
            return "0" + n.toString(16);
          return n.toString(16);
        }
        function utf8ToBytes(string, units) {
          units = units || Infinity;
          var codePoint;
          var length = string.length;
          var leadSurrogate = null;
          var bytes = [];
          for (var i = 0; i < length; ++i) {
            codePoint = string.charCodeAt(i);
            if (codePoint > 55295 && codePoint < 57344) {
              if (!leadSurrogate) {
                if (codePoint > 56319) {
                  if ((units -= 3) > -1)
                    bytes.push(239, 191, 189);
                  continue;
                } else if (i + 1 === length) {
                  if ((units -= 3) > -1)
                    bytes.push(239, 191, 189);
                  continue;
                }
                leadSurrogate = codePoint;
                continue;
              }
              if (codePoint < 56320) {
                if ((units -= 3) > -1)
                  bytes.push(239, 191, 189);
                leadSurrogate = codePoint;
                continue;
              }
              codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
            } else if (leadSurrogate) {
              if ((units -= 3) > -1)
                bytes.push(239, 191, 189);
            }
            leadSurrogate = null;
            if (codePoint < 128) {
              if ((units -= 1) < 0)
                break;
              bytes.push(codePoint);
            } else if (codePoint < 2048) {
              if ((units -= 2) < 0)
                break;
              bytes.push(
                codePoint >> 6 | 192,
                codePoint & 63 | 128
              );
            } else if (codePoint < 65536) {
              if ((units -= 3) < 0)
                break;
              bytes.push(
                codePoint >> 12 | 224,
                codePoint >> 6 & 63 | 128,
                codePoint & 63 | 128
              );
            } else if (codePoint < 1114112) {
              if ((units -= 4) < 0)
                break;
              bytes.push(
                codePoint >> 18 | 240,
                codePoint >> 12 & 63 | 128,
                codePoint >> 6 & 63 | 128,
                codePoint & 63 | 128
              );
            } else {
              throw new Error("Invalid code point");
            }
          }
          return bytes;
        }
        function asciiToBytes(str) {
          var byteArray = [];
          for (var i = 0; i < str.length; ++i) {
            byteArray.push(str.charCodeAt(i) & 255);
          }
          return byteArray;
        }
        function utf16leToBytes(str, units) {
          var c, hi, lo;
          var byteArray = [];
          for (var i = 0; i < str.length; ++i) {
            if ((units -= 2) < 0)
              break;
            c = str.charCodeAt(i);
            hi = c >> 8;
            lo = c % 256;
            byteArray.push(lo);
            byteArray.push(hi);
          }
          return byteArray;
        }
        function base64ToBytes(str) {
          return base64.toByteArray(base64clean(str));
        }
        function blitBuffer(src, dst, offset, length) {
          for (var i = 0; i < length; ++i) {
            if (i + offset >= dst.length || i >= src.length)
              break;
            dst[i + offset] = src[i];
          }
          return i;
        }
        function isInstance(obj, type) {
          return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
        }
        function numberIsNaN(obj) {
          return obj !== obj;
        }
      }, { "base64-js": 10, "ieee754": 79 }], 13: [function(require2, module3, exports3) {
        var objectCreate = Object.create || objectCreatePolyfill;
        var objectKeys = Object.keys || objectKeysPolyfill;
        var bind = Function.prototype.bind || functionBindPolyfill;
        function EventEmitter() {
          if (!this._events || !Object.prototype.hasOwnProperty.call(this, "_events")) {
            this._events = objectCreate(null);
            this._eventsCount = 0;
          }
          this._maxListeners = this._maxListeners || void 0;
        }
        module3.exports = EventEmitter;
        EventEmitter.EventEmitter = EventEmitter;
        EventEmitter.prototype._events = void 0;
        EventEmitter.prototype._maxListeners = void 0;
        var defaultMaxListeners = 10;
        var hasDefineProperty;
        try {
          var o = {};
          if (Object.defineProperty)
            Object.defineProperty(o, "x", { value: 0 });
          hasDefineProperty = o.x === 0;
        } catch (err) {
          hasDefineProperty = false;
        }
        if (hasDefineProperty) {
          Object.defineProperty(EventEmitter, "defaultMaxListeners", {
            enumerable: true,
            get: function() {
              return defaultMaxListeners;
            },
            set: function(arg) {
              if (typeof arg !== "number" || arg < 0 || arg !== arg)
                throw new TypeError('"defaultMaxListeners" must be a positive number');
              defaultMaxListeners = arg;
            }
          });
        } else {
          EventEmitter.defaultMaxListeners = defaultMaxListeners;
        }
        EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
          if (typeof n !== "number" || n < 0 || isNaN(n))
            throw new TypeError('"n" argument must be a positive number');
          this._maxListeners = n;
          return this;
        };
        function $getMaxListeners(that) {
          if (that._maxListeners === void 0)
            return EventEmitter.defaultMaxListeners;
          return that._maxListeners;
        }
        EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
          return $getMaxListeners(this);
        };
        function emitNone(handler, isFn, self2) {
          if (isFn)
            handler.call(self2);
          else {
            var len = handler.length;
            var listeners = arrayClone(handler, len);
            for (var i = 0; i < len; ++i)
              listeners[i].call(self2);
          }
        }
        function emitOne(handler, isFn, self2, arg1) {
          if (isFn)
            handler.call(self2, arg1);
          else {
            var len = handler.length;
            var listeners = arrayClone(handler, len);
            for (var i = 0; i < len; ++i)
              listeners[i].call(self2, arg1);
          }
        }
        function emitTwo(handler, isFn, self2, arg1, arg2) {
          if (isFn)
            handler.call(self2, arg1, arg2);
          else {
            var len = handler.length;
            var listeners = arrayClone(handler, len);
            for (var i = 0; i < len; ++i)
              listeners[i].call(self2, arg1, arg2);
          }
        }
        function emitThree(handler, isFn, self2, arg1, arg2, arg3) {
          if (isFn)
            handler.call(self2, arg1, arg2, arg3);
          else {
            var len = handler.length;
            var listeners = arrayClone(handler, len);
            for (var i = 0; i < len; ++i)
              listeners[i].call(self2, arg1, arg2, arg3);
          }
        }
        function emitMany(handler, isFn, self2, args) {
          if (isFn)
            handler.apply(self2, args);
          else {
            var len = handler.length;
            var listeners = arrayClone(handler, len);
            for (var i = 0; i < len; ++i)
              listeners[i].apply(self2, args);
          }
        }
        EventEmitter.prototype.emit = function emit(type) {
          var er, handler, len, args, i, events;
          var doError = type === "error";
          events = this._events;
          if (events)
            doError = doError && events.error == null;
          else if (!doError)
            return false;
          if (doError) {
            if (arguments.length > 1)
              er = arguments[1];
            if (er instanceof Error) {
              throw er;
            } else {
              var err = new Error('Unhandled "error" event. (' + er + ")");
              err.context = er;
              throw err;
            }
          }
          handler = events[type];
          if (!handler)
            return false;
          var isFn = typeof handler === "function";
          len = arguments.length;
          switch (len) {
            case 1:
              emitNone(handler, isFn, this);
              break;
            case 2:
              emitOne(handler, isFn, this, arguments[1]);
              break;
            case 3:
              emitTwo(handler, isFn, this, arguments[1], arguments[2]);
              break;
            case 4:
              emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
              break;
            default:
              args = new Array(len - 1);
              for (i = 1; i < len; i++)
                args[i - 1] = arguments[i];
              emitMany(handler, isFn, this, args);
          }
          return true;
        };
        function _addListener(target, type, listener, prepend) {
          var m;
          var events;
          var existing;
          if (typeof listener !== "function")
            throw new TypeError('"listener" argument must be a function');
          events = target._events;
          if (!events) {
            events = target._events = objectCreate(null);
            target._eventsCount = 0;
          } else {
            if (events.newListener) {
              target.emit(
                "newListener",
                type,
                listener.listener ? listener.listener : listener
              );
              events = target._events;
            }
            existing = events[type];
          }
          if (!existing) {
            existing = events[type] = listener;
            ++target._eventsCount;
          } else {
            if (typeof existing === "function") {
              existing = events[type] = prepend ? [listener, existing] : [existing, listener];
            } else {
              if (prepend) {
                existing.unshift(listener);
              } else {
                existing.push(listener);
              }
            }
            if (!existing.warned) {
              m = $getMaxListeners(target);
              if (m && m > 0 && existing.length > m) {
                existing.warned = true;
                var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + ' "' + String(type) + '" listeners added. Use emitter.setMaxListeners() to increase limit.');
                w.name = "MaxListenersExceededWarning";
                w.emitter = target;
                w.type = type;
                w.count = existing.length;
                if (typeof console === "object" && console.warn) {
                  formatAppLog("warn", "at node_modules/mqtt/dist/mqtt.js:4451", "%s: %s", w.name, w.message);
                }
              }
            }
          }
          return target;
        }
        EventEmitter.prototype.addListener = function addListener(type, listener) {
          return _addListener(this, type, listener, false);
        };
        EventEmitter.prototype.on = EventEmitter.prototype.addListener;
        EventEmitter.prototype.prependListener = function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };
        function onceWrapper() {
          if (!this.fired) {
            this.target.removeListener(this.type, this.wrapFn);
            this.fired = true;
            switch (arguments.length) {
              case 0:
                return this.listener.call(this.target);
              case 1:
                return this.listener.call(this.target, arguments[0]);
              case 2:
                return this.listener.call(this.target, arguments[0], arguments[1]);
              case 3:
                return this.listener.call(
                  this.target,
                  arguments[0],
                  arguments[1],
                  arguments[2]
                );
              default:
                var args = new Array(arguments.length);
                for (var i = 0; i < args.length; ++i)
                  args[i] = arguments[i];
                this.listener.apply(this.target, args);
            }
          }
        }
        function _onceWrap(target, type, listener) {
          var state = { fired: false, wrapFn: void 0, target, type, listener };
          var wrapped = bind.call(onceWrapper, state);
          wrapped.listener = listener;
          state.wrapFn = wrapped;
          return wrapped;
        }
        EventEmitter.prototype.once = function once(type, listener) {
          if (typeof listener !== "function")
            throw new TypeError('"listener" argument must be a function');
          this.on(type, _onceWrap(this, type, listener));
          return this;
        };
        EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
          if (typeof listener !== "function")
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };
        EventEmitter.prototype.removeListener = function removeListener(type, listener) {
          var list, events, position, i, originalListener;
          if (typeof listener !== "function")
            throw new TypeError('"listener" argument must be a function');
          events = this._events;
          if (!events)
            return this;
          list = events[type];
          if (!list)
            return this;
          if (list === listener || list.listener === listener) {
            if (--this._eventsCount === 0)
              this._events = objectCreate(null);
            else {
              delete events[type];
              if (events.removeListener)
                this.emit("removeListener", type, list.listener || listener);
            }
          } else if (typeof list !== "function") {
            position = -1;
            for (i = list.length - 1; i >= 0; i--) {
              if (list[i] === listener || list[i].listener === listener) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }
            if (position < 0)
              return this;
            if (position === 0)
              list.shift();
            else
              spliceOne(list, position);
            if (list.length === 1)
              events[type] = list[0];
            if (events.removeListener)
              this.emit("removeListener", type, originalListener || listener);
          }
          return this;
        };
        EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
          var listeners, events, i;
          events = this._events;
          if (!events)
            return this;
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = objectCreate(null);
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = objectCreate(null);
              else
                delete events[type];
            }
            return this;
          }
          if (arguments.length === 0) {
            var keys = objectKeys(events);
            var key;
            for (i = 0; i < keys.length; ++i) {
              key = keys[i];
              if (key === "removeListener")
                continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners("removeListener");
            this._events = objectCreate(null);
            this._eventsCount = 0;
            return this;
          }
          listeners = events[type];
          if (typeof listeners === "function") {
            this.removeListener(type, listeners);
          } else if (listeners) {
            for (i = listeners.length - 1; i >= 0; i--) {
              this.removeListener(type, listeners[i]);
            }
          }
          return this;
        };
        function _listeners(target, type, unwrap) {
          var events = target._events;
          if (!events)
            return [];
          var evlistener = events[type];
          if (!evlistener)
            return [];
          if (typeof evlistener === "function")
            return unwrap ? [evlistener.listener || evlistener] : [evlistener];
          return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
        }
        EventEmitter.prototype.listeners = function listeners(type) {
          return _listeners(this, type, true);
        };
        EventEmitter.prototype.rawListeners = function rawListeners(type) {
          return _listeners(this, type, false);
        };
        EventEmitter.listenerCount = function(emitter, type) {
          if (typeof emitter.listenerCount === "function") {
            return emitter.listenerCount(type);
          } else {
            return listenerCount.call(emitter, type);
          }
        };
        EventEmitter.prototype.listenerCount = listenerCount;
        function listenerCount(type) {
          var events = this._events;
          if (events) {
            var evlistener = events[type];
            if (typeof evlistener === "function") {
              return 1;
            } else if (evlistener) {
              return evlistener.length;
            }
          }
          return 0;
        }
        EventEmitter.prototype.eventNames = function eventNames() {
          return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
        };
        function spliceOne(list, index) {
          for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
            list[i] = list[k];
          list.pop();
        }
        function arrayClone(arr, n) {
          var copy = new Array(n);
          for (var i = 0; i < n; ++i)
            copy[i] = arr[i];
          return copy;
        }
        function unwrapListeners(arr) {
          var ret = new Array(arr.length);
          for (var i = 0; i < ret.length; ++i) {
            ret[i] = arr[i].listener || arr[i];
          }
          return ret;
        }
        function objectCreatePolyfill(proto) {
          var F = function() {
          };
          F.prototype = proto;
          return new F();
        }
        function objectKeysPolyfill(obj) {
          for (var k in obj)
            if (Object.prototype.hasOwnProperty.call(obj, k))
              ;
          return k;
        }
        function functionBindPolyfill(context) {
          var fn = this;
          return function() {
            return fn.apply(context, arguments);
          };
        }
      }, {}], 14: [function(require2, module3, exports3) {
        (function(Buffer) {
          function isArray(arg) {
            if (Array.isArray) {
              return Array.isArray(arg);
            }
            return objectToString(arg) === "[object Array]";
          }
          exports3.isArray = isArray;
          function isBoolean(arg) {
            return typeof arg === "boolean";
          }
          exports3.isBoolean = isBoolean;
          function isNull(arg) {
            return arg === null;
          }
          exports3.isNull = isNull;
          function isNullOrUndefined(arg) {
            return arg == null;
          }
          exports3.isNullOrUndefined = isNullOrUndefined;
          function isNumber(arg) {
            return typeof arg === "number";
          }
          exports3.isNumber = isNumber;
          function isString(arg) {
            return typeof arg === "string";
          }
          exports3.isString = isString;
          function isSymbol(arg) {
            return typeof arg === "symbol";
          }
          exports3.isSymbol = isSymbol;
          function isUndefined(arg) {
            return arg === void 0;
          }
          exports3.isUndefined = isUndefined;
          function isRegExp(re) {
            return objectToString(re) === "[object RegExp]";
          }
          exports3.isRegExp = isRegExp;
          function isObject(arg) {
            return typeof arg === "object" && arg !== null;
          }
          exports3.isObject = isObject;
          function isDate(d) {
            return objectToString(d) === "[object Date]";
          }
          exports3.isDate = isDate;
          function isError(e) {
            return objectToString(e) === "[object Error]" || e instanceof Error;
          }
          exports3.isError = isError;
          function isFunction(arg) {
            return typeof arg === "function";
          }
          exports3.isFunction = isFunction;
          function isPrimitive(arg) {
            return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || // ES6 symbol
            typeof arg === "undefined";
          }
          exports3.isPrimitive = isPrimitive;
          exports3.isBuffer = Buffer.isBuffer;
          function objectToString(o) {
            return Object.prototype.toString.call(o);
          }
        }).call(this, { "isBuffer": require2("../../is-buffer/index.js") });
      }, { "../../is-buffer/index.js": 81 }], 15: [function(require2, module3, exports3) {
        var copy = require2("es5-ext/object/copy"), normalizeOptions = require2("es5-ext/object/normalize-options"), ensureCallable = require2("es5-ext/object/valid-callable"), map = require2("es5-ext/object/map"), callable = require2("es5-ext/object/valid-callable"), validValue = require2("es5-ext/object/valid-value"), bind = Function.prototype.bind, defineProperty = Object.defineProperty, hasOwnProperty = Object.prototype.hasOwnProperty, define3;
        define3 = function(name, desc, options) {
          var value = validValue(desc) && callable(desc.value), dgs;
          dgs = copy(desc);
          delete dgs.writable;
          delete dgs.value;
          dgs.get = function() {
            if (!options.overwriteDefinition && hasOwnProperty.call(this, name))
              return value;
            desc.value = bind.call(value, options.resolveContext ? options.resolveContext(this) : this);
            defineProperty(this, name, desc);
            return this[name];
          };
          return dgs;
        };
        module3.exports = function(props) {
          var options = normalizeOptions(arguments[1]);
          if (options.resolveContext != null)
            ensureCallable(options.resolveContext);
          return map(props, function(desc, name) {
            return define3(name, desc, options);
          });
        };
      }, { "es5-ext/object/copy": 39, "es5-ext/object/map": 48, "es5-ext/object/normalize-options": 49, "es5-ext/object/valid-callable": 54, "es5-ext/object/valid-value": 55 }], 16: [function(require2, module3, exports3) {
        var assign = require2("es5-ext/object/assign"), normalizeOpts = require2("es5-ext/object/normalize-options"), isCallable = require2("es5-ext/object/is-callable"), contains = require2("es5-ext/string/#/contains"), d;
        d = module3.exports = function(dscr, value) {
          var c, e, w, options, desc;
          if (arguments.length < 2 || typeof dscr !== "string") {
            options = value;
            value = dscr;
            dscr = null;
          } else {
            options = arguments[2];
          }
          if (dscr == null) {
            c = w = true;
            e = false;
          } else {
            c = contains.call(dscr, "c");
            e = contains.call(dscr, "e");
            w = contains.call(dscr, "w");
          }
          desc = { value, configurable: c, enumerable: e, writable: w };
          return !options ? desc : assign(normalizeOpts(options), desc);
        };
        d.gs = function(dscr, get, set) {
          var c, e, options, desc;
          if (typeof dscr !== "string") {
            options = set;
            set = get;
            get = dscr;
            dscr = null;
          } else {
            options = arguments[3];
          }
          if (get == null) {
            get = void 0;
          } else if (!isCallable(get)) {
            options = get;
            get = set = void 0;
          } else if (set == null) {
            set = void 0;
          } else if (!isCallable(set)) {
            options = set;
            set = void 0;
          }
          if (dscr == null) {
            c = true;
            e = false;
          } else {
            c = contains.call(dscr, "c");
            e = contains.call(dscr, "e");
          }
          desc = { get, set, configurable: c, enumerable: e };
          return !options ? desc : assign(normalizeOpts(options), desc);
        };
      }, { "es5-ext/object/assign": 36, "es5-ext/object/is-callable": 42, "es5-ext/object/normalize-options": 49, "es5-ext/string/#/contains": 56 }], 17: [function(require2, module3, exports3) {
        (function(process, Buffer) {
          var stream = require2("readable-stream");
          var eos = require2("end-of-stream");
          var inherits = require2("inherits");
          var shift = require2("stream-shift");
          var SIGNAL_FLUSH = Buffer.from && Buffer.from !== Uint8Array.from ? Buffer.from([0]) : new Buffer([0]);
          var onuncork = function(self2, fn) {
            if (self2._corked)
              self2.once("uncork", fn);
            else
              fn();
          };
          var autoDestroy = function(self2, err) {
            if (self2._autoDestroy)
              self2.destroy(err);
          };
          var destroyer = function(self2, end2) {
            return function(err) {
              if (err)
                autoDestroy(self2, err.message === "premature close" ? null : err);
              else if (end2 && !self2._ended)
                self2.end();
            };
          };
          var end = function(ws, fn) {
            if (!ws)
              return fn();
            if (ws._writableState && ws._writableState.finished)
              return fn();
            if (ws._writableState)
              return ws.end(fn);
            ws.end();
            fn();
          };
          var toStreams2 = function(rs) {
            return new stream.Readable({ objectMode: true, highWaterMark: 16 }).wrap(rs);
          };
          var Duplexify = function(writable, readable, opts) {
            if (!(this instanceof Duplexify))
              return new Duplexify(writable, readable, opts);
            stream.Duplex.call(this, opts);
            this._writable = null;
            this._readable = null;
            this._readable2 = null;
            this._autoDestroy = !opts || opts.autoDestroy !== false;
            this._forwardDestroy = !opts || opts.destroy !== false;
            this._forwardEnd = !opts || opts.end !== false;
            this._corked = 1;
            this._ondrain = null;
            this._drained = false;
            this._forwarding = false;
            this._unwrite = null;
            this._unread = null;
            this._ended = false;
            this.destroyed = false;
            if (writable)
              this.setWritable(writable);
            if (readable)
              this.setReadable(readable);
          };
          inherits(Duplexify, stream.Duplex);
          Duplexify.obj = function(writable, readable, opts) {
            if (!opts)
              opts = {};
            opts.objectMode = true;
            opts.highWaterMark = 16;
            return new Duplexify(writable, readable, opts);
          };
          Duplexify.prototype.cork = function() {
            if (++this._corked === 1)
              this.emit("cork");
          };
          Duplexify.prototype.uncork = function() {
            if (this._corked && --this._corked === 0)
              this.emit("uncork");
          };
          Duplexify.prototype.setWritable = function(writable) {
            if (this._unwrite)
              this._unwrite();
            if (this.destroyed) {
              if (writable && writable.destroy)
                writable.destroy();
              return;
            }
            if (writable === null || writable === false) {
              this.end();
              return;
            }
            var self2 = this;
            var unend = eos(writable, { writable: true, readable: false }, destroyer(this, this._forwardEnd));
            var ondrain = function() {
              var ondrain2 = self2._ondrain;
              self2._ondrain = null;
              if (ondrain2)
                ondrain2();
            };
            var clear = function() {
              self2._writable.removeListener("drain", ondrain);
              unend();
            };
            if (this._unwrite)
              process.nextTick(ondrain);
            this._writable = writable;
            this._writable.on("drain", ondrain);
            this._unwrite = clear;
            this.uncork();
          };
          Duplexify.prototype.setReadable = function(readable) {
            if (this._unread)
              this._unread();
            if (this.destroyed) {
              if (readable && readable.destroy)
                readable.destroy();
              return;
            }
            if (readable === null || readable === false) {
              this.push(null);
              this.resume();
              return;
            }
            var self2 = this;
            var unend = eos(readable, { writable: false, readable: true }, destroyer(this));
            var onreadable = function() {
              self2._forward();
            };
            var onend = function() {
              self2.push(null);
            };
            var clear = function() {
              self2._readable2.removeListener("readable", onreadable);
              self2._readable2.removeListener("end", onend);
              unend();
            };
            this._drained = true;
            this._readable = readable;
            this._readable2 = readable._readableState ? readable : toStreams2(readable);
            this._readable2.on("readable", onreadable);
            this._readable2.on("end", onend);
            this._unread = clear;
            this._forward();
          };
          Duplexify.prototype._read = function() {
            this._drained = true;
            this._forward();
          };
          Duplexify.prototype._forward = function() {
            if (this._forwarding || !this._readable2 || !this._drained)
              return;
            this._forwarding = true;
            var data;
            while (this._drained && (data = shift(this._readable2)) !== null) {
              if (this.destroyed)
                continue;
              this._drained = this.push(data);
            }
            this._forwarding = false;
          };
          Duplexify.prototype.destroy = function(err) {
            if (this.destroyed)
              return;
            this.destroyed = true;
            var self2 = this;
            process.nextTick(function() {
              self2._destroy(err);
            });
          };
          Duplexify.prototype._destroy = function(err) {
            if (err) {
              var ondrain = this._ondrain;
              this._ondrain = null;
              if (ondrain)
                ondrain(err);
              else
                this.emit("error", err);
            }
            if (this._forwardDestroy) {
              if (this._readable && this._readable.destroy)
                this._readable.destroy();
              if (this._writable && this._writable.destroy)
                this._writable.destroy();
            }
            this.emit("close");
          };
          Duplexify.prototype._write = function(data, enc, cb) {
            if (this.destroyed)
              return cb();
            if (this._corked)
              return onuncork(this, this._write.bind(this, data, enc, cb));
            if (data === SIGNAL_FLUSH)
              return this._finish(cb);
            if (!this._writable)
              return cb();
            if (this._writable.write(data) === false)
              this._ondrain = cb;
            else
              cb();
          };
          Duplexify.prototype._finish = function(cb) {
            var self2 = this;
            this.emit("preend");
            onuncork(this, function() {
              end(self2._forwardEnd && self2._writable, function() {
                if (self2._writableState.prefinished === false)
                  self2._writableState.prefinished = true;
                self2.emit("prefinish");
                onuncork(self2, cb);
              });
            });
          };
          Duplexify.prototype.end = function(data, enc, cb) {
            if (typeof data === "function")
              return this.end(null, null, data);
            if (typeof enc === "function")
              return this.end(data, null, enc);
            this._ended = true;
            if (data)
              this.write(data);
            if (!this._writableState.ending)
              this.write(SIGNAL_FLUSH);
            return stream.Writable.prototype.end.call(this, cb);
          };
          module3.exports = Duplexify;
        }).call(this, require2("_process"), require2("buffer").Buffer);
      }, { "_process": 92, "buffer": 12, "end-of-stream": 18, "inherits": 80, "readable-stream": 108, "stream-shift": 111 }], 18: [function(require2, module3, exports3) {
        var once = require2("once");
        var noop = function() {
        };
        var isRequest = function(stream) {
          return stream.setHeader && typeof stream.abort === "function";
        };
        var isChildProcess = function(stream) {
          return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3;
        };
        var eos = function(stream, opts, callback) {
          if (typeof opts === "function")
            return eos(stream, null, opts);
          if (!opts)
            opts = {};
          callback = once(callback || noop);
          var ws = stream._writableState;
          var rs = stream._readableState;
          var readable = opts.readable || opts.readable !== false && stream.readable;
          var writable = opts.writable || opts.writable !== false && stream.writable;
          var onlegacyfinish = function() {
            if (!stream.writable)
              onfinish();
          };
          var onfinish = function() {
            writable = false;
            if (!readable)
              callback.call(stream);
          };
          var onend = function() {
            readable = false;
            if (!writable)
              callback.call(stream);
          };
          var onexit = function(exitCode) {
            callback.call(stream, exitCode ? new Error("exited with error code: " + exitCode) : null);
          };
          var onerror = function(err) {
            callback.call(stream, err);
          };
          var onclose = function() {
            if (readable && !(rs && rs.ended))
              return callback.call(stream, new Error("premature close"));
            if (writable && !(ws && ws.ended))
              return callback.call(stream, new Error("premature close"));
          };
          var onrequest = function() {
            stream.req.on("finish", onfinish);
          };
          if (isRequest(stream)) {
            stream.on("complete", onfinish);
            stream.on("abort", onclose);
            if (stream.req)
              onrequest();
            else
              stream.on("request", onrequest);
          } else if (writable && !ws) {
            stream.on("end", onlegacyfinish);
            stream.on("close", onlegacyfinish);
          }
          if (isChildProcess(stream))
            stream.on("exit", onexit);
          stream.on("end", onend);
          stream.on("finish", onfinish);
          if (opts.error !== false)
            stream.on("error", onerror);
          stream.on("close", onclose);
          return function() {
            stream.removeListener("complete", onfinish);
            stream.removeListener("abort", onclose);
            stream.removeListener("request", onrequest);
            if (stream.req)
              stream.req.removeListener("finish", onfinish);
            stream.removeListener("end", onlegacyfinish);
            stream.removeListener("close", onlegacyfinish);
            stream.removeListener("finish", onfinish);
            stream.removeListener("exit", onexit);
            stream.removeListener("end", onend);
            stream.removeListener("error", onerror);
            stream.removeListener("close", onclose);
          };
        };
        module3.exports = eos;
      }, { "once": 90 }], 19: [function(require2, module3, exports3) {
        var value = require2("../../object/valid-value");
        module3.exports = function() {
          value(this).length = 0;
          return this;
        };
      }, { "../../object/valid-value": 55 }], 20: [function(require2, module3, exports3) {
        var numberIsNaN = require2("../../number/is-nan"), toPosInt = require2("../../number/to-pos-integer"), value = require2("../../object/valid-value"), indexOf = Array.prototype.indexOf, objHasOwnProperty = Object.prototype.hasOwnProperty, abs = Math.abs, floor = Math.floor;
        module3.exports = function(searchElement) {
          var i, length, fromIndex, val;
          if (!numberIsNaN(searchElement))
            return indexOf.apply(this, arguments);
          length = toPosInt(value(this).length);
          fromIndex = arguments[1];
          if (isNaN(fromIndex))
            fromIndex = 0;
          else if (fromIndex >= 0)
            fromIndex = floor(fromIndex);
          else
            fromIndex = toPosInt(this.length) - floor(abs(fromIndex));
          for (i = fromIndex; i < length; ++i) {
            if (objHasOwnProperty.call(this, i)) {
              val = this[i];
              if (numberIsNaN(val))
                return i;
            }
          }
          return -1;
        };
      }, { "../../number/is-nan": 30, "../../number/to-pos-integer": 34, "../../object/valid-value": 55 }], 21: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Array.from : require2("./shim");
      }, { "./is-implemented": 22, "./shim": 23 }], 22: [function(require2, module3, exports3) {
        module3.exports = function() {
          var from = Array.from, arr, result;
          if (typeof from !== "function")
            return false;
          arr = ["raz", "dwa"];
          result = from(arr);
          return Boolean(result && result !== arr && result[1] === "dwa");
        };
      }, {}], 23: [function(require2, module3, exports3) {
        var iteratorSymbol = require2("es6-symbol").iterator, isArguments = require2("../../function/is-arguments"), isFunction = require2("../../function/is-function"), toPosInt = require2("../../number/to-pos-integer"), callable = require2("../../object/valid-callable"), validValue = require2("../../object/valid-value"), isValue = require2("../../object/is-value"), isString = require2("../../string/is-string"), isArray = Array.isArray, call = Function.prototype.call, desc = { configurable: true, enumerable: true, writable: true, value: null }, defineProperty = Object.defineProperty;
        module3.exports = function(arrayLike) {
          var mapFn = arguments[1], thisArg = arguments[2], Context, i, j, arr, length, code, iterator, result, getIterator, value;
          arrayLike = Object(validValue(arrayLike));
          if (isValue(mapFn))
            callable(mapFn);
          if (!this || this === Array || !isFunction(this)) {
            if (!mapFn) {
              if (isArguments(arrayLike)) {
                length = arrayLike.length;
                if (length !== 1)
                  return Array.apply(null, arrayLike);
                arr = new Array(1);
                arr[0] = arrayLike[0];
                return arr;
              }
              if (isArray(arrayLike)) {
                arr = new Array(length = arrayLike.length);
                for (i = 0; i < length; ++i)
                  arr[i] = arrayLike[i];
                return arr;
              }
            }
            arr = [];
          } else {
            Context = this;
          }
          if (!isArray(arrayLike)) {
            if ((getIterator = arrayLike[iteratorSymbol]) !== void 0) {
              iterator = callable(getIterator).call(arrayLike);
              if (Context)
                arr = new Context();
              result = iterator.next();
              i = 0;
              while (!result.done) {
                value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
                if (Context) {
                  desc.value = value;
                  defineProperty(arr, i, desc);
                } else {
                  arr[i] = value;
                }
                result = iterator.next();
                ++i;
              }
              length = i;
            } else if (isString(arrayLike)) {
              length = arrayLike.length;
              if (Context)
                arr = new Context();
              for (i = 0, j = 0; i < length; ++i) {
                value = arrayLike[i];
                if (i + 1 < length) {
                  code = value.charCodeAt(0);
                  if (code >= 55296 && code <= 56319)
                    value += arrayLike[++i];
                }
                value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
                if (Context) {
                  desc.value = value;
                  defineProperty(arr, j, desc);
                } else {
                  arr[j] = value;
                }
                ++j;
              }
              length = j;
            }
          }
          if (length === void 0) {
            length = toPosInt(arrayLike.length);
            if (Context)
              arr = new Context(length);
            for (i = 0; i < length; ++i) {
              value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
              if (Context) {
                desc.value = value;
                defineProperty(arr, i, desc);
              } else {
                arr[i] = value;
              }
            }
          }
          if (Context) {
            desc.value = null;
            arr.length = length;
          }
          return arr;
        };
      }, { "../../function/is-arguments": 24, "../../function/is-function": 25, "../../number/to-pos-integer": 34, "../../object/is-value": 44, "../../object/valid-callable": 54, "../../object/valid-value": 55, "../../string/is-string": 59, "es6-symbol": 73 }], 24: [function(require2, module3, exports3) {
        var objToString = Object.prototype.toString, id = objToString.call(
          /* @__PURE__ */ function() {
            return arguments;
          }()
        );
        module3.exports = function(value) {
          return objToString.call(value) === id;
        };
      }, {}], 25: [function(require2, module3, exports3) {
        var objToString = Object.prototype.toString, id = objToString.call(require2("./noop"));
        module3.exports = function(value) {
          return typeof value === "function" && objToString.call(value) === id;
        };
      }, { "./noop": 26 }], 26: [function(require2, module3, exports3) {
        module3.exports = function() {
        };
      }, {}], 27: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Math.sign : require2("./shim");
      }, { "./is-implemented": 28, "./shim": 29 }], 28: [function(require2, module3, exports3) {
        module3.exports = function() {
          var sign = Math.sign;
          if (typeof sign !== "function")
            return false;
          return sign(10) === 1 && sign(-20) === -1;
        };
      }, {}], 29: [function(require2, module3, exports3) {
        module3.exports = function(value) {
          value = Number(value);
          if (isNaN(value) || value === 0)
            return value;
          return value > 0 ? 1 : -1;
        };
      }, {}], 30: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Number.isNaN : require2("./shim");
      }, { "./is-implemented": 31, "./shim": 32 }], 31: [function(require2, module3, exports3) {
        module3.exports = function() {
          var numberIsNaN = Number.isNaN;
          if (typeof numberIsNaN !== "function")
            return false;
          return !numberIsNaN({}) && numberIsNaN(NaN) && !numberIsNaN(34);
        };
      }, {}], 32: [function(require2, module3, exports3) {
        module3.exports = function(value) {
          return value !== value;
        };
      }, {}], 33: [function(require2, module3, exports3) {
        var sign = require2("../math/sign"), abs = Math.abs, floor = Math.floor;
        module3.exports = function(value) {
          if (isNaN(value))
            return 0;
          value = Number(value);
          if (value === 0 || !isFinite(value))
            return value;
          return sign(value) * floor(abs(value));
        };
      }, { "../math/sign": 27 }], 34: [function(require2, module3, exports3) {
        var toInteger = require2("./to-integer"), max = Math.max;
        module3.exports = function(value) {
          return max(0, toInteger(value));
        };
      }, { "./to-integer": 33 }], 35: [function(require2, module3, exports3) {
        var callable = require2("./valid-callable"), value = require2("./valid-value"), bind = Function.prototype.bind, call = Function.prototype.call, keys = Object.keys, objPropertyIsEnumerable = Object.prototype.propertyIsEnumerable;
        module3.exports = function(method, defVal) {
          return function(obj, cb) {
            var list, thisArg = arguments[2], compareFn = arguments[3];
            obj = Object(value(obj));
            callable(cb);
            list = keys(obj);
            if (compareFn) {
              list.sort(typeof compareFn === "function" ? bind.call(compareFn, obj) : void 0);
            }
            if (typeof method !== "function")
              method = list[method];
            return call.call(method, list, function(key, index) {
              if (!objPropertyIsEnumerable.call(obj, key))
                return defVal;
              return call.call(cb, thisArg, obj[key], key, obj, index);
            });
          };
        };
      }, { "./valid-callable": 54, "./valid-value": 55 }], 36: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Object.assign : require2("./shim");
      }, { "./is-implemented": 37, "./shim": 38 }], 37: [function(require2, module3, exports3) {
        module3.exports = function() {
          var assign = Object.assign, obj;
          if (typeof assign !== "function")
            return false;
          obj = { foo: "raz" };
          assign(obj, { bar: "dwa" }, { trzy: "trzy" });
          return obj.foo + obj.bar + obj.trzy === "razdwatrzy";
        };
      }, {}], 38: [function(require2, module3, exports3) {
        var keys = require2("../keys"), value = require2("../valid-value"), max = Math.max;
        module3.exports = function(dest, src) {
          var error, i, length = max(arguments.length, 2), assign;
          dest = Object(value(dest));
          assign = function(key) {
            try {
              dest[key] = src[key];
            } catch (e) {
              if (!error)
                error = e;
            }
          };
          for (i = 1; i < length; ++i) {
            src = arguments[i];
            keys(src).forEach(assign);
          }
          if (error !== void 0)
            throw error;
          return dest;
        };
      }, { "../keys": 45, "../valid-value": 55 }], 39: [function(require2, module3, exports3) {
        var aFrom = require2("../array/from"), assign = require2("./assign"), value = require2("./valid-value");
        module3.exports = function(obj) {
          var copy = Object(value(obj)), propertyNames = arguments[1], options = Object(arguments[2]);
          if (copy !== obj && !propertyNames)
            return copy;
          var result = {};
          if (propertyNames) {
            aFrom(propertyNames, function(propertyName) {
              if (options.ensure || propertyName in obj)
                result[propertyName] = obj[propertyName];
            });
          } else {
            assign(result, obj);
          }
          return result;
        };
      }, { "../array/from": 21, "./assign": 36, "./valid-value": 55 }], 40: [function(require2, module3, exports3) {
        var create = Object.create, shim;
        if (!require2("./set-prototype-of/is-implemented")()) {
          shim = require2("./set-prototype-of/shim");
        }
        module3.exports = function() {
          var nullObject, polyProps, desc;
          if (!shim)
            return create;
          if (shim.level !== 1)
            return create;
          nullObject = {};
          polyProps = {};
          desc = {
            configurable: false,
            enumerable: false,
            writable: true,
            value: void 0
          };
          Object.getOwnPropertyNames(Object.prototype).forEach(function(name) {
            if (name === "__proto__") {
              polyProps[name] = {
                configurable: true,
                enumerable: false,
                writable: true,
                value: void 0
              };
              return;
            }
            polyProps[name] = desc;
          });
          Object.defineProperties(nullObject, polyProps);
          Object.defineProperty(shim, "nullPolyfill", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: nullObject
          });
          return function(prototype, props) {
            return create(prototype === null ? nullObject : prototype, props);
          };
        }();
      }, { "./set-prototype-of/is-implemented": 52, "./set-prototype-of/shim": 53 }], 41: [function(require2, module3, exports3) {
        module3.exports = require2("./_iterate")("forEach");
      }, { "./_iterate": 35 }], 42: [function(require2, module3, exports3) {
        module3.exports = function(obj) {
          return typeof obj === "function";
        };
      }, {}], 43: [function(require2, module3, exports3) {
        var isValue = require2("./is-value");
        var map = { function: true, object: true };
        module3.exports = function(value) {
          return isValue(value) && map[typeof value] || false;
        };
      }, { "./is-value": 44 }], 44: [function(require2, module3, exports3) {
        var _undefined = require2("../function/noop")();
        module3.exports = function(val) {
          return val !== _undefined && val !== null;
        };
      }, { "../function/noop": 26 }], 45: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Object.keys : require2("./shim");
      }, { "./is-implemented": 46, "./shim": 47 }], 46: [function(require2, module3, exports3) {
        module3.exports = function() {
          try {
            Object.keys("primitive");
            return true;
          } catch (e) {
            return false;
          }
        };
      }, {}], 47: [function(require2, module3, exports3) {
        var isValue = require2("../is-value");
        var keys = Object.keys;
        module3.exports = function(object) {
          return keys(isValue(object) ? Object(object) : object);
        };
      }, { "../is-value": 44 }], 48: [function(require2, module3, exports3) {
        var callable = require2("./valid-callable"), forEach = require2("./for-each"), call = Function.prototype.call;
        module3.exports = function(obj, cb) {
          var result = {}, thisArg = arguments[2];
          callable(cb);
          forEach(obj, function(value, key, targetObj, index) {
            result[key] = call.call(cb, thisArg, value, key, targetObj, index);
          });
          return result;
        };
      }, { "./for-each": 41, "./valid-callable": 54 }], 49: [function(require2, module3, exports3) {
        var isValue = require2("./is-value");
        var forEach = Array.prototype.forEach, create = Object.create;
        var process = function(src, obj) {
          var key;
          for (key in src)
            obj[key] = src[key];
        };
        module3.exports = function(opts1) {
          var result = create(null);
          forEach.call(arguments, function(options) {
            if (!isValue(options))
              return;
            process(Object(options), result);
          });
          return result;
        };
      }, { "./is-value": 44 }], 50: [function(require2, module3, exports3) {
        var forEach = Array.prototype.forEach, create = Object.create;
        module3.exports = function(arg) {
          var set = create(null);
          forEach.call(arguments, function(name) {
            set[name] = true;
          });
          return set;
        };
      }, {}], 51: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Object.setPrototypeOf : require2("./shim");
      }, { "./is-implemented": 52, "./shim": 53 }], 52: [function(require2, module3, exports3) {
        var create = Object.create, getPrototypeOf = Object.getPrototypeOf, plainObject = {};
        module3.exports = function() {
          var setPrototypeOf = Object.setPrototypeOf, customCreate = arguments[0] || create;
          if (typeof setPrototypeOf !== "function")
            return false;
          return getPrototypeOf(setPrototypeOf(customCreate(null), plainObject)) === plainObject;
        };
      }, {}], 53: [function(require2, module3, exports3) {
        var isObject = require2("../is-object"), value = require2("../valid-value"), objIsPrototypeOf = Object.prototype.isPrototypeOf, defineProperty = Object.defineProperty, nullDesc = {
          configurable: true,
          enumerable: false,
          writable: true,
          value: void 0
        }, validate;
        validate = function(obj, prototype) {
          value(obj);
          if (prototype === null || isObject(prototype))
            return obj;
          throw new TypeError("Prototype must be null or an object");
        };
        module3.exports = function(status) {
          var fn, set;
          if (!status)
            return null;
          if (status.level === 2) {
            if (status.set) {
              set = status.set;
              fn = function(obj, prototype) {
                set.call(validate(obj, prototype), prototype);
                return obj;
              };
            } else {
              fn = function(obj, prototype) {
                validate(obj, prototype).__proto__ = prototype;
                return obj;
              };
            }
          } else {
            fn = function self2(obj, prototype) {
              var isNullBase;
              validate(obj, prototype);
              isNullBase = objIsPrototypeOf.call(self2.nullPolyfill, obj);
              if (isNullBase)
                delete self2.nullPolyfill.__proto__;
              if (prototype === null)
                prototype = self2.nullPolyfill;
              obj.__proto__ = prototype;
              if (isNullBase)
                defineProperty(self2.nullPolyfill, "__proto__", nullDesc);
              return obj;
            };
          }
          return Object.defineProperty(fn, "level", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: status.level
          });
        }(
          function() {
            var tmpObj1 = /* @__PURE__ */ Object.create(null), tmpObj2 = {}, set, desc = Object.getOwnPropertyDescriptor(Object.prototype, "__proto__");
            if (desc) {
              try {
                set = desc.set;
                set.call(tmpObj1, tmpObj2);
              } catch (ignore) {
              }
              if (Object.getPrototypeOf(tmpObj1) === tmpObj2)
                return { set, level: 2 };
            }
            tmpObj1.__proto__ = tmpObj2;
            if (Object.getPrototypeOf(tmpObj1) === tmpObj2)
              return { level: 2 };
            tmpObj1 = {};
            tmpObj1.__proto__ = tmpObj2;
            if (Object.getPrototypeOf(tmpObj1) === tmpObj2)
              return { level: 1 };
            return false;
          }()
        );
        require2("../create");
      }, { "../create": 40, "../is-object": 43, "../valid-value": 55 }], 54: [function(require2, module3, exports3) {
        module3.exports = function(fn) {
          if (typeof fn !== "function")
            throw new TypeError(fn + " is not a function");
          return fn;
        };
      }, {}], 55: [function(require2, module3, exports3) {
        var isValue = require2("./is-value");
        module3.exports = function(value) {
          if (!isValue(value))
            throw new TypeError("Cannot use null or undefined");
          return value;
        };
      }, { "./is-value": 44 }], 56: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? String.prototype.contains : require2("./shim");
      }, { "./is-implemented": 57, "./shim": 58 }], 57: [function(require2, module3, exports3) {
        var str = "razdwatrzy";
        module3.exports = function() {
          if (typeof str.contains !== "function")
            return false;
          return str.contains("dwa") === true && str.contains("foo") === false;
        };
      }, {}], 58: [function(require2, module3, exports3) {
        var indexOf = String.prototype.indexOf;
        module3.exports = function(searchString) {
          return indexOf.call(this, searchString, arguments[1]) > -1;
        };
      }, {}], 59: [function(require2, module3, exports3) {
        var objToString = Object.prototype.toString, id = objToString.call("");
        module3.exports = function(value) {
          return typeof value === "string" || value && typeof value === "object" && (value instanceof String || objToString.call(value) === id) || false;
        };
      }, {}], 60: [function(require2, module3, exports3) {
        var setPrototypeOf = require2("es5-ext/object/set-prototype-of"), contains = require2("es5-ext/string/#/contains"), d = require2("d"), Symbol2 = require2("es6-symbol"), Iterator = require2("./");
        var defineProperty = Object.defineProperty, ArrayIterator;
        ArrayIterator = module3.exports = function(arr, kind) {
          if (!(this instanceof ArrayIterator))
            throw new TypeError("Constructor requires 'new'");
          Iterator.call(this, arr);
          if (!kind)
            kind = "value";
          else if (contains.call(kind, "key+value"))
            kind = "key+value";
          else if (contains.call(kind, "key"))
            kind = "key";
          else
            kind = "value";
          defineProperty(this, "__kind__", d("", kind));
        };
        if (setPrototypeOf)
          setPrototypeOf(ArrayIterator, Iterator);
        delete ArrayIterator.prototype.constructor;
        ArrayIterator.prototype = Object.create(Iterator.prototype, {
          _resolve: d(function(i) {
            if (this.__kind__ === "value")
              return this.__list__[i];
            if (this.__kind__ === "key+value")
              return [i, this.__list__[i]];
            return i;
          })
        });
        defineProperty(ArrayIterator.prototype, Symbol2.toStringTag, d("c", "Array Iterator"));
      }, { "./": 63, "d": 16, "es5-ext/object/set-prototype-of": 51, "es5-ext/string/#/contains": 56, "es6-symbol": 73 }], 61: [function(require2, module3, exports3) {
        var isArguments = require2("es5-ext/function/is-arguments"), callable = require2("es5-ext/object/valid-callable"), isString = require2("es5-ext/string/is-string"), get = require2("./get");
        var isArray = Array.isArray, call = Function.prototype.call, some = Array.prototype.some;
        module3.exports = function(iterable, cb) {
          var mode, thisArg = arguments[2], result, doBreak, broken, i, length, char, code;
          if (isArray(iterable) || isArguments(iterable))
            mode = "array";
          else if (isString(iterable))
            mode = "string";
          else
            iterable = get(iterable);
          callable(cb);
          doBreak = function() {
            broken = true;
          };
          if (mode === "array") {
            some.call(iterable, function(value) {
              call.call(cb, thisArg, value, doBreak);
              return broken;
            });
            return;
          }
          if (mode === "string") {
            length = iterable.length;
            for (i = 0; i < length; ++i) {
              char = iterable[i];
              if (i + 1 < length) {
                code = char.charCodeAt(0);
                if (code >= 55296 && code <= 56319)
                  char += iterable[++i];
              }
              call.call(cb, thisArg, char, doBreak);
              if (broken)
                break;
            }
            return;
          }
          result = iterable.next();
          while (!result.done) {
            call.call(cb, thisArg, result.value, doBreak);
            if (broken)
              return;
            result = iterable.next();
          }
        };
      }, { "./get": 62, "es5-ext/function/is-arguments": 24, "es5-ext/object/valid-callable": 54, "es5-ext/string/is-string": 59 }], 62: [function(require2, module3, exports3) {
        var isArguments = require2("es5-ext/function/is-arguments"), isString = require2("es5-ext/string/is-string"), ArrayIterator = require2("./array"), StringIterator = require2("./string"), iterable = require2("./valid-iterable"), iteratorSymbol = require2("es6-symbol").iterator;
        module3.exports = function(obj) {
          if (typeof iterable(obj)[iteratorSymbol] === "function")
            return obj[iteratorSymbol]();
          if (isArguments(obj))
            return new ArrayIterator(obj);
          if (isString(obj))
            return new StringIterator(obj);
          return new ArrayIterator(obj);
        };
      }, { "./array": 60, "./string": 65, "./valid-iterable": 66, "es5-ext/function/is-arguments": 24, "es5-ext/string/is-string": 59, "es6-symbol": 73 }], 63: [function(require2, module3, exports3) {
        var clear = require2("es5-ext/array/#/clear"), assign = require2("es5-ext/object/assign"), callable = require2("es5-ext/object/valid-callable"), value = require2("es5-ext/object/valid-value"), d = require2("d"), autoBind = require2("d/auto-bind"), Symbol2 = require2("es6-symbol");
        var defineProperty = Object.defineProperty, defineProperties = Object.defineProperties, Iterator;
        module3.exports = Iterator = function(list, context) {
          if (!(this instanceof Iterator))
            throw new TypeError("Constructor requires 'new'");
          defineProperties(this, {
            __list__: d("w", value(list)),
            __context__: d("w", context),
            __nextIndex__: d("w", 0)
          });
          if (!context)
            return;
          callable(context.on);
          context.on("_add", this._onAdd);
          context.on("_delete", this._onDelete);
          context.on("_clear", this._onClear);
        };
        delete Iterator.prototype.constructor;
        defineProperties(
          Iterator.prototype,
          assign(
            {
              _next: d(function() {
                var i;
                if (!this.__list__)
                  return void 0;
                if (this.__redo__) {
                  i = this.__redo__.shift();
                  if (i !== void 0)
                    return i;
                }
                if (this.__nextIndex__ < this.__list__.length)
                  return this.__nextIndex__++;
                this._unBind();
                return void 0;
              }),
              next: d(function() {
                return this._createResult(this._next());
              }),
              _createResult: d(function(i) {
                if (i === void 0)
                  return { done: true, value: void 0 };
                return { done: false, value: this._resolve(i) };
              }),
              _resolve: d(function(i) {
                return this.__list__[i];
              }),
              _unBind: d(function() {
                this.__list__ = null;
                delete this.__redo__;
                if (!this.__context__)
                  return;
                this.__context__.off("_add", this._onAdd);
                this.__context__.off("_delete", this._onDelete);
                this.__context__.off("_clear", this._onClear);
                this.__context__ = null;
              }),
              toString: d(function() {
                return "[object " + (this[Symbol2.toStringTag] || "Object") + "]";
              })
            },
            autoBind({
              _onAdd: d(function(index) {
                if (index >= this.__nextIndex__)
                  return;
                ++this.__nextIndex__;
                if (!this.__redo__) {
                  defineProperty(this, "__redo__", d("c", [index]));
                  return;
                }
                this.__redo__.forEach(function(redo, i) {
                  if (redo >= index)
                    this.__redo__[i] = ++redo;
                }, this);
                this.__redo__.push(index);
              }),
              _onDelete: d(function(index) {
                var i;
                if (index >= this.__nextIndex__)
                  return;
                --this.__nextIndex__;
                if (!this.__redo__)
                  return;
                i = this.__redo__.indexOf(index);
                if (i !== -1)
                  this.__redo__.splice(i, 1);
                this.__redo__.forEach(function(redo, j) {
                  if (redo > index)
                    this.__redo__[j] = --redo;
                }, this);
              }),
              _onClear: d(function() {
                if (this.__redo__)
                  clear.call(this.__redo__);
                this.__nextIndex__ = 0;
              })
            })
          )
        );
        defineProperty(
          Iterator.prototype,
          Symbol2.iterator,
          d(function() {
            return this;
          })
        );
      }, { "d": 16, "d/auto-bind": 15, "es5-ext/array/#/clear": 19, "es5-ext/object/assign": 36, "es5-ext/object/valid-callable": 54, "es5-ext/object/valid-value": 55, "es6-symbol": 73 }], 64: [function(require2, module3, exports3) {
        var isArguments = require2("es5-ext/function/is-arguments"), isValue = require2("es5-ext/object/is-value"), isString = require2("es5-ext/string/is-string");
        var iteratorSymbol = require2("es6-symbol").iterator, isArray = Array.isArray;
        module3.exports = function(value) {
          if (!isValue(value))
            return false;
          if (isArray(value))
            return true;
          if (isString(value))
            return true;
          if (isArguments(value))
            return true;
          return typeof value[iteratorSymbol] === "function";
        };
      }, { "es5-ext/function/is-arguments": 24, "es5-ext/object/is-value": 44, "es5-ext/string/is-string": 59, "es6-symbol": 73 }], 65: [function(require2, module3, exports3) {
        var setPrototypeOf = require2("es5-ext/object/set-prototype-of"), d = require2("d"), Symbol2 = require2("es6-symbol"), Iterator = require2("./");
        var defineProperty = Object.defineProperty, StringIterator;
        StringIterator = module3.exports = function(str) {
          if (!(this instanceof StringIterator))
            throw new TypeError("Constructor requires 'new'");
          str = String(str);
          Iterator.call(this, str);
          defineProperty(this, "__length__", d("", str.length));
        };
        if (setPrototypeOf)
          setPrototypeOf(StringIterator, Iterator);
        delete StringIterator.prototype.constructor;
        StringIterator.prototype = Object.create(Iterator.prototype, {
          _next: d(function() {
            if (!this.__list__)
              return void 0;
            if (this.__nextIndex__ < this.__length__)
              return this.__nextIndex__++;
            this._unBind();
            return void 0;
          }),
          _resolve: d(function(i) {
            var char = this.__list__[i], code;
            if (this.__nextIndex__ === this.__length__)
              return char;
            code = char.charCodeAt(0);
            if (code >= 55296 && code <= 56319)
              return char + this.__list__[this.__nextIndex__++];
            return char;
          })
        });
        defineProperty(StringIterator.prototype, Symbol2.toStringTag, d("c", "String Iterator"));
      }, { "./": 63, "d": 16, "es5-ext/object/set-prototype-of": 51, "es6-symbol": 73 }], 66: [function(require2, module3, exports3) {
        var isIterable = require2("./is-iterable");
        module3.exports = function(value) {
          if (!isIterable(value))
            throw new TypeError(value + " is not iterable");
          return value;
        };
      }, { "./is-iterable": 64 }], 67: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Map : require2("./polyfill");
      }, { "./is-implemented": 68, "./polyfill": 72 }], 68: [function(require2, module3, exports3) {
        module3.exports = function() {
          var map, iterator, result;
          if (typeof Map !== "function")
            return false;
          try {
            map = /* @__PURE__ */ new Map([["raz", "one"], ["dwa", "two"], ["trzy", "three"]]);
          } catch (e) {
            return false;
          }
          if (String(map) !== "[object Map]")
            return false;
          if (map.size !== 3)
            return false;
          if (typeof map.clear !== "function")
            return false;
          if (typeof map.delete !== "function")
            return false;
          if (typeof map.entries !== "function")
            return false;
          if (typeof map.forEach !== "function")
            return false;
          if (typeof map.get !== "function")
            return false;
          if (typeof map.has !== "function")
            return false;
          if (typeof map.keys !== "function")
            return false;
          if (typeof map.set !== "function")
            return false;
          if (typeof map.values !== "function")
            return false;
          iterator = map.entries();
          result = iterator.next();
          if (result.done !== false)
            return false;
          if (!result.value)
            return false;
          if (result.value[0] !== "raz")
            return false;
          if (result.value[1] !== "one")
            return false;
          return true;
        };
      }, {}], 69: [function(require2, module3, exports3) {
        module3.exports = function() {
          if (typeof Map === "undefined")
            return false;
          return Object.prototype.toString.call(/* @__PURE__ */ new Map()) === "[object Map]";
        }();
      }, {}], 70: [function(require2, module3, exports3) {
        module3.exports = require2("es5-ext/object/primitive-set")(
          "key",
          "value",
          "key+value"
        );
      }, { "es5-ext/object/primitive-set": 50 }], 71: [function(require2, module3, exports3) {
        var setPrototypeOf = require2("es5-ext/object/set-prototype-of"), d = require2("d"), Iterator = require2("es6-iterator"), toStringTagSymbol = require2("es6-symbol").toStringTag, kinds = require2("./iterator-kinds"), defineProperties = Object.defineProperties, unBind = Iterator.prototype._unBind, MapIterator;
        MapIterator = module3.exports = function(map, kind) {
          if (!(this instanceof MapIterator))
            return new MapIterator(map, kind);
          Iterator.call(this, map.__mapKeysData__, map);
          if (!kind || !kinds[kind])
            kind = "key+value";
          defineProperties(this, {
            __kind__: d("", kind),
            __values__: d("w", map.__mapValuesData__)
          });
        };
        if (setPrototypeOf)
          setPrototypeOf(MapIterator, Iterator);
        MapIterator.prototype = Object.create(Iterator.prototype, {
          constructor: d(MapIterator),
          _resolve: d(function(i) {
            if (this.__kind__ === "value")
              return this.__values__[i];
            if (this.__kind__ === "key")
              return this.__list__[i];
            return [this.__list__[i], this.__values__[i]];
          }),
          _unBind: d(function() {
            this.__values__ = null;
            unBind.call(this);
          }),
          toString: d(function() {
            return "[object Map Iterator]";
          })
        });
        Object.defineProperty(
          MapIterator.prototype,
          toStringTagSymbol,
          d("c", "Map Iterator")
        );
      }, { "./iterator-kinds": 70, "d": 16, "es5-ext/object/set-prototype-of": 51, "es6-iterator": 63, "es6-symbol": 73 }], 72: [function(require2, module3, exports3) {
        var clear = require2("es5-ext/array/#/clear"), eIndexOf = require2("es5-ext/array/#/e-index-of"), setPrototypeOf = require2("es5-ext/object/set-prototype-of"), callable = require2("es5-ext/object/valid-callable"), validValue = require2("es5-ext/object/valid-value"), d = require2("d"), ee = require2("event-emitter"), Symbol2 = require2("es6-symbol"), iterator = require2("es6-iterator/valid-iterable"), forOf = require2("es6-iterator/for-of"), Iterator = require2("./lib/iterator"), isNative = require2("./is-native-implemented"), call = Function.prototype.call, defineProperties = Object.defineProperties, getPrototypeOf = Object.getPrototypeOf, MapPoly;
        module3.exports = MapPoly = function() {
          var iterable = arguments[0], keys, values, self2;
          if (!(this instanceof MapPoly))
            throw new TypeError("Constructor requires 'new'");
          if (isNative && setPrototypeOf && Map !== MapPoly) {
            self2 = setPrototypeOf(/* @__PURE__ */ new Map(), getPrototypeOf(this));
          } else {
            self2 = this;
          }
          if (iterable != null)
            iterator(iterable);
          defineProperties(self2, {
            __mapKeysData__: d("c", keys = []),
            __mapValuesData__: d("c", values = [])
          });
          if (!iterable)
            return self2;
          forOf(iterable, function(value) {
            var key = validValue(value)[0];
            value = value[1];
            if (eIndexOf.call(keys, key) !== -1)
              return;
            keys.push(key);
            values.push(value);
          }, self2);
          return self2;
        };
        if (isNative) {
          if (setPrototypeOf)
            setPrototypeOf(MapPoly, Map);
          MapPoly.prototype = Object.create(Map.prototype, {
            constructor: d(MapPoly)
          });
        }
        ee(defineProperties(MapPoly.prototype, {
          clear: d(function() {
            if (!this.__mapKeysData__.length)
              return;
            clear.call(this.__mapKeysData__);
            clear.call(this.__mapValuesData__);
            this.emit("_clear");
          }),
          delete: d(function(key) {
            var index = eIndexOf.call(this.__mapKeysData__, key);
            if (index === -1)
              return false;
            this.__mapKeysData__.splice(index, 1);
            this.__mapValuesData__.splice(index, 1);
            this.emit("_delete", index, key);
            return true;
          }),
          entries: d(function() {
            return new Iterator(this, "key+value");
          }),
          forEach: d(function(cb) {
            var thisArg = arguments[1], iterator2, result;
            callable(cb);
            iterator2 = this.entries();
            result = iterator2._next();
            while (result !== void 0) {
              call.call(
                cb,
                thisArg,
                this.__mapValuesData__[result],
                this.__mapKeysData__[result],
                this
              );
              result = iterator2._next();
            }
          }),
          get: d(function(key) {
            var index = eIndexOf.call(this.__mapKeysData__, key);
            if (index === -1)
              return;
            return this.__mapValuesData__[index];
          }),
          has: d(function(key) {
            return eIndexOf.call(this.__mapKeysData__, key) !== -1;
          }),
          keys: d(function() {
            return new Iterator(this, "key");
          }),
          set: d(function(key, value) {
            var index = eIndexOf.call(this.__mapKeysData__, key), emit;
            if (index === -1) {
              index = this.__mapKeysData__.push(key) - 1;
              emit = true;
            }
            this.__mapValuesData__[index] = value;
            if (emit)
              this.emit("_add", index, key);
            return this;
          }),
          size: d.gs(function() {
            return this.__mapKeysData__.length;
          }),
          values: d(function() {
            return new Iterator(this, "value");
          }),
          toString: d(function() {
            return "[object Map]";
          })
        }));
        Object.defineProperty(MapPoly.prototype, Symbol2.iterator, d(function() {
          return this.entries();
        }));
        Object.defineProperty(MapPoly.prototype, Symbol2.toStringTag, d("c", "Map"));
      }, { "./is-native-implemented": 69, "./lib/iterator": 71, "d": 16, "es5-ext/array/#/clear": 19, "es5-ext/array/#/e-index-of": 20, "es5-ext/object/set-prototype-of": 51, "es5-ext/object/valid-callable": 54, "es5-ext/object/valid-value": 55, "es6-iterator/for-of": 61, "es6-iterator/valid-iterable": 66, "es6-symbol": 73, "event-emitter": 78 }], 73: [function(require2, module3, exports3) {
        module3.exports = require2("./is-implemented")() ? Symbol : require2("./polyfill");
      }, { "./is-implemented": 74, "./polyfill": 76 }], 74: [function(require2, module3, exports3) {
        var validTypes = { object: true, symbol: true };
        module3.exports = function() {
          var symbol;
          if (typeof Symbol !== "function")
            return false;
          symbol = Symbol("test symbol");
          try {
            String(symbol);
          } catch (e) {
            return false;
          }
          if (!validTypes[typeof Symbol.iterator])
            return false;
          if (!validTypes[typeof Symbol.toPrimitive])
            return false;
          if (!validTypes[typeof Symbol.toStringTag])
            return false;
          return true;
        };
      }, {}], 75: [function(require2, module3, exports3) {
        module3.exports = function(x) {
          if (!x)
            return false;
          if (typeof x === "symbol")
            return true;
          if (!x.constructor)
            return false;
          if (x.constructor.name !== "Symbol")
            return false;
          return x[x.constructor.toStringTag] === "Symbol";
        };
      }, {}], 76: [function(require2, module3, exports3) {
        var d = require2("d"), validateSymbol = require2("./validate-symbol"), create = Object.create, defineProperties = Object.defineProperties, defineProperty = Object.defineProperty, objPrototype = Object.prototype, NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create(null), isNativeSafe;
        if (typeof Symbol === "function") {
          NativeSymbol = Symbol;
          try {
            String(NativeSymbol());
            isNativeSafe = true;
          } catch (ignore) {
          }
        }
        var generateName = function() {
          var created = create(null);
          return function(desc) {
            var postfix = 0, name, ie11BugWorkaround;
            while (created[desc + (postfix || "")])
              ++postfix;
            desc += postfix || "";
            created[desc] = true;
            name = "@@" + desc;
            defineProperty(objPrototype, name, d.gs(null, function(value) {
              if (ie11BugWorkaround)
                return;
              ie11BugWorkaround = true;
              defineProperty(this, name, d(value));
              ie11BugWorkaround = false;
            }));
            return name;
          };
        }();
        HiddenSymbol = function Symbol2(description) {
          if (this instanceof HiddenSymbol)
            throw new TypeError("Symbol is not a constructor");
          return SymbolPolyfill(description);
        };
        module3.exports = SymbolPolyfill = function Symbol2(description) {
          var symbol;
          if (this instanceof Symbol2)
            throw new TypeError("Symbol is not a constructor");
          if (isNativeSafe)
            return NativeSymbol(description);
          symbol = create(HiddenSymbol.prototype);
          description = description === void 0 ? "" : String(description);
          return defineProperties(symbol, {
            __description__: d("", description),
            __name__: d("", generateName(description))
          });
        };
        defineProperties(SymbolPolyfill, {
          for: d(function(key) {
            if (globalSymbols[key])
              return globalSymbols[key];
            return globalSymbols[key] = SymbolPolyfill(String(key));
          }),
          keyFor: d(function(s) {
            var key;
            validateSymbol(s);
            for (key in globalSymbols)
              if (globalSymbols[key] === s)
                return key;
          }),
          // To ensure proper interoperability with other native functions (e.g. Array.from)
          // fallback to eventual native implementation of given symbol
          hasInstance: d("", NativeSymbol && NativeSymbol.hasInstance || SymbolPolyfill("hasInstance")),
          isConcatSpreadable: d("", NativeSymbol && NativeSymbol.isConcatSpreadable || SymbolPolyfill("isConcatSpreadable")),
          iterator: d("", NativeSymbol && NativeSymbol.iterator || SymbolPolyfill("iterator")),
          match: d("", NativeSymbol && NativeSymbol.match || SymbolPolyfill("match")),
          replace: d("", NativeSymbol && NativeSymbol.replace || SymbolPolyfill("replace")),
          search: d("", NativeSymbol && NativeSymbol.search || SymbolPolyfill("search")),
          species: d("", NativeSymbol && NativeSymbol.species || SymbolPolyfill("species")),
          split: d("", NativeSymbol && NativeSymbol.split || SymbolPolyfill("split")),
          toPrimitive: d("", NativeSymbol && NativeSymbol.toPrimitive || SymbolPolyfill("toPrimitive")),
          toStringTag: d("", NativeSymbol && NativeSymbol.toStringTag || SymbolPolyfill("toStringTag")),
          unscopables: d("", NativeSymbol && NativeSymbol.unscopables || SymbolPolyfill("unscopables"))
        });
        defineProperties(HiddenSymbol.prototype, {
          constructor: d(SymbolPolyfill),
          toString: d("", function() {
            return this.__name__;
          })
        });
        defineProperties(SymbolPolyfill.prototype, {
          toString: d(function() {
            return "Symbol (" + validateSymbol(this).__description__ + ")";
          }),
          valueOf: d(function() {
            return validateSymbol(this);
          })
        });
        defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d("", function() {
          var symbol = validateSymbol(this);
          if (typeof symbol === "symbol")
            return symbol;
          return symbol.toString();
        }));
        defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d("c", "Symbol"));
        defineProperty(
          HiddenSymbol.prototype,
          SymbolPolyfill.toStringTag,
          d("c", SymbolPolyfill.prototype[SymbolPolyfill.toStringTag])
        );
        defineProperty(
          HiddenSymbol.prototype,
          SymbolPolyfill.toPrimitive,
          d("c", SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive])
        );
      }, { "./validate-symbol": 77, "d": 16 }], 77: [function(require2, module3, exports3) {
        var isSymbol = require2("./is-symbol");
        module3.exports = function(value) {
          if (!isSymbol(value))
            throw new TypeError(value + " is not a symbol");
          return value;
        };
      }, { "./is-symbol": 75 }], 78: [function(require2, module3, exports3) {
        var d = require2("d"), callable = require2("es5-ext/object/valid-callable"), apply = Function.prototype.apply, call = Function.prototype.call, create = Object.create, defineProperty = Object.defineProperty, defineProperties = Object.defineProperties, hasOwnProperty = Object.prototype.hasOwnProperty, descriptor = { configurable: true, enumerable: false, writable: true }, on, once, off, emit, methods, descriptors, base;
        on = function(type, listener) {
          var data;
          callable(listener);
          if (!hasOwnProperty.call(this, "__ee__")) {
            data = descriptor.value = create(null);
            defineProperty(this, "__ee__", descriptor);
            descriptor.value = null;
          } else {
            data = this.__ee__;
          }
          if (!data[type])
            data[type] = listener;
          else if (typeof data[type] === "object")
            data[type].push(listener);
          else
            data[type] = [data[type], listener];
          return this;
        };
        once = function(type, listener) {
          var once2, self2;
          callable(listener);
          self2 = this;
          on.call(this, type, once2 = function() {
            off.call(self2, type, once2);
            apply.call(listener, this, arguments);
          });
          once2.__eeOnceListener__ = listener;
          return this;
        };
        off = function(type, listener) {
          var data, listeners, candidate, i;
          callable(listener);
          if (!hasOwnProperty.call(this, "__ee__"))
            return this;
          data = this.__ee__;
          if (!data[type])
            return this;
          listeners = data[type];
          if (typeof listeners === "object") {
            for (i = 0; candidate = listeners[i]; ++i) {
              if (candidate === listener || candidate.__eeOnceListener__ === listener) {
                if (listeners.length === 2)
                  data[type] = listeners[i ? 0 : 1];
                else
                  listeners.splice(i, 1);
              }
            }
          } else {
            if (listeners === listener || listeners.__eeOnceListener__ === listener) {
              delete data[type];
            }
          }
          return this;
        };
        emit = function(type) {
          var i, l, listener, listeners, args;
          if (!hasOwnProperty.call(this, "__ee__"))
            return;
          listeners = this.__ee__[type];
          if (!listeners)
            return;
          if (typeof listeners === "object") {
            l = arguments.length;
            args = new Array(l - 1);
            for (i = 1; i < l; ++i)
              args[i - 1] = arguments[i];
            listeners = listeners.slice();
            for (i = 0; listener = listeners[i]; ++i) {
              apply.call(listener, this, args);
            }
          } else {
            switch (arguments.length) {
              case 1:
                call.call(listeners, this);
                break;
              case 2:
                call.call(listeners, this, arguments[1]);
                break;
              case 3:
                call.call(listeners, this, arguments[1], arguments[2]);
                break;
              default:
                l = arguments.length;
                args = new Array(l - 1);
                for (i = 1; i < l; ++i) {
                  args[i - 1] = arguments[i];
                }
                apply.call(listeners, this, args);
            }
          }
        };
        methods = {
          on,
          once,
          off,
          emit
        };
        descriptors = {
          on: d(on),
          once: d(once),
          off: d(off),
          emit: d(emit)
        };
        base = defineProperties({}, descriptors);
        module3.exports = exports3 = function(o) {
          return o == null ? create(base) : defineProperties(Object(o), descriptors);
        };
        exports3.methods = methods;
      }, { "d": 16, "es5-ext/object/valid-callable": 54 }], 79: [function(require2, module3, exports3) {
        exports3.read = function(buffer, offset, isLE, mLen, nBytes) {
          var e, m;
          var eLen = nBytes * 8 - mLen - 1;
          var eMax = (1 << eLen) - 1;
          var eBias = eMax >> 1;
          var nBits = -7;
          var i = isLE ? nBytes - 1 : 0;
          var d = isLE ? -1 : 1;
          var s = buffer[offset + i];
          i += d;
          e = s & (1 << -nBits) - 1;
          s >>= -nBits;
          nBits += eLen;
          for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
          }
          m = e & (1 << -nBits) - 1;
          e >>= -nBits;
          nBits += mLen;
          for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
          }
          if (e === 0) {
            e = 1 - eBias;
          } else if (e === eMax) {
            return m ? NaN : (s ? -1 : 1) * Infinity;
          } else {
            m = m + Math.pow(2, mLen);
            e = e - eBias;
          }
          return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
        };
        exports3.write = function(buffer, value, offset, isLE, mLen, nBytes) {
          var e, m, c;
          var eLen = nBytes * 8 - mLen - 1;
          var eMax = (1 << eLen) - 1;
          var eBias = eMax >> 1;
          var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
          var i = isLE ? 0 : nBytes - 1;
          var d = isLE ? 1 : -1;
          var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
          value = Math.abs(value);
          if (isNaN(value) || value === Infinity) {
            m = isNaN(value) ? 1 : 0;
            e = eMax;
          } else {
            e = Math.floor(Math.log(value) / Math.LN2);
            if (value * (c = Math.pow(2, -e)) < 1) {
              e--;
              c *= 2;
            }
            if (e + eBias >= 1) {
              value += rt / c;
            } else {
              value += rt * Math.pow(2, 1 - eBias);
            }
            if (value * c >= 2) {
              e++;
              c /= 2;
            }
            if (e + eBias >= eMax) {
              m = 0;
              e = eMax;
            } else if (e + eBias >= 1) {
              m = (value * c - 1) * Math.pow(2, mLen);
              e = e + eBias;
            } else {
              m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
              e = 0;
            }
          }
          for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
          }
          e = e << mLen | m;
          eLen += mLen;
          for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
          }
          buffer[offset + i - d] |= s * 128;
        };
      }, {}], 80: [function(require2, module3, exports3) {
        if (typeof Object.create === "function") {
          module3.exports = function inherits(ctor, superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          };
        } else {
          module3.exports = function inherits(ctor, superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function() {
            };
            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          };
        }
      }, {}], 81: [function(require2, module3, exports3) {
        /*!
         * Determine if an object is a Buffer
         *
         * @author   Feross Aboukhadijeh <https://feross.org>
         * @license  MIT
         */
        module3.exports = function(obj) {
          return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer);
        };
        function isBuffer(obj) {
          return !!obj.constructor && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
        }
        function isSlowBuffer(obj) {
          return typeof obj.readFloatLE === "function" && typeof obj.slice === "function" && isBuffer(obj.slice(0, 0));
        }
      }, {}], 82: [function(require2, module3, exports3) {
        var Buffer = require2("safe-buffer").Buffer;
        var protocol = module3.exports;
        protocol.types = {
          0: "reserved",
          1: "connect",
          2: "connack",
          3: "publish",
          4: "puback",
          5: "pubrec",
          6: "pubrel",
          7: "pubcomp",
          8: "subscribe",
          9: "suback",
          10: "unsubscribe",
          11: "unsuback",
          12: "pingreq",
          13: "pingresp",
          14: "disconnect",
          15: "auth"
        };
        protocol.codes = {};
        for (var k in protocol.types) {
          var v = protocol.types[k];
          protocol.codes[v] = k;
        }
        protocol.CMD_SHIFT = 4;
        protocol.CMD_MASK = 240;
        protocol.DUP_MASK = 8;
        protocol.QOS_MASK = 3;
        protocol.QOS_SHIFT = 1;
        protocol.RETAIN_MASK = 1;
        protocol.LENGTH_MASK = 127;
        protocol.LENGTH_FIN_MASK = 128;
        protocol.SESSIONPRESENT_MASK = 1;
        protocol.SESSIONPRESENT_HEADER = Buffer.from([protocol.SESSIONPRESENT_MASK]);
        protocol.CONNACK_HEADER = Buffer.from([protocol.codes["connack"] << protocol.CMD_SHIFT]);
        protocol.USERNAME_MASK = 128;
        protocol.PASSWORD_MASK = 64;
        protocol.WILL_RETAIN_MASK = 32;
        protocol.WILL_QOS_MASK = 24;
        protocol.WILL_QOS_SHIFT = 3;
        protocol.WILL_FLAG_MASK = 4;
        protocol.CLEAN_SESSION_MASK = 2;
        protocol.CONNECT_HEADER = Buffer.from([protocol.codes["connect"] << protocol.CMD_SHIFT]);
        protocol.properties = {
          sessionExpiryInterval: 17,
          willDelayInterval: 24,
          receiveMaximum: 33,
          maximumPacketSize: 39,
          topicAliasMaximum: 34,
          requestResponseInformation: 25,
          requestProblemInformation: 23,
          userProperties: 38,
          authenticationMethod: 21,
          authenticationData: 22,
          payloadFormatIndicator: 1,
          messageExpiryInterval: 2,
          contentType: 3,
          responseTopic: 8,
          correlationData: 9,
          maximumQoS: 36,
          retainAvailable: 37,
          assignedClientIdentifier: 18,
          reasonString: 31,
          wildcardSubscriptionAvailable: 40,
          subscriptionIdentifiersAvailable: 41,
          sharedSubscriptionAvailable: 42,
          serverKeepAlive: 19,
          responseInformation: 26,
          serverReference: 28,
          topicAlias: 35,
          subscriptionIdentifier: 11
        };
        protocol.propertiesCodes = {};
        for (var prop in protocol.properties) {
          var id = protocol.properties[prop];
          protocol.propertiesCodes[id] = prop;
        }
        protocol.propertiesTypes = {
          sessionExpiryInterval: "int32",
          willDelayInterval: "int32",
          receiveMaximum: "int16",
          maximumPacketSize: "int32",
          topicAliasMaximum: "int16",
          requestResponseInformation: "byte",
          requestProblemInformation: "byte",
          userProperties: "pair",
          authenticationMethod: "string",
          authenticationData: "binary",
          payloadFormatIndicator: "byte",
          messageExpiryInterval: "int32",
          contentType: "string",
          responseTopic: "string",
          correlationData: "binary",
          maximumQoS: "int8",
          retainAvailable: "byte",
          assignedClientIdentifier: "string",
          reasonString: "string",
          wildcardSubscriptionAvailable: "byte",
          subscriptionIdentifiersAvailable: "byte",
          sharedSubscriptionAvailable: "byte",
          serverKeepAlive: "int32",
          responseInformation: "string",
          serverReference: "string",
          topicAlias: "int16",
          subscriptionIdentifier: "var"
        };
        function genHeader(type) {
          return [0, 1, 2].map(function(qos) {
            return [0, 1].map(function(dup) {
              return [0, 1].map(function(retain) {
                var buf = new Buffer(1);
                buf.writeUInt8(
                  protocol.codes[type] << protocol.CMD_SHIFT | (dup ? protocol.DUP_MASK : 0) | qos << protocol.QOS_SHIFT | retain,
                  0,
                  true
                );
                return buf;
              });
            });
          });
        }
        protocol.PUBLISH_HEADER = genHeader("publish");
        protocol.SUBSCRIBE_HEADER = genHeader("subscribe");
        protocol.SUBSCRIBE_OPTIONS_QOS_MASK = 3;
        protocol.SUBSCRIBE_OPTIONS_NL_MASK = 1;
        protocol.SUBSCRIBE_OPTIONS_NL_SHIFT = 2;
        protocol.SUBSCRIBE_OPTIONS_RAP_MASK = 1;
        protocol.SUBSCRIBE_OPTIONS_RAP_SHIFT = 3;
        protocol.SUBSCRIBE_OPTIONS_RH_MASK = 3;
        protocol.SUBSCRIBE_OPTIONS_RH_SHIFT = 4;
        protocol.SUBSCRIBE_OPTIONS_RH = [0, 16, 32];
        protocol.SUBSCRIBE_OPTIONS_NL = 4;
        protocol.SUBSCRIBE_OPTIONS_RAP = 8;
        protocol.SUBSCRIBE_OPTIONS_QOS = [0, 1, 2];
        protocol.UNSUBSCRIBE_HEADER = genHeader("unsubscribe");
        protocol.ACKS = {
          unsuback: genHeader("unsuback"),
          puback: genHeader("puback"),
          pubcomp: genHeader("pubcomp"),
          pubrel: genHeader("pubrel"),
          pubrec: genHeader("pubrec")
        };
        protocol.SUBACK_HEADER = Buffer.from([protocol.codes["suback"] << protocol.CMD_SHIFT]);
        protocol.VERSION3 = Buffer.from([3]);
        protocol.VERSION4 = Buffer.from([4]);
        protocol.VERSION5 = Buffer.from([5]);
        protocol.QOS = [0, 1, 2].map(function(qos) {
          return Buffer.from([qos]);
        });
        protocol.EMPTY = {
          pingreq: Buffer.from([protocol.codes["pingreq"] << 4, 0]),
          pingresp: Buffer.from([protocol.codes["pingresp"] << 4, 0]),
          disconnect: Buffer.from([protocol.codes["disconnect"] << 4, 0])
        };
      }, { "safe-buffer": 110 }], 83: [function(require2, module3, exports3) {
        var Buffer = require2("safe-buffer").Buffer;
        var writeToStream = require2("./writeToStream");
        var EE = require2("events").EventEmitter;
        var inherits = require2("inherits");
        function generate(packet, opts) {
          var stream = new Accumulator();
          writeToStream(packet, stream, opts);
          return stream.concat();
        }
        function Accumulator() {
          this._array = new Array(20);
          this._i = 0;
        }
        inherits(Accumulator, EE);
        Accumulator.prototype.write = function(chunk) {
          this._array[this._i++] = chunk;
          return true;
        };
        Accumulator.prototype.concat = function() {
          var length = 0;
          var lengths = new Array(this._array.length);
          var list = this._array;
          var pos = 0;
          var i;
          var result;
          for (i = 0; i < list.length && list[i] !== void 0; i++) {
            if (typeof list[i] !== "string")
              lengths[i] = list[i].length;
            else
              lengths[i] = Buffer.byteLength(list[i]);
            length += lengths[i];
          }
          result = Buffer.allocUnsafe(length);
          for (i = 0; i < list.length && list[i] !== void 0; i++) {
            if (typeof list[i] !== "string") {
              list[i].copy(result, pos);
              pos += lengths[i];
            } else {
              result.write(list[i], pos);
              pos += lengths[i];
            }
          }
          return result;
        };
        module3.exports = generate;
      }, { "./writeToStream": 89, "events": 13, "inherits": 80, "safe-buffer": 110 }], 84: [function(require2, module3, exports3) {
        exports3.parser = require2("./parser");
        exports3.generate = require2("./generate");
        exports3.writeToStream = require2("./writeToStream");
      }, { "./generate": 83, "./parser": 88, "./writeToStream": 89 }], 85: [function(require2, module3, exports3) {
        var DuplexStream = require2("readable-stream/duplex"), util = require2("util"), Buffer = require2("safe-buffer").Buffer;
        function BufferList(callback) {
          if (!(this instanceof BufferList))
            return new BufferList(callback);
          this._bufs = [];
          this.length = 0;
          if (typeof callback == "function") {
            this._callback = callback;
            var piper = (function piper2(err) {
              if (this._callback) {
                this._callback(err);
                this._callback = null;
              }
            }).bind(this);
            this.on("pipe", function onPipe(src) {
              src.on("error", piper);
            });
            this.on("unpipe", function onUnpipe(src) {
              src.removeListener("error", piper);
            });
          } else {
            this.append(callback);
          }
          DuplexStream.call(this);
        }
        util.inherits(BufferList, DuplexStream);
        BufferList.prototype._offset = function _offset(offset) {
          var tot = 0, i = 0, _t;
          if (offset === 0)
            return [0, 0];
          for (; i < this._bufs.length; i++) {
            _t = tot + this._bufs[i].length;
            if (offset < _t || i == this._bufs.length - 1)
              return [i, offset - tot];
            tot = _t;
          }
        };
        BufferList.prototype.append = function append(buf) {
          var i = 0;
          if (Buffer.isBuffer(buf)) {
            this._appendBuffer(buf);
          } else if (Array.isArray(buf)) {
            for (; i < buf.length; i++)
              this.append(buf[i]);
          } else if (buf instanceof BufferList) {
            for (; i < buf._bufs.length; i++)
              this.append(buf._bufs[i]);
          } else if (buf != null) {
            if (typeof buf == "number")
              buf = buf.toString();
            this._appendBuffer(Buffer.from(buf));
          }
          return this;
        };
        BufferList.prototype._appendBuffer = function appendBuffer(buf) {
          this._bufs.push(buf);
          this.length += buf.length;
        };
        BufferList.prototype._write = function _write(buf, encoding, callback) {
          this._appendBuffer(buf);
          if (typeof callback == "function")
            callback();
        };
        BufferList.prototype._read = function _read(size) {
          if (!this.length)
            return this.push(null);
          size = Math.min(size, this.length);
          this.push(this.slice(0, size));
          this.consume(size);
        };
        BufferList.prototype.end = function end(chunk) {
          DuplexStream.prototype.end.call(this, chunk);
          if (this._callback) {
            this._callback(null, this.slice());
            this._callback = null;
          }
        };
        BufferList.prototype.get = function get(index) {
          return this.slice(index, index + 1)[0];
        };
        BufferList.prototype.slice = function slice(start, end) {
          if (typeof start == "number" && start < 0)
            start += this.length;
          if (typeof end == "number" && end < 0)
            end += this.length;
          return this.copy(null, 0, start, end);
        };
        BufferList.prototype.copy = function copy(dst, dstStart, srcStart, srcEnd) {
          if (typeof srcStart != "number" || srcStart < 0)
            srcStart = 0;
          if (typeof srcEnd != "number" || srcEnd > this.length)
            srcEnd = this.length;
          if (srcStart >= this.length)
            return dst || Buffer.alloc(0);
          if (srcEnd <= 0)
            return dst || Buffer.alloc(0);
          var copy2 = !!dst, off = this._offset(srcStart), len = srcEnd - srcStart, bytes = len, bufoff = copy2 && dstStart || 0, start = off[1], l, i;
          if (srcStart === 0 && srcEnd == this.length) {
            if (!copy2) {
              return this._bufs.length === 1 ? this._bufs[0] : Buffer.concat(this._bufs, this.length);
            }
            for (i = 0; i < this._bufs.length; i++) {
              this._bufs[i].copy(dst, bufoff);
              bufoff += this._bufs[i].length;
            }
            return dst;
          }
          if (bytes <= this._bufs[off[0]].length - start) {
            return copy2 ? this._bufs[off[0]].copy(dst, dstStart, start, start + bytes) : this._bufs[off[0]].slice(start, start + bytes);
          }
          if (!copy2)
            dst = Buffer.allocUnsafe(len);
          for (i = off[0]; i < this._bufs.length; i++) {
            l = this._bufs[i].length - start;
            if (bytes > l) {
              this._bufs[i].copy(dst, bufoff, start);
            } else {
              this._bufs[i].copy(dst, bufoff, start, start + bytes);
              break;
            }
            bufoff += l;
            bytes -= l;
            if (start)
              start = 0;
          }
          return dst;
        };
        BufferList.prototype.shallowSlice = function shallowSlice(start, end) {
          start = start || 0;
          end = end || this.length;
          if (start < 0)
            start += this.length;
          if (end < 0)
            end += this.length;
          var startOffset = this._offset(start), endOffset = this._offset(end), buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1);
          if (endOffset[1] == 0)
            buffers.pop();
          else
            buffers[buffers.length - 1] = buffers[buffers.length - 1].slice(0, endOffset[1]);
          if (startOffset[1] != 0)
            buffers[0] = buffers[0].slice(startOffset[1]);
          return new BufferList(buffers);
        };
        BufferList.prototype.toString = function toString(encoding, start, end) {
          return this.slice(start, end).toString(encoding);
        };
        BufferList.prototype.consume = function consume(bytes) {
          while (this._bufs.length) {
            if (bytes >= this._bufs[0].length) {
              bytes -= this._bufs[0].length;
              this.length -= this._bufs[0].length;
              this._bufs.shift();
            } else {
              this._bufs[0] = this._bufs[0].slice(bytes);
              this.length -= bytes;
              break;
            }
          }
          return this;
        };
        BufferList.prototype.duplicate = function duplicate() {
          var i = 0, copy = new BufferList();
          for (; i < this._bufs.length; i++)
            copy.append(this._bufs[i]);
          return copy;
        };
        BufferList.prototype.destroy = function destroy() {
          this._bufs.length = 0;
          this.length = 0;
          this.push(null);
        };
        (function() {
          var methods = {
            "readDoubleBE": 8,
            "readDoubleLE": 8,
            "readFloatBE": 4,
            "readFloatLE": 4,
            "readInt32BE": 4,
            "readInt32LE": 4,
            "readUInt32BE": 4,
            "readUInt32LE": 4,
            "readInt16BE": 2,
            "readInt16LE": 2,
            "readUInt16BE": 2,
            "readUInt16LE": 2,
            "readInt8": 1,
            "readUInt8": 1
          };
          for (var m in methods) {
            (function(m2) {
              BufferList.prototype[m2] = function(offset) {
                return this.slice(offset, offset + methods[m2])[m2](0);
              };
            })(m);
          }
        })();
        module3.exports = BufferList;
      }, { "readable-stream/duplex": 97, "safe-buffer": 110, "util": 117 }], 86: [function(require2, module3, exports3) {
        var Buffer = require2("safe-buffer").Buffer;
        var max = 65536;
        var cache = {};
        function generateBuffer(i) {
          var buffer = Buffer.allocUnsafe(2);
          buffer.writeUInt8(i >> 8, 0);
          buffer.writeUInt8(i & 255, 0 + 1);
          return buffer;
        }
        function generateCache() {
          for (var i = 0; i < max; i++) {
            cache[i] = generateBuffer(i);
          }
        }
        function calcVariableByteIntLength(length) {
          if (length >= 0 && length < 128)
            return 1;
          else if (length >= 128 && length < 16384)
            return 2;
          else if (length >= 16384 && length < 2097152)
            return 3;
          else if (length >= 2097152 && length < 268435456)
            return 4;
          else
            return 0;
        }
        function genBufVariableByteInt(num) {
          var digit = 0;
          var pos = 0;
          var length = calcVariableByteIntLength(num);
          var buffer = Buffer.allocUnsafe(length);
          do {
            digit = num % 128 | 0;
            num = num / 128 | 0;
            if (num > 0)
              digit = digit | 128;
            buffer.writeUInt8(digit, pos++);
          } while (num > 0);
          return {
            data: buffer,
            length
          };
        }
        function generate4ByteBuffer(num) {
          var buffer = Buffer.allocUnsafe(4);
          buffer.writeUInt32BE(num, 0);
          return buffer;
        }
        module3.exports = {
          cache,
          generateCache,
          generateNumber: generateBuffer,
          genBufVariableByteInt,
          generate4ByteBuffer
        };
      }, { "safe-buffer": 110 }], 87: [function(require2, module3, exports3) {
        function Packet() {
          this.cmd = null;
          this.retain = false;
          this.qos = 0;
          this.dup = false;
          this.length = -1;
          this.topic = null;
          this.payload = null;
        }
        module3.exports = Packet;
      }, {}], 88: [function(require2, module3, exports3) {
        var bl = require2("bl");
        var inherits = require2("inherits");
        var EE = require2("events").EventEmitter;
        var Packet = require2("./packet");
        var constants = require2("./constants");
        function Parser(opt) {
          if (!(this instanceof Parser))
            return new Parser(opt);
          this.settings = opt || {};
          this._states = [
            "_parseHeader",
            "_parseLength",
            "_parsePayload",
            "_newPacket"
          ];
          this._resetState();
        }
        inherits(Parser, EE);
        Parser.prototype._resetState = function() {
          this.packet = new Packet();
          this.error = null;
          this._list = bl();
          this._stateCounter = 0;
        };
        Parser.prototype.parse = function(buf) {
          if (this.error)
            this._resetState();
          this._list.append(buf);
          while ((this.packet.length !== -1 || this._list.length > 0) && this[this._states[this._stateCounter]]() && !this.error) {
            this._stateCounter++;
            if (this._stateCounter >= this._states.length)
              this._stateCounter = 0;
          }
          return this._list.length;
        };
        Parser.prototype._parseHeader = function() {
          var zero = this._list.readUInt8(0);
          this.packet.cmd = constants.types[zero >> constants.CMD_SHIFT];
          this.packet.retain = (zero & constants.RETAIN_MASK) !== 0;
          this.packet.qos = zero >> constants.QOS_SHIFT & constants.QOS_MASK;
          this.packet.dup = (zero & constants.DUP_MASK) !== 0;
          this._list.consume(1);
          return true;
        };
        Parser.prototype._parseLength = function() {
          var result = this._parseVarByteNum(true);
          if (result) {
            this.packet.length = result.value;
            this._list.consume(result.bytes);
          }
          return !!result;
        };
        Parser.prototype._parsePayload = function() {
          var result = false;
          if (this.packet.length === 0 || this._list.length >= this.packet.length) {
            this._pos = 0;
            switch (this.packet.cmd) {
              case "connect":
                this._parseConnect();
                break;
              case "connack":
                this._parseConnack();
                break;
              case "publish":
                this._parsePublish();
                break;
              case "puback":
              case "pubrec":
              case "pubrel":
              case "pubcomp":
                this._parseConfirmation();
                break;
              case "subscribe":
                this._parseSubscribe();
                break;
              case "suback":
                this._parseSuback();
                break;
              case "unsubscribe":
                this._parseUnsubscribe();
                break;
              case "unsuback":
                this._parseUnsuback();
                break;
              case "pingreq":
              case "pingresp":
                break;
              case "disconnect":
                this._parseDisconnect();
                break;
              case "auth":
                this._parseAuth();
                break;
              default:
                this._emitError(new Error("Not supported"));
            }
            result = true;
          }
          return result;
        };
        Parser.prototype._parseConnect = function() {
          var protocolId;
          var clientId;
          var topic;
          var payload;
          var password;
          var username;
          var flags = {};
          var packet = this.packet;
          protocolId = this._parseString();
          if (protocolId === null)
            return this._emitError(new Error("Cannot parse protocolId"));
          if (protocolId !== "MQTT" && protocolId !== "MQIsdp") {
            return this._emitError(new Error("Invalid protocolId"));
          }
          packet.protocolId = protocolId;
          if (this._pos >= this._list.length)
            return this._emitError(new Error("Packet too short"));
          packet.protocolVersion = this._list.readUInt8(this._pos);
          if (packet.protocolVersion !== 3 && packet.protocolVersion !== 4 && packet.protocolVersion !== 5) {
            return this._emitError(new Error("Invalid protocol version"));
          }
          this._pos++;
          if (this._pos >= this._list.length) {
            return this._emitError(new Error("Packet too short"));
          }
          flags.username = this._list.readUInt8(this._pos) & constants.USERNAME_MASK;
          flags.password = this._list.readUInt8(this._pos) & constants.PASSWORD_MASK;
          flags.will = this._list.readUInt8(this._pos) & constants.WILL_FLAG_MASK;
          if (flags.will) {
            packet.will = {};
            packet.will.retain = (this._list.readUInt8(this._pos) & constants.WILL_RETAIN_MASK) !== 0;
            packet.will.qos = (this._list.readUInt8(this._pos) & constants.WILL_QOS_MASK) >> constants.WILL_QOS_SHIFT;
          }
          packet.clean = (this._list.readUInt8(this._pos) & constants.CLEAN_SESSION_MASK) !== 0;
          this._pos++;
          packet.keepalive = this._parseNum();
          if (packet.keepalive === -1)
            return this._emitError(new Error("Packet too short"));
          if (packet.protocolVersion === 5) {
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          clientId = this._parseString();
          if (clientId === null)
            return this._emitError(new Error("Packet too short"));
          packet.clientId = clientId;
          if (flags.will) {
            if (packet.protocolVersion === 5) {
              var willProperties = this._parseProperties();
              if (Object.getOwnPropertyNames(willProperties).length) {
                packet.will.properties = willProperties;
              }
            }
            topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse will topic"));
            packet.will.topic = topic;
            payload = this._parseBuffer();
            if (payload === null)
              return this._emitError(new Error("Cannot parse will payload"));
            packet.will.payload = payload;
          }
          if (flags.username) {
            username = this._parseString();
            if (username === null)
              return this._emitError(new Error("Cannot parse username"));
            packet.username = username;
          }
          if (flags.password) {
            password = this._parseBuffer();
            if (password === null)
              return this._emitError(new Error("Cannot parse password"));
            packet.password = password;
          }
          this.settings = packet;
          return packet;
        };
        Parser.prototype._parseConnack = function() {
          var packet = this.packet;
          if (this._list.length < 2)
            return null;
          packet.sessionPresent = !!(this._list.readUInt8(this._pos++) & constants.SESSIONPRESENT_MASK);
          if (this.settings.protocolVersion === 5) {
            packet.reasonCode = this._list.readUInt8(this._pos++);
          } else {
            packet.returnCode = this._list.readUInt8(this._pos++);
          }
          if (packet.returnCode === -1 || packet.reasonCode === -1)
            return this._emitError(new Error("Cannot parse return code"));
          if (this.settings.protocolVersion === 5) {
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
        };
        Parser.prototype._parsePublish = function() {
          var packet = this.packet;
          packet.topic = this._parseString();
          if (packet.topic === null)
            return this._emitError(new Error("Cannot parse topic"));
          if (packet.qos > 0) {
            if (!this._parseMessageId()) {
              return;
            }
          }
          if (this.settings.protocolVersion === 5) {
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          packet.payload = this._list.slice(this._pos, packet.length);
        };
        Parser.prototype._parseSubscribe = function() {
          var packet = this.packet;
          var topic;
          var options;
          var qos;
          var rh;
          var rap;
          var nl;
          var subscription;
          if (packet.qos !== 1) {
            return this._emitError(new Error("Wrong subscribe header"));
          }
          packet.subscriptions = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          while (this._pos < packet.length) {
            topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse topic"));
            options = this._parseByte();
            qos = options & constants.SUBSCRIBE_OPTIONS_QOS_MASK;
            nl = (options >> constants.SUBSCRIBE_OPTIONS_NL_SHIFT & constants.SUBSCRIBE_OPTIONS_NL_MASK) !== 0;
            rap = (options >> constants.SUBSCRIBE_OPTIONS_RAP_SHIFT & constants.SUBSCRIBE_OPTIONS_RAP_MASK) !== 0;
            rh = options >> constants.SUBSCRIBE_OPTIONS_RH_SHIFT & constants.SUBSCRIBE_OPTIONS_RH_MASK;
            subscription = { topic, qos };
            if (this.settings.protocolVersion === 5) {
              subscription.nl = nl;
              subscription.rap = rap;
              subscription.rh = rh;
            }
            packet.subscriptions.push(subscription);
          }
        };
        Parser.prototype._parseSuback = function() {
          var packet = this.packet;
          this.packet.granted = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          while (this._pos < this.packet.length) {
            this.packet.granted.push(this._list.readUInt8(this._pos++));
          }
        };
        Parser.prototype._parseUnsubscribe = function() {
          var packet = this.packet;
          packet.unsubscriptions = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          while (this._pos < packet.length) {
            var topic;
            topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse topic"));
            packet.unsubscriptions.push(topic);
          }
        };
        Parser.prototype._parseUnsuback = function() {
          var packet = this.packet;
          if (!this._parseMessageId())
            return this._emitError(new Error("Cannot parse messageId"));
          if (this.settings.protocolVersion === 5) {
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
            packet.granted = [];
            while (this._pos < this.packet.length) {
              this.packet.granted.push(this._list.readUInt8(this._pos++));
            }
          }
        };
        Parser.prototype._parseConfirmation = function() {
          var packet = this.packet;
          this._parseMessageId();
          if (this.settings.protocolVersion === 5) {
            if (packet.length > 2) {
              packet.reasonCode = this._parseByte();
              var properties = this._parseProperties();
              if (Object.getOwnPropertyNames(properties).length) {
                packet.properties = properties;
              }
            }
          }
          return true;
        };
        Parser.prototype._parseDisconnect = function() {
          var packet = this.packet;
          if (this.settings.protocolVersion === 5) {
            packet.reasonCode = this._parseByte();
            var properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          return true;
        };
        Parser.prototype._parseAuth = function() {
          var packet = this.packet;
          if (this.settings.protocolVersion !== 5) {
            return this._emitError(new Error("Not supported auth packet for this version MQTT"));
          }
          packet.reasonCode = this._parseByte();
          var properties = this._parseProperties();
          if (Object.getOwnPropertyNames(properties).length) {
            packet.properties = properties;
          }
          return true;
        };
        Parser.prototype._parseMessageId = function() {
          var packet = this.packet;
          packet.messageId = this._parseNum();
          if (packet.messageId === null) {
            this._emitError(new Error("Cannot parse messageId"));
            return false;
          }
          return true;
        };
        Parser.prototype._parseString = function(maybeBuffer) {
          var length = this._parseNum();
          var result;
          var end = length + this._pos;
          if (length === -1 || end > this._list.length || end > this.packet.length)
            return null;
          result = this._list.toString("utf8", this._pos, end);
          this._pos += length;
          return result;
        };
        Parser.prototype._parseStringPair = function() {
          return {
            name: this._parseString(),
            value: this._parseString()
          };
        };
        Parser.prototype._parseBuffer = function() {
          var length = this._parseNum();
          var result;
          var end = length + this._pos;
          if (length === -1 || end > this._list.length || end > this.packet.length)
            return null;
          result = this._list.slice(this._pos, end);
          this._pos += length;
          return result;
        };
        Parser.prototype._parseNum = function() {
          if (this._list.length - this._pos < 2)
            return -1;
          var result = this._list.readUInt16BE(this._pos);
          this._pos += 2;
          return result;
        };
        Parser.prototype._parse4ByteNum = function() {
          if (this._list.length - this._pos < 4)
            return -1;
          var result = this._list.readUInt32BE(this._pos);
          this._pos += 4;
          return result;
        };
        Parser.prototype._parseVarByteNum = function(fullInfoFlag) {
          var bytes = 0;
          var mul = 1;
          var length = 0;
          var result = true;
          var current;
          var padding = this._pos ? this._pos : 0;
          while (bytes < 5) {
            current = this._list.readUInt8(padding + bytes++);
            length += mul * (current & constants.LENGTH_MASK);
            mul *= 128;
            if ((current & constants.LENGTH_FIN_MASK) === 0)
              break;
            if (this._list.length <= bytes) {
              result = false;
              break;
            }
          }
          if (padding) {
            this._pos += bytes;
          }
          result = result ? fullInfoFlag ? {
            bytes,
            value: length
          } : length : false;
          return result;
        };
        Parser.prototype._parseByte = function() {
          var result = this._list.readUInt8(this._pos);
          this._pos++;
          return result;
        };
        Parser.prototype._parseByType = function(type) {
          switch (type) {
            case "byte": {
              return this._parseByte() !== 0;
            }
            case "int8": {
              return this._parseByte();
            }
            case "int16": {
              return this._parseNum();
            }
            case "int32": {
              return this._parse4ByteNum();
            }
            case "var": {
              return this._parseVarByteNum();
            }
            case "string": {
              return this._parseString();
            }
            case "pair": {
              return this._parseStringPair();
            }
            case "binary": {
              return this._parseBuffer();
            }
          }
        };
        Parser.prototype._parseProperties = function() {
          var length = this._parseVarByteNum();
          var start = this._pos;
          var end = start + length;
          var result = {};
          while (this._pos < end) {
            var type = this._parseByte();
            var name = constants.propertiesCodes[type];
            if (!name) {
              this._emitError(new Error("Unknown property"));
              return false;
            }
            if (name === "userProperties") {
              if (!result[name]) {
                result[name] = {};
              }
              var currentUserProperty = this._parseByType(constants.propertiesTypes[name]);
              result[name][currentUserProperty.name] = currentUserProperty.value;
              continue;
            }
            result[name] = this._parseByType(constants.propertiesTypes[name]);
          }
          return result;
        };
        Parser.prototype._newPacket = function() {
          if (this.packet) {
            this._list.consume(this.packet.length);
            this.emit("packet", this.packet);
          }
          this.packet = new Packet();
          this._pos = 0;
          return true;
        };
        Parser.prototype._emitError = function(err) {
          this.error = err;
          this.emit("error", err);
        };
        module3.exports = Parser;
      }, { "./constants": 82, "./packet": 87, "bl": 85, "events": 13, "inherits": 80 }], 89: [function(require2, module3, exports3) {
        var protocol = require2("./constants");
        var Buffer = require2("safe-buffer").Buffer;
        var empty = Buffer.allocUnsafe(0);
        var zeroBuf = Buffer.from([0]);
        var numbers = require2("./numbers");
        var nextTick = require2("process-nextick-args").nextTick;
        var numCache = numbers.cache;
        var generateNumber = numbers.generateNumber;
        var generateCache = numbers.generateCache;
        var genBufVariableByteInt = numbers.genBufVariableByteInt;
        var generate4ByteBuffer = numbers.generate4ByteBuffer;
        var writeNumber = writeNumberCached;
        var toGenerate = true;
        function generate(packet, stream, opts) {
          if (stream.cork) {
            stream.cork();
            nextTick(uncork, stream);
          }
          if (toGenerate) {
            toGenerate = false;
            generateCache();
          }
          switch (packet.cmd) {
            case "connect":
              return connect(packet, stream);
            case "connack":
              return connack(packet, stream, opts);
            case "publish":
              return publish(packet, stream, opts);
            case "puback":
            case "pubrec":
            case "pubrel":
            case "pubcomp":
              return confirmation(packet, stream, opts);
            case "subscribe":
              return subscribe(packet, stream, opts);
            case "suback":
              return suback(packet, stream, opts);
            case "unsubscribe":
              return unsubscribe(packet, stream, opts);
            case "unsuback":
              return unsuback(packet, stream, opts);
            case "pingreq":
            case "pingresp":
              return emptyPacket(packet, stream);
            case "disconnect":
              return disconnect(packet, stream, opts);
            case "auth":
              return auth(packet, stream, opts);
            default:
              stream.emit("error", new Error("Unknown command"));
              return false;
          }
        }
        Object.defineProperty(generate, "cacheNumbers", {
          get: function() {
            return writeNumber === writeNumberCached;
          },
          set: function(value) {
            if (value) {
              if (!numCache || Object.keys(numCache).length === 0)
                toGenerate = true;
              writeNumber = writeNumberCached;
            } else {
              toGenerate = false;
              writeNumber = writeNumberGenerated;
            }
          }
        });
        function uncork(stream) {
          stream.uncork();
        }
        function connect(packet, stream, opts) {
          var settings = packet || {};
          var protocolId = settings.protocolId || "MQTT";
          var protocolVersion = settings.protocolVersion || 4;
          var will = settings.will;
          var clean = settings.clean;
          var keepalive = settings.keepalive || 0;
          var clientId = settings.clientId || "";
          var username = settings.username;
          var password = settings.password;
          var properties = settings.properties;
          if (clean === void 0)
            clean = true;
          var length = 0;
          if (!protocolId || typeof protocolId !== "string" && !Buffer.isBuffer(protocolId)) {
            stream.emit("error", new Error("Invalid protocolId"));
            return false;
          } else
            length += protocolId.length + 2;
          if (protocolVersion !== 3 && protocolVersion !== 4 && protocolVersion !== 5) {
            stream.emit("error", new Error("Invalid protocol version"));
            return false;
          } else
            length += 1;
          if ((typeof clientId === "string" || Buffer.isBuffer(clientId)) && (clientId || protocolVersion === 4) && (clientId || clean)) {
            length += clientId.length + 2;
          } else {
            if (protocolVersion < 4) {
              stream.emit("error", new Error("clientId must be supplied before 3.1.1"));
              return false;
            }
            if (clean * 1 === 0) {
              stream.emit("error", new Error("clientId must be given if cleanSession set to 0"));
              return false;
            }
          }
          if (typeof keepalive !== "number" || keepalive < 0 || keepalive > 65535 || keepalive % 1 !== 0) {
            stream.emit("error", new Error("Invalid keepalive"));
            return false;
          } else
            length += 2;
          length += 1;
          if (protocolVersion === 5) {
            var propertiesData = getProperties(stream, properties);
            length += propertiesData.length;
          }
          if (will) {
            if (typeof will !== "object") {
              stream.emit("error", new Error("Invalid will"));
              return false;
            }
            if (!will.topic || typeof will.topic !== "string") {
              stream.emit("error", new Error("Invalid will topic"));
              return false;
            } else {
              length += Buffer.byteLength(will.topic) + 2;
            }
            if (will.payload) {
              if (will.payload.length >= 0) {
                if (typeof will.payload === "string") {
                  length += Buffer.byteLength(will.payload) + 2;
                } else {
                  length += will.payload.length + 2;
                }
              } else {
                stream.emit("error", new Error("Invalid will payload"));
                return false;
              }
              var willProperties = {};
              if (protocolVersion === 5) {
                willProperties = getProperties(stream, will.properties);
                length += willProperties.length;
              }
            }
          }
          var providedUsername = false;
          if (username != null) {
            if (isStringOrBuffer(username)) {
              providedUsername = true;
              length += Buffer.byteLength(username) + 2;
            } else {
              stream.emit("error", new Error("Invalid username"));
              return false;
            }
          }
          if (password != null) {
            if (!providedUsername) {
              stream.emit("error", new Error("Username is required to use password"));
              return false;
            }
            if (isStringOrBuffer(password)) {
              length += byteLength(password) + 2;
            } else {
              stream.emit("error", new Error("Invalid password"));
              return false;
            }
          }
          stream.write(protocol.CONNECT_HEADER);
          writeVarByteInt(stream, length);
          writeStringOrBuffer(stream, protocolId);
          stream.write(
            protocolVersion === 4 ? protocol.VERSION4 : protocolVersion === 5 ? protocol.VERSION5 : protocol.VERSION3
          );
          var flags = 0;
          flags |= username != null ? protocol.USERNAME_MASK : 0;
          flags |= password != null ? protocol.PASSWORD_MASK : 0;
          flags |= will && will.retain ? protocol.WILL_RETAIN_MASK : 0;
          flags |= will && will.qos ? will.qos << protocol.WILL_QOS_SHIFT : 0;
          flags |= will ? protocol.WILL_FLAG_MASK : 0;
          flags |= clean ? protocol.CLEAN_SESSION_MASK : 0;
          stream.write(Buffer.from([flags]));
          writeNumber(stream, keepalive);
          if (protocolVersion === 5) {
            propertiesData.write();
          }
          writeStringOrBuffer(stream, clientId);
          if (will) {
            if (protocolVersion === 5) {
              willProperties.write();
            }
            writeString(stream, will.topic);
            writeStringOrBuffer(stream, will.payload);
          }
          if (username != null) {
            writeStringOrBuffer(stream, username);
          }
          if (password != null) {
            writeStringOrBuffer(stream, password);
          }
          return true;
        }
        function connack(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var rc = version === 5 ? settings.reasonCode : settings.returnCode;
          var properties = settings.properties;
          var length = 2;
          if (typeof rc !== "number") {
            stream.emit("error", new Error("Invalid return code"));
            return false;
          }
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getProperties(stream, properties);
            length += propertiesData.length;
          }
          stream.write(protocol.CONNACK_HEADER);
          writeVarByteInt(stream, length);
          stream.write(settings.sessionPresent ? protocol.SESSIONPRESENT_HEADER : zeroBuf);
          stream.write(Buffer.from([rc]));
          if (propertiesData != null) {
            propertiesData.write();
          }
          return true;
        }
        function publish(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var qos = settings.qos || 0;
          var retain = settings.retain ? protocol.RETAIN_MASK : 0;
          var topic = settings.topic;
          var payload = settings.payload || empty;
          var id = settings.messageId;
          var properties = settings.properties;
          var length = 0;
          if (typeof topic === "string")
            length += Buffer.byteLength(topic) + 2;
          else if (Buffer.isBuffer(topic))
            length += topic.length + 2;
          else {
            stream.emit("error", new Error("Invalid topic"));
            return false;
          }
          if (!Buffer.isBuffer(payload))
            length += Buffer.byteLength(payload);
          else
            length += payload.length;
          if (qos && typeof id !== "number") {
            stream.emit("error", new Error("Invalid messageId"));
            return false;
          } else if (qos)
            length += 2;
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getProperties(stream, properties);
            length += propertiesData.length;
          }
          stream.write(protocol.PUBLISH_HEADER[qos][settings.dup ? 1 : 0][retain ? 1 : 0]);
          writeVarByteInt(stream, length);
          writeNumber(stream, byteLength(topic));
          stream.write(topic);
          if (qos > 0)
            writeNumber(stream, id);
          if (propertiesData != null) {
            propertiesData.write();
          }
          return stream.write(payload);
        }
        function confirmation(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var type = settings.cmd || "puback";
          var id = settings.messageId;
          var dup = settings.dup && type === "pubrel" ? protocol.DUP_MASK : 0;
          var qos = 0;
          var reasonCode = settings.reasonCode;
          var properties = settings.properties;
          var length = version === 5 ? 3 : 2;
          if (type === "pubrel")
            qos = 1;
          if (typeof id !== "number") {
            stream.emit("error", new Error("Invalid messageId"));
            return false;
          }
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
            if (!propertiesData) {
              return false;
            }
            length += propertiesData.length;
          }
          stream.write(protocol.ACKS[type][qos][dup][0]);
          writeVarByteInt(stream, length);
          writeNumber(stream, id);
          if (version === 5) {
            stream.write(Buffer.from([reasonCode]));
          }
          if (propertiesData !== null) {
            propertiesData.write();
          }
          return true;
        }
        function subscribe(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var dup = settings.dup ? protocol.DUP_MASK : 0;
          var id = settings.messageId;
          var subs = settings.subscriptions;
          var properties = settings.properties;
          var length = 0;
          if (typeof id !== "number") {
            stream.emit("error", new Error("Invalid messageId"));
            return false;
          } else
            length += 2;
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getProperties(stream, properties);
            length += propertiesData.length;
          }
          if (typeof subs === "object" && subs.length) {
            for (var i = 0; i < subs.length; i += 1) {
              var itopic = subs[i].topic;
              var iqos = subs[i].qos;
              if (typeof itopic !== "string") {
                stream.emit("error", new Error("Invalid subscriptions - invalid topic"));
                return false;
              }
              if (typeof iqos !== "number") {
                stream.emit("error", new Error("Invalid subscriptions - invalid qos"));
                return false;
              }
              if (version === 5) {
                var nl = subs[i].nl || false;
                if (typeof nl !== "boolean") {
                  stream.emit("error", new Error("Invalid subscriptions - invalid No Local"));
                  return false;
                }
                var rap = subs[i].rap || false;
                if (typeof rap !== "boolean") {
                  stream.emit("error", new Error("Invalid subscriptions - invalid Retain as Published"));
                  return false;
                }
                var rh = subs[i].rh || 0;
                if (typeof rh !== "number" || rh > 2) {
                  stream.emit("error", new Error("Invalid subscriptions - invalid Retain Handling"));
                  return false;
                }
              }
              length += Buffer.byteLength(itopic) + 2 + 1;
            }
          } else {
            stream.emit("error", new Error("Invalid subscriptions"));
            return false;
          }
          stream.write(protocol.SUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);
          writeVarByteInt(stream, length);
          writeNumber(stream, id);
          if (propertiesData !== null) {
            propertiesData.write();
          }
          var result = true;
          for (var j = 0; j < subs.length; j++) {
            var sub = subs[j];
            var jtopic = sub.topic;
            var jqos = sub.qos;
            var jnl = +sub.nl;
            var jrap = +sub.rap;
            var jrh = sub.rh;
            var joptions;
            writeString(stream, jtopic);
            joptions = protocol.SUBSCRIBE_OPTIONS_QOS[jqos];
            if (version === 5) {
              joptions |= jnl ? protocol.SUBSCRIBE_OPTIONS_NL : 0;
              joptions |= jrap ? protocol.SUBSCRIBE_OPTIONS_RAP : 0;
              joptions |= jrh ? protocol.SUBSCRIBE_OPTIONS_RH[jrh] : 0;
            }
            result = stream.write(Buffer.from([joptions]));
          }
          return result;
        }
        function suback(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var id = settings.messageId;
          var granted = settings.granted;
          var properties = settings.properties;
          var length = 0;
          if (typeof id !== "number") {
            stream.emit("error", new Error("Invalid messageId"));
            return false;
          } else
            length += 2;
          if (typeof granted === "object" && granted.length) {
            for (var i = 0; i < granted.length; i += 1) {
              if (typeof granted[i] !== "number") {
                stream.emit("error", new Error("Invalid qos vector"));
                return false;
              }
              length += 1;
            }
          } else {
            stream.emit("error", new Error("Invalid qos vector"));
            return false;
          }
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
            if (!propertiesData) {
              return false;
            }
            length += propertiesData.length;
          }
          stream.write(protocol.SUBACK_HEADER);
          writeVarByteInt(stream, length);
          writeNumber(stream, id);
          if (propertiesData !== null) {
            propertiesData.write();
          }
          return stream.write(Buffer.from(granted));
        }
        function unsubscribe(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var id = settings.messageId;
          var dup = settings.dup ? protocol.DUP_MASK : 0;
          var unsubs = settings.unsubscriptions;
          var properties = settings.properties;
          var length = 0;
          if (typeof id !== "number") {
            stream.emit("error", new Error("Invalid messageId"));
            return false;
          } else {
            length += 2;
          }
          if (typeof unsubs === "object" && unsubs.length) {
            for (var i = 0; i < unsubs.length; i += 1) {
              if (typeof unsubs[i] !== "string") {
                stream.emit("error", new Error("Invalid unsubscriptions"));
                return false;
              }
              length += Buffer.byteLength(unsubs[i]) + 2;
            }
          } else {
            stream.emit("error", new Error("Invalid unsubscriptions"));
            return false;
          }
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getProperties(stream, properties);
            length += propertiesData.length;
          }
          stream.write(protocol.UNSUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);
          writeVarByteInt(stream, length);
          writeNumber(stream, id);
          if (propertiesData !== null) {
            propertiesData.write();
          }
          var result = true;
          for (var j = 0; j < unsubs.length; j++) {
            result = writeString(stream, unsubs[j]);
          }
          return result;
        }
        function unsuback(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var id = settings.messageId;
          var dup = settings.dup ? protocol.DUP_MASK : 0;
          var granted = settings.granted;
          var properties = settings.properties;
          var type = settings.cmd;
          var qos = 0;
          var length = 2;
          if (typeof id !== "number") {
            stream.emit("error", new Error("Invalid messageId"));
            return false;
          }
          if (version === 5) {
            if (typeof granted === "object" && granted.length) {
              for (var i = 0; i < granted.length; i += 1) {
                if (typeof granted[i] !== "number") {
                  stream.emit("error", new Error("Invalid qos vector"));
                  return false;
                }
                length += 1;
              }
            } else {
              stream.emit("error", new Error("Invalid qos vector"));
              return false;
            }
          }
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
            if (!propertiesData) {
              return false;
            }
            length += propertiesData.length;
          }
          stream.write(protocol.ACKS[type][qos][dup][0]);
          writeVarByteInt(stream, length);
          writeNumber(stream, id);
          if (propertiesData !== null) {
            propertiesData.write();
          }
          if (version === 5) {
            stream.write(Buffer.from(granted));
          }
          return true;
        }
        function emptyPacket(packet, stream, opts) {
          return stream.write(protocol.EMPTY[packet.cmd]);
        }
        function disconnect(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var reasonCode = settings.reasonCode;
          var properties = settings.properties;
          var length = version === 5 ? 1 : 0;
          var propertiesData = null;
          if (version === 5) {
            propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
            if (!propertiesData) {
              return false;
            }
            length += propertiesData.length;
          }
          stream.write(Buffer.from([protocol.codes["disconnect"] << 4]));
          writeVarByteInt(stream, length);
          if (version === 5) {
            stream.write(Buffer.from([reasonCode]));
          }
          if (propertiesData !== null) {
            propertiesData.write();
          }
          return true;
        }
        function auth(packet, stream, opts) {
          var version = opts ? opts.protocolVersion : 4;
          var settings = packet || {};
          var reasonCode = settings.reasonCode;
          var properties = settings.properties;
          var length = version === 5 ? 1 : 0;
          if (version !== 5)
            stream.emit("error", new Error("Invalid mqtt version for auth packet"));
          var propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
          stream.write(Buffer.from([protocol.codes["auth"] << 4]));
          writeVarByteInt(stream, length);
          stream.write(Buffer.from([reasonCode]));
          if (propertiesData !== null) {
            propertiesData.write();
          }
          return true;
        }
        var varByteIntCache = {};
        function writeVarByteInt(stream, num) {
          var buffer = varByteIntCache[num];
          if (!buffer) {
            buffer = genBufVariableByteInt(num).data;
            if (num < 16384)
              varByteIntCache[num] = buffer;
          }
          stream.write(buffer);
        }
        function writeString(stream, string) {
          var strlen = Buffer.byteLength(string);
          writeNumber(stream, strlen);
          stream.write(string, "utf8");
        }
        function writeStringPair(stream, name, value) {
          writeString(stream, name);
          writeString(stream, value);
        }
        function writeNumberCached(stream, number) {
          return stream.write(numCache[number]);
        }
        function writeNumberGenerated(stream, number) {
          return stream.write(generateNumber(number));
        }
        function write4ByteNumber(stream, number) {
          return stream.write(generate4ByteBuffer(number));
        }
        function writeStringOrBuffer(stream, toWrite) {
          if (typeof toWrite === "string") {
            writeString(stream, toWrite);
          } else if (toWrite) {
            writeNumber(stream, toWrite.length);
            stream.write(toWrite);
          } else
            writeNumber(stream, 0);
        }
        function getProperties(stream, properties) {
          if (typeof properties !== "object" || properties.length != null) {
            return {
              length: 1,
              write: function() {
                writeProperties(stream, {}, 0);
              }
            };
          }
          var propertiesLength = 0;
          function getLengthProperty(name) {
            var type = protocol.propertiesTypes[name];
            var value = properties[name];
            var length = 0;
            switch (type) {
              case "byte": {
                if (typeof value !== "boolean") {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += 1 + 1;
                break;
              }
              case "int8": {
                if (typeof value !== "number") {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += 1 + 1;
                break;
              }
              case "binary": {
                if (value && value === null) {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += 1 + Buffer.byteLength(value) + 2;
                break;
              }
              case "int16": {
                if (typeof value !== "number") {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += 1 + 2;
                break;
              }
              case "int32": {
                if (typeof value !== "number") {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += 1 + 4;
                break;
              }
              case "var": {
                if (typeof value !== "number") {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += 1 + genBufVariableByteInt(value).length;
                break;
              }
              case "string": {
                if (typeof value !== "string") {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += 1 + 2 + Buffer.byteLength(value.toString());
                break;
              }
              case "pair": {
                if (typeof value !== "object") {
                  stream.emit("error", new Error("Invalid " + name));
                  return false;
                }
                length += Object.getOwnPropertyNames(value).reduce(function(result, name2) {
                  result += 1 + 2 + Buffer.byteLength(name2.toString()) + 2 + Buffer.byteLength(value[name2].toString());
                  return result;
                }, 0);
                break;
              }
              default: {
                stream.emit("error", new Error("Invalid property " + name));
                return false;
              }
            }
            return length;
          }
          if (properties) {
            for (var propName in properties) {
              var propLength = getLengthProperty(propName);
              if (!propLength)
                return false;
              propertiesLength += propLength;
            }
          }
          var propertiesLengthLength = genBufVariableByteInt(propertiesLength).length;
          return {
            length: propertiesLengthLength + propertiesLength,
            write: function() {
              writeProperties(stream, properties, propertiesLength);
            }
          };
        }
        function getPropertiesByMaximumPacketSize(stream, properties, opts, length) {
          var mayEmptyProps = ["reasonString", "userProperties"];
          var maximumPacketSize = opts && opts.properties && opts.properties.maximumPacketSize ? opts.properties.maximumPacketSize : 0;
          var propertiesData = getProperties(stream, properties);
          if (maximumPacketSize) {
            while (length + propertiesData.length > maximumPacketSize) {
              var currentMayEmptyProp = mayEmptyProps.shift();
              if (currentMayEmptyProp && properties[currentMayEmptyProp]) {
                delete properties[currentMayEmptyProp];
                propertiesData = getProperties(stream, properties);
              } else {
                return false;
              }
            }
          }
          return propertiesData;
        }
        function writeProperties(stream, properties, propertiesLength) {
          writeVarByteInt(stream, propertiesLength);
          for (var propName in properties) {
            if (properties.hasOwnProperty(propName) && properties[propName] !== null) {
              var value = properties[propName];
              var type = protocol.propertiesTypes[propName];
              switch (type) {
                case "byte": {
                  stream.write(Buffer.from([protocol.properties[propName]]));
                  stream.write(Buffer.from([+value]));
                  break;
                }
                case "int8": {
                  stream.write(Buffer.from([protocol.properties[propName]]));
                  stream.write(Buffer.from([value]));
                  break;
                }
                case "binary": {
                  stream.write(Buffer.from([protocol.properties[propName]]));
                  writeStringOrBuffer(stream, value);
                  break;
                }
                case "int16": {
                  stream.write(Buffer.from([protocol.properties[propName]]));
                  writeNumber(stream, value);
                  break;
                }
                case "int32": {
                  stream.write(Buffer.from([protocol.properties[propName]]));
                  write4ByteNumber(stream, value);
                  break;
                }
                case "var": {
                  stream.write(Buffer.from([protocol.properties[propName]]));
                  writeVarByteInt(stream, value);
                  break;
                }
                case "string": {
                  stream.write(Buffer.from([protocol.properties[propName]]));
                  writeString(stream, value);
                  break;
                }
                case "pair": {
                  Object.getOwnPropertyNames(value).forEach(function(name) {
                    stream.write(Buffer.from([protocol.properties[propName]]));
                    writeStringPair(stream, name.toString(), value[name].toString());
                  });
                  break;
                }
                default: {
                  stream.emit("error", new Error("Invalid property " + propName));
                  return false;
                }
              }
            }
          }
        }
        function byteLength(bufOrString) {
          if (!bufOrString)
            return 0;
          else if (bufOrString instanceof Buffer)
            return bufOrString.length;
          else
            return Buffer.byteLength(bufOrString);
        }
        function isStringOrBuffer(field) {
          return typeof field === "string" || field instanceof Buffer;
        }
        module3.exports = generate;
      }, { "./constants": 82, "./numbers": 86, "process-nextick-args": 91, "safe-buffer": 110 }], 90: [function(require2, module3, exports3) {
        var wrappy = require2("wrappy");
        module3.exports = wrappy(once);
        module3.exports.strict = wrappy(onceStrict);
        once.proto = once(function() {
          Object.defineProperty(Function.prototype, "once", {
            value: function() {
              return once(this);
            },
            configurable: true
          });
          Object.defineProperty(Function.prototype, "onceStrict", {
            value: function() {
              return onceStrict(this);
            },
            configurable: true
          });
        });
        function once(fn) {
          var f = function() {
            if (f.called)
              return f.value;
            f.called = true;
            return f.value = fn.apply(this, arguments);
          };
          f.called = false;
          return f;
        }
        function onceStrict(fn) {
          var f = function() {
            if (f.called)
              throw new Error(f.onceError);
            f.called = true;
            return f.value = fn.apply(this, arguments);
          };
          var name = fn.name || "Function wrapped with `once`";
          f.onceError = name + " shouldn't be called more than once";
          f.called = false;
          return f;
        }
      }, { "wrappy": 120 }], 91: [function(require2, module3, exports3) {
        (function(process) {
          if (!process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.indexOf("v1.8.") !== 0) {
            module3.exports = { nextTick };
          } else {
            module3.exports = process;
          }
          function nextTick(fn, arg1, arg2, arg3) {
            if (typeof fn !== "function") {
              throw new TypeError('"callback" argument must be a function');
            }
            var len = arguments.length;
            var args, i;
            switch (len) {
              case 0:
              case 1:
                return process.nextTick(fn);
              case 2:
                return process.nextTick(function afterTickOne() {
                  fn.call(null, arg1);
                });
              case 3:
                return process.nextTick(function afterTickTwo() {
                  fn.call(null, arg1, arg2);
                });
              case 4:
                return process.nextTick(function afterTickThree() {
                  fn.call(null, arg1, arg2, arg3);
                });
              default:
                args = new Array(len - 1);
                i = 0;
                while (i < args.length) {
                  args[i++] = arguments[i];
                }
                return process.nextTick(function afterTick() {
                  fn.apply(null, args);
                });
            }
          }
        }).call(this, require2("_process"));
      }, { "_process": 92 }], 92: [function(require2, module3, exports3) {
        var process = module3.exports = {};
        var cachedSetTimeout;
        var cachedClearTimeout;
        function defaultSetTimout() {
          throw new Error("setTimeout has not been defined");
        }
        function defaultClearTimeout() {
          throw new Error("clearTimeout has not been defined");
        }
        (function() {
          try {
            if (typeof setTimeout === "function") {
              cachedSetTimeout = setTimeout;
            } else {
              cachedSetTimeout = defaultSetTimout;
            }
          } catch (e) {
            cachedSetTimeout = defaultSetTimout;
          }
          try {
            if (typeof clearTimeout === "function") {
              cachedClearTimeout = clearTimeout;
            } else {
              cachedClearTimeout = defaultClearTimeout;
            }
          } catch (e) {
            cachedClearTimeout = defaultClearTimeout;
          }
        })();
        function runTimeout(fun) {
          if (cachedSetTimeout === setTimeout) {
            return setTimeout(fun, 0);
          }
          if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
          }
          try {
            return cachedSetTimeout(fun, 0);
          } catch (e) {
            try {
              return cachedSetTimeout.call(null, fun, 0);
            } catch (e2) {
              return cachedSetTimeout.call(this, fun, 0);
            }
          }
        }
        function runClearTimeout(marker) {
          if (cachedClearTimeout === clearTimeout) {
            return clearTimeout(marker);
          }
          if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
          }
          try {
            return cachedClearTimeout(marker);
          } catch (e) {
            try {
              return cachedClearTimeout.call(null, marker);
            } catch (e2) {
              return cachedClearTimeout.call(this, marker);
            }
          }
        }
        var queue = [];
        var draining = false;
        var currentQueue;
        var queueIndex = -1;
        function cleanUpNextTick() {
          if (!draining || !currentQueue) {
            return;
          }
          draining = false;
          if (currentQueue.length) {
            queue = currentQueue.concat(queue);
          } else {
            queueIndex = -1;
          }
          if (queue.length) {
            drainQueue();
          }
        }
        function drainQueue() {
          if (draining) {
            return;
          }
          var timeout = runTimeout(cleanUpNextTick);
          draining = true;
          var len = queue.length;
          while (len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
              if (currentQueue) {
                currentQueue[queueIndex].run();
              }
            }
            queueIndex = -1;
            len = queue.length;
          }
          currentQueue = null;
          draining = false;
          runClearTimeout(timeout);
        }
        process.nextTick = function(fun) {
          var args = new Array(arguments.length - 1);
          if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
            }
          }
          queue.push(new Item(fun, args));
          if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
          }
        };
        function Item(fun, array) {
          this.fun = fun;
          this.array = array;
        }
        Item.prototype.run = function() {
          this.fun.apply(null, this.array);
        };
        process.title = "browser";
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = "";
        process.versions = {};
        function noop() {
        }
        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;
        process.listeners = function(name) {
          return [];
        };
        process.binding = function(name) {
          throw new Error("process.binding is not supported");
        };
        process.cwd = function() {
          return "/";
        };
        process.chdir = function(dir) {
          throw new Error("process.chdir is not supported");
        };
        process.umask = function() {
          return 0;
        };
      }, {}], 93: [function(require2, module3, exports3) {
        (function(global2) {
          (function(root) {
            var freeExports = typeof exports3 == "object" && exports3 && !exports3.nodeType && exports3;
            var freeModule = typeof module3 == "object" && module3 && !module3.nodeType && module3;
            var freeGlobal = typeof global2 == "object" && global2;
            if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) {
              root = freeGlobal;
            }
            var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
              "overflow": "Overflow: input needs wider integers to process",
              "not-basic": "Illegal input >= 0x80 (not a basic code point)",
              "invalid-input": "Invalid input"
            }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
            function error(type) {
              throw new RangeError(errors[type]);
            }
            function map(array, fn) {
              var length = array.length;
              var result = [];
              while (length--) {
                result[length] = fn(array[length]);
              }
              return result;
            }
            function mapDomain(string, fn) {
              var parts = string.split("@");
              var result = "";
              if (parts.length > 1) {
                result = parts[0] + "@";
                string = parts[1];
              }
              string = string.replace(regexSeparators, ".");
              var labels = string.split(".");
              var encoded = map(labels, fn).join(".");
              return result + encoded;
            }
            function ucs2decode(string) {
              var output = [], counter = 0, length = string.length, value, extra;
              while (counter < length) {
                value = string.charCodeAt(counter++);
                if (value >= 55296 && value <= 56319 && counter < length) {
                  extra = string.charCodeAt(counter++);
                  if ((extra & 64512) == 56320) {
                    output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
                  } else {
                    output.push(value);
                    counter--;
                  }
                } else {
                  output.push(value);
                }
              }
              return output;
            }
            function ucs2encode(array) {
              return map(array, function(value) {
                var output = "";
                if (value > 65535) {
                  value -= 65536;
                  output += stringFromCharCode(value >>> 10 & 1023 | 55296);
                  value = 56320 | value & 1023;
                }
                output += stringFromCharCode(value);
                return output;
              }).join("");
            }
            function basicToDigit(codePoint) {
              if (codePoint - 48 < 10) {
                return codePoint - 22;
              }
              if (codePoint - 65 < 26) {
                return codePoint - 65;
              }
              if (codePoint - 97 < 26) {
                return codePoint - 97;
              }
              return base;
            }
            function digitToBasic(digit, flag) {
              return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
            }
            function adapt(delta, numPoints, firstTime) {
              var k = 0;
              delta = firstTime ? floor(delta / damp) : delta >> 1;
              delta += floor(delta / numPoints);
              for (; delta > baseMinusTMin * tMax >> 1; k += base) {
                delta = floor(delta / baseMinusTMin);
              }
              return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
            }
            function decode(input) {
              var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
              basic = input.lastIndexOf(delimiter);
              if (basic < 0) {
                basic = 0;
              }
              for (j = 0; j < basic; ++j) {
                if (input.charCodeAt(j) >= 128) {
                  error("not-basic");
                }
                output.push(input.charCodeAt(j));
              }
              for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
                for (oldi = i, w = 1, k = base; ; k += base) {
                  if (index >= inputLength) {
                    error("invalid-input");
                  }
                  digit = basicToDigit(input.charCodeAt(index++));
                  if (digit >= base || digit > floor((maxInt - i) / w)) {
                    error("overflow");
                  }
                  i += digit * w;
                  t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                  if (digit < t) {
                    break;
                  }
                  baseMinusT = base - t;
                  if (w > floor(maxInt / baseMinusT)) {
                    error("overflow");
                  }
                  w *= baseMinusT;
                }
                out = output.length + 1;
                bias = adapt(i - oldi, out, oldi == 0);
                if (floor(i / out) > maxInt - n) {
                  error("overflow");
                }
                n += floor(i / out);
                i %= out;
                output.splice(i++, 0, n);
              }
              return ucs2encode(output);
            }
            function encode(input) {
              var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
              input = ucs2decode(input);
              inputLength = input.length;
              n = initialN;
              delta = 0;
              bias = initialBias;
              for (j = 0; j < inputLength; ++j) {
                currentValue = input[j];
                if (currentValue < 128) {
                  output.push(stringFromCharCode(currentValue));
                }
              }
              handledCPCount = basicLength = output.length;
              if (basicLength) {
                output.push(delimiter);
              }
              while (handledCPCount < inputLength) {
                for (m = maxInt, j = 0; j < inputLength; ++j) {
                  currentValue = input[j];
                  if (currentValue >= n && currentValue < m) {
                    m = currentValue;
                  }
                }
                handledCPCountPlusOne = handledCPCount + 1;
                if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
                  error("overflow");
                }
                delta += (m - n) * handledCPCountPlusOne;
                n = m;
                for (j = 0; j < inputLength; ++j) {
                  currentValue = input[j];
                  if (currentValue < n && ++delta > maxInt) {
                    error("overflow");
                  }
                  if (currentValue == n) {
                    for (q = delta, k = base; ; k += base) {
                      t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                      if (q < t) {
                        break;
                      }
                      qMinusT = q - t;
                      baseMinusT = base - t;
                      output.push(
                        stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                      );
                      q = floor(qMinusT / baseMinusT);
                    }
                    output.push(stringFromCharCode(digitToBasic(q, 0)));
                    bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
                    delta = 0;
                    ++handledCPCount;
                  }
                }
                ++delta;
                ++n;
              }
              return output.join("");
            }
            function toUnicode(input) {
              return mapDomain(input, function(string) {
                return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
              });
            }
            function toASCII(input) {
              return mapDomain(input, function(string) {
                return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
              });
            }
            punycode = {
              /**
               * A string representing the current Punycode.js version number.
               * @memberOf punycode
               * @type String
               */
              "version": "1.4.1",
              /**
               * An object of methods to convert from JavaScript's internal character
               * representation (UCS-2) to Unicode code points, and back.
               * @see <https://mathiasbynens.be/notes/javascript-encoding>
               * @memberOf punycode
               * @type Object
               */
              "ucs2": {
                "decode": ucs2decode,
                "encode": ucs2encode
              },
              "decode": decode,
              "encode": encode,
              "toASCII": toASCII,
              "toUnicode": toUnicode
            };
            if (freeExports && freeModule) {
              if (module3.exports == freeExports) {
                freeModule.exports = punycode;
              } else {
                for (key in punycode) {
                  punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
                }
              }
            } else {
              root.punycode = punycode;
            }
          })(this);
        }).call(this, typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
      }, {}], 94: [function(require2, module3, exports3) {
        function hasOwnProperty(obj, prop) {
          return Object.prototype.hasOwnProperty.call(obj, prop);
        }
        module3.exports = function(qs, sep, eq, options) {
          sep = sep || "&";
          eq = eq || "=";
          var obj = {};
          if (typeof qs !== "string" || qs.length === 0) {
            return obj;
          }
          var regexp = /\+/g;
          qs = qs.split(sep);
          var maxKeys = 1e3;
          if (options && typeof options.maxKeys === "number") {
            maxKeys = options.maxKeys;
          }
          var len = qs.length;
          if (maxKeys > 0 && len > maxKeys) {
            len = maxKeys;
          }
          for (var i = 0; i < len; ++i) {
            var x = qs[i].replace(regexp, "%20"), idx = x.indexOf(eq), kstr, vstr, k, v;
            if (idx >= 0) {
              kstr = x.substr(0, idx);
              vstr = x.substr(idx + 1);
            } else {
              kstr = x;
              vstr = "";
            }
            k = decodeURIComponent(kstr);
            v = decodeURIComponent(vstr);
            if (!hasOwnProperty(obj, k)) {
              obj[k] = v;
            } else if (isArray(obj[k])) {
              obj[k].push(v);
            } else {
              obj[k] = [obj[k], v];
            }
          }
          return obj;
        };
        var isArray = Array.isArray || function(xs) {
          return Object.prototype.toString.call(xs) === "[object Array]";
        };
      }, {}], 95: [function(require2, module3, exports3) {
        var stringifyPrimitive = function(v) {
          switch (typeof v) {
            case "string":
              return v;
            case "boolean":
              return v ? "true" : "false";
            case "number":
              return isFinite(v) ? v : "";
            default:
              return "";
          }
        };
        module3.exports = function(obj, sep, eq, name) {
          sep = sep || "&";
          eq = eq || "=";
          if (obj === null) {
            obj = void 0;
          }
          if (typeof obj === "object") {
            return map(objectKeys(obj), function(k) {
              var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
              if (isArray(obj[k])) {
                return map(obj[k], function(v) {
                  return ks + encodeURIComponent(stringifyPrimitive(v));
                }).join(sep);
              } else {
                return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
              }
            }).join(sep);
          }
          if (!name)
            return "";
          return encodeURIComponent(stringifyPrimitive(name)) + eq + encodeURIComponent(stringifyPrimitive(obj));
        };
        var isArray = Array.isArray || function(xs) {
          return Object.prototype.toString.call(xs) === "[object Array]";
        };
        function map(xs, f) {
          if (xs.map)
            return xs.map(f);
          var res = [];
          for (var i = 0; i < xs.length; i++) {
            res.push(f(xs[i], i));
          }
          return res;
        }
        var objectKeys = Object.keys || function(obj) {
          var res = [];
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key))
              res.push(key);
          }
          return res;
        };
      }, {}], 96: [function(require2, module3, exports3) {
        exports3.decode = exports3.parse = require2("./decode");
        exports3.encode = exports3.stringify = require2("./encode");
      }, { "./decode": 94, "./encode": 95 }], 97: [function(require2, module3, exports3) {
        module3.exports = require2("./lib/_stream_duplex.js");
      }, { "./lib/_stream_duplex.js": 98 }], 98: [function(require2, module3, exports3) {
        var pna = require2("process-nextick-args");
        var objectKeys = Object.keys || function(obj) {
          var keys2 = [];
          for (var key in obj) {
            keys2.push(key);
          }
          return keys2;
        };
        module3.exports = Duplex;
        var util = require2("core-util-is");
        util.inherits = require2("inherits");
        var Readable = require2("./_stream_readable");
        var Writable = require2("./_stream_writable");
        util.inherits(Duplex, Readable);
        {
          var keys = objectKeys(Writable.prototype);
          for (var v = 0; v < keys.length; v++) {
            var method = keys[v];
            if (!Duplex.prototype[method])
              Duplex.prototype[method] = Writable.prototype[method];
          }
        }
        function Duplex(options) {
          if (!(this instanceof Duplex))
            return new Duplex(options);
          Readable.call(this, options);
          Writable.call(this, options);
          if (options && options.readable === false)
            this.readable = false;
          if (options && options.writable === false)
            this.writable = false;
          this.allowHalfOpen = true;
          if (options && options.allowHalfOpen === false)
            this.allowHalfOpen = false;
          this.once("end", onend);
        }
        Object.defineProperty(Duplex.prototype, "writableHighWaterMark", {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function() {
            return this._writableState.highWaterMark;
          }
        });
        function onend() {
          if (this.allowHalfOpen || this._writableState.ended)
            return;
          pna.nextTick(onEndNT, this);
        }
        function onEndNT(self2) {
          self2.end();
        }
        Object.defineProperty(Duplex.prototype, "destroyed", {
          get: function() {
            if (this._readableState === void 0 || this._writableState === void 0) {
              return false;
            }
            return this._readableState.destroyed && this._writableState.destroyed;
          },
          set: function(value) {
            if (this._readableState === void 0 || this._writableState === void 0) {
              return;
            }
            this._readableState.destroyed = value;
            this._writableState.destroyed = value;
          }
        });
        Duplex.prototype._destroy = function(err, cb) {
          this.push(null);
          this.end();
          pna.nextTick(cb, err);
        };
      }, { "./_stream_readable": 100, "./_stream_writable": 102, "core-util-is": 14, "inherits": 80, "process-nextick-args": 91 }], 99: [function(require2, module3, exports3) {
        module3.exports = PassThrough;
        var Transform = require2("./_stream_transform");
        var util = require2("core-util-is");
        util.inherits = require2("inherits");
        util.inherits(PassThrough, Transform);
        function PassThrough(options) {
          if (!(this instanceof PassThrough))
            return new PassThrough(options);
          Transform.call(this, options);
        }
        PassThrough.prototype._transform = function(chunk, encoding, cb) {
          cb(null, chunk);
        };
      }, { "./_stream_transform": 101, "core-util-is": 14, "inherits": 80 }], 100: [function(require2, module3, exports3) {
        (function(process, global2) {
          var pna = require2("process-nextick-args");
          module3.exports = Readable;
          var isArray = require2("isarray");
          var Duplex;
          Readable.ReadableState = ReadableState;
          require2("events").EventEmitter;
          var EElistenerCount = function(emitter, type) {
            return emitter.listeners(type).length;
          };
          var Stream = require2("./internal/streams/stream");
          var Buffer = require2("safe-buffer").Buffer;
          var OurUint8Array = global2.Uint8Array || function() {
          };
          function _uint8ArrayToBuffer(chunk) {
            return Buffer.from(chunk);
          }
          function _isUint8Array(obj) {
            return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
          }
          var util = require2("core-util-is");
          util.inherits = require2("inherits");
          var debugUtil = require2("util");
          var debug = void 0;
          if (debugUtil && debugUtil.debuglog) {
            debug = debugUtil.debuglog("stream");
          } else {
            debug = function() {
            };
          }
          var BufferList = require2("./internal/streams/BufferList");
          var destroyImpl = require2("./internal/streams/destroy");
          var StringDecoder;
          util.inherits(Readable, Stream);
          var kProxyEvents = ["error", "close", "destroy", "pause", "resume"];
          function prependListener(emitter, event, fn) {
            if (typeof emitter.prependListener === "function")
              return emitter.prependListener(event, fn);
            if (!emitter._events || !emitter._events[event])
              emitter.on(event, fn);
            else if (isArray(emitter._events[event]))
              emitter._events[event].unshift(fn);
            else
              emitter._events[event] = [fn, emitter._events[event]];
          }
          function ReadableState(options, stream) {
            Duplex = Duplex || require2("./_stream_duplex");
            options = options || {};
            var isDuplex = stream instanceof Duplex;
            this.objectMode = !!options.objectMode;
            if (isDuplex)
              this.objectMode = this.objectMode || !!options.readableObjectMode;
            var hwm = options.highWaterMark;
            var readableHwm = options.readableHighWaterMark;
            var defaultHwm = this.objectMode ? 16 : 16 * 1024;
            if (hwm || hwm === 0)
              this.highWaterMark = hwm;
            else if (isDuplex && (readableHwm || readableHwm === 0))
              this.highWaterMark = readableHwm;
            else
              this.highWaterMark = defaultHwm;
            this.highWaterMark = Math.floor(this.highWaterMark);
            this.buffer = new BufferList();
            this.length = 0;
            this.pipes = null;
            this.pipesCount = 0;
            this.flowing = null;
            this.ended = false;
            this.endEmitted = false;
            this.reading = false;
            this.sync = true;
            this.needReadable = false;
            this.emittedReadable = false;
            this.readableListening = false;
            this.resumeScheduled = false;
            this.destroyed = false;
            this.defaultEncoding = options.defaultEncoding || "utf8";
            this.awaitDrain = 0;
            this.readingMore = false;
            this.decoder = null;
            this.encoding = null;
            if (options.encoding) {
              if (!StringDecoder)
                StringDecoder = require2("string_decoder/").StringDecoder;
              this.decoder = new StringDecoder(options.encoding);
              this.encoding = options.encoding;
            }
          }
          function Readable(options) {
            Duplex = Duplex || require2("./_stream_duplex");
            if (!(this instanceof Readable))
              return new Readable(options);
            this._readableState = new ReadableState(options, this);
            this.readable = true;
            if (options) {
              if (typeof options.read === "function")
                this._read = options.read;
              if (typeof options.destroy === "function")
                this._destroy = options.destroy;
            }
            Stream.call(this);
          }
          Object.defineProperty(Readable.prototype, "destroyed", {
            get: function() {
              if (this._readableState === void 0) {
                return false;
              }
              return this._readableState.destroyed;
            },
            set: function(value) {
              if (!this._readableState) {
                return;
              }
              this._readableState.destroyed = value;
            }
          });
          Readable.prototype.destroy = destroyImpl.destroy;
          Readable.prototype._undestroy = destroyImpl.undestroy;
          Readable.prototype._destroy = function(err, cb) {
            this.push(null);
            cb(err);
          };
          Readable.prototype.push = function(chunk, encoding) {
            var state = this._readableState;
            var skipChunkCheck;
            if (!state.objectMode) {
              if (typeof chunk === "string") {
                encoding = encoding || state.defaultEncoding;
                if (encoding !== state.encoding) {
                  chunk = Buffer.from(chunk, encoding);
                  encoding = "";
                }
                skipChunkCheck = true;
              }
            } else {
              skipChunkCheck = true;
            }
            return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
          };
          Readable.prototype.unshift = function(chunk) {
            return readableAddChunk(this, chunk, null, true, false);
          };
          function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
            var state = stream._readableState;
            if (chunk === null) {
              state.reading = false;
              onEofChunk(stream, state);
            } else {
              var er;
              if (!skipChunkCheck)
                er = chunkInvalid(state, chunk);
              if (er) {
                stream.emit("error", er);
              } else if (state.objectMode || chunk && chunk.length > 0) {
                if (typeof chunk !== "string" && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
                  chunk = _uint8ArrayToBuffer(chunk);
                }
                if (addToFront) {
                  if (state.endEmitted)
                    stream.emit("error", new Error("stream.unshift() after end event"));
                  else
                    addChunk(stream, state, chunk, true);
                } else if (state.ended) {
                  stream.emit("error", new Error("stream.push() after EOF"));
                } else {
                  state.reading = false;
                  if (state.decoder && !encoding) {
                    chunk = state.decoder.write(chunk);
                    if (state.objectMode || chunk.length !== 0)
                      addChunk(stream, state, chunk, false);
                    else
                      maybeReadMore(stream, state);
                  } else {
                    addChunk(stream, state, chunk, false);
                  }
                }
              } else if (!addToFront) {
                state.reading = false;
              }
            }
            return needMoreData(state);
          }
          function addChunk(stream, state, chunk, addToFront) {
            if (state.flowing && state.length === 0 && !state.sync) {
              stream.emit("data", chunk);
              stream.read(0);
            } else {
              state.length += state.objectMode ? 1 : chunk.length;
              if (addToFront)
                state.buffer.unshift(chunk);
              else
                state.buffer.push(chunk);
              if (state.needReadable)
                emitReadable(stream);
            }
            maybeReadMore(stream, state);
          }
          function chunkInvalid(state, chunk) {
            var er;
            if (!_isUint8Array(chunk) && typeof chunk !== "string" && chunk !== void 0 && !state.objectMode) {
              er = new TypeError("Invalid non-string/buffer chunk");
            }
            return er;
          }
          function needMoreData(state) {
            return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
          }
          Readable.prototype.isPaused = function() {
            return this._readableState.flowing === false;
          };
          Readable.prototype.setEncoding = function(enc) {
            if (!StringDecoder)
              StringDecoder = require2("string_decoder/").StringDecoder;
            this._readableState.decoder = new StringDecoder(enc);
            this._readableState.encoding = enc;
            return this;
          };
          var MAX_HWM = 8388608;
          function computeNewHighWaterMark(n) {
            if (n >= MAX_HWM) {
              n = MAX_HWM;
            } else {
              n--;
              n |= n >>> 1;
              n |= n >>> 2;
              n |= n >>> 4;
              n |= n >>> 8;
              n |= n >>> 16;
              n++;
            }
            return n;
          }
          function howMuchToRead(n, state) {
            if (n <= 0 || state.length === 0 && state.ended)
              return 0;
            if (state.objectMode)
              return 1;
            if (n !== n) {
              if (state.flowing && state.length)
                return state.buffer.head.data.length;
              else
                return state.length;
            }
            if (n > state.highWaterMark)
              state.highWaterMark = computeNewHighWaterMark(n);
            if (n <= state.length)
              return n;
            if (!state.ended) {
              state.needReadable = true;
              return 0;
            }
            return state.length;
          }
          Readable.prototype.read = function(n) {
            debug("read", n);
            n = parseInt(n, 10);
            var state = this._readableState;
            var nOrig = n;
            if (n !== 0)
              state.emittedReadable = false;
            if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
              debug("read: emitReadable", state.length, state.ended);
              if (state.length === 0 && state.ended)
                endReadable(this);
              else
                emitReadable(this);
              return null;
            }
            n = howMuchToRead(n, state);
            if (n === 0 && state.ended) {
              if (state.length === 0)
                endReadable(this);
              return null;
            }
            var doRead = state.needReadable;
            debug("need readable", doRead);
            if (state.length === 0 || state.length - n < state.highWaterMark) {
              doRead = true;
              debug("length less than watermark", doRead);
            }
            if (state.ended || state.reading) {
              doRead = false;
              debug("reading or ended", doRead);
            } else if (doRead) {
              debug("do read");
              state.reading = true;
              state.sync = true;
              if (state.length === 0)
                state.needReadable = true;
              this._read(state.highWaterMark);
              state.sync = false;
              if (!state.reading)
                n = howMuchToRead(nOrig, state);
            }
            var ret;
            if (n > 0)
              ret = fromList(n, state);
            else
              ret = null;
            if (ret === null) {
              state.needReadable = true;
              n = 0;
            } else {
              state.length -= n;
            }
            if (state.length === 0) {
              if (!state.ended)
                state.needReadable = true;
              if (nOrig !== n && state.ended)
                endReadable(this);
            }
            if (ret !== null)
              this.emit("data", ret);
            return ret;
          };
          function onEofChunk(stream, state) {
            if (state.ended)
              return;
            if (state.decoder) {
              var chunk = state.decoder.end();
              if (chunk && chunk.length) {
                state.buffer.push(chunk);
                state.length += state.objectMode ? 1 : chunk.length;
              }
            }
            state.ended = true;
            emitReadable(stream);
          }
          function emitReadable(stream) {
            var state = stream._readableState;
            state.needReadable = false;
            if (!state.emittedReadable) {
              debug("emitReadable", state.flowing);
              state.emittedReadable = true;
              if (state.sync)
                pna.nextTick(emitReadable_, stream);
              else
                emitReadable_(stream);
            }
          }
          function emitReadable_(stream) {
            debug("emit readable");
            stream.emit("readable");
            flow(stream);
          }
          function maybeReadMore(stream, state) {
            if (!state.readingMore) {
              state.readingMore = true;
              pna.nextTick(maybeReadMore_, stream, state);
            }
          }
          function maybeReadMore_(stream, state) {
            var len = state.length;
            while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
              debug("maybeReadMore read 0");
              stream.read(0);
              if (len === state.length)
                break;
              else
                len = state.length;
            }
            state.readingMore = false;
          }
          Readable.prototype._read = function(n) {
            this.emit("error", new Error("_read() is not implemented"));
          };
          Readable.prototype.pipe = function(dest, pipeOpts) {
            var src = this;
            var state = this._readableState;
            switch (state.pipesCount) {
              case 0:
                state.pipes = dest;
                break;
              case 1:
                state.pipes = [state.pipes, dest];
                break;
              default:
                state.pipes.push(dest);
                break;
            }
            state.pipesCount += 1;
            debug("pipe count=%d opts=%j", state.pipesCount, pipeOpts);
            var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
            var endFn = doEnd ? onend : unpipe;
            if (state.endEmitted)
              pna.nextTick(endFn);
            else
              src.once("end", endFn);
            dest.on("unpipe", onunpipe);
            function onunpipe(readable, unpipeInfo) {
              debug("onunpipe");
              if (readable === src) {
                if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
                  unpipeInfo.hasUnpiped = true;
                  cleanup();
                }
              }
            }
            function onend() {
              debug("onend");
              dest.end();
            }
            var ondrain = pipeOnDrain(src);
            dest.on("drain", ondrain);
            var cleanedUp = false;
            function cleanup() {
              debug("cleanup");
              dest.removeListener("close", onclose);
              dest.removeListener("finish", onfinish);
              dest.removeListener("drain", ondrain);
              dest.removeListener("error", onerror);
              dest.removeListener("unpipe", onunpipe);
              src.removeListener("end", onend);
              src.removeListener("end", unpipe);
              src.removeListener("data", ondata);
              cleanedUp = true;
              if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain))
                ondrain();
            }
            var increasedAwaitDrain = false;
            src.on("data", ondata);
            function ondata(chunk) {
              debug("ondata");
              increasedAwaitDrain = false;
              var ret = dest.write(chunk);
              if (false === ret && !increasedAwaitDrain) {
                if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
                  debug("false write response, pause", src._readableState.awaitDrain);
                  src._readableState.awaitDrain++;
                  increasedAwaitDrain = true;
                }
                src.pause();
              }
            }
            function onerror(er) {
              debug("onerror", er);
              unpipe();
              dest.removeListener("error", onerror);
              if (EElistenerCount(dest, "error") === 0)
                dest.emit("error", er);
            }
            prependListener(dest, "error", onerror);
            function onclose() {
              dest.removeListener("finish", onfinish);
              unpipe();
            }
            dest.once("close", onclose);
            function onfinish() {
              debug("onfinish");
              dest.removeListener("close", onclose);
              unpipe();
            }
            dest.once("finish", onfinish);
            function unpipe() {
              debug("unpipe");
              src.unpipe(dest);
            }
            dest.emit("pipe", src);
            if (!state.flowing) {
              debug("pipe resume");
              src.resume();
            }
            return dest;
          };
          function pipeOnDrain(src) {
            return function() {
              var state = src._readableState;
              debug("pipeOnDrain", state.awaitDrain);
              if (state.awaitDrain)
                state.awaitDrain--;
              if (state.awaitDrain === 0 && EElistenerCount(src, "data")) {
                state.flowing = true;
                flow(src);
              }
            };
          }
          Readable.prototype.unpipe = function(dest) {
            var state = this._readableState;
            var unpipeInfo = { hasUnpiped: false };
            if (state.pipesCount === 0)
              return this;
            if (state.pipesCount === 1) {
              if (dest && dest !== state.pipes)
                return this;
              if (!dest)
                dest = state.pipes;
              state.pipes = null;
              state.pipesCount = 0;
              state.flowing = false;
              if (dest)
                dest.emit("unpipe", this, unpipeInfo);
              return this;
            }
            if (!dest) {
              var dests = state.pipes;
              var len = state.pipesCount;
              state.pipes = null;
              state.pipesCount = 0;
              state.flowing = false;
              for (var i = 0; i < len; i++) {
                dests[i].emit("unpipe", this, unpipeInfo);
              }
              return this;
            }
            var index = indexOf(state.pipes, dest);
            if (index === -1)
              return this;
            state.pipes.splice(index, 1);
            state.pipesCount -= 1;
            if (state.pipesCount === 1)
              state.pipes = state.pipes[0];
            dest.emit("unpipe", this, unpipeInfo);
            return this;
          };
          Readable.prototype.on = function(ev, fn) {
            var res = Stream.prototype.on.call(this, ev, fn);
            if (ev === "data") {
              if (this._readableState.flowing !== false)
                this.resume();
            } else if (ev === "readable") {
              var state = this._readableState;
              if (!state.endEmitted && !state.readableListening) {
                state.readableListening = state.needReadable = true;
                state.emittedReadable = false;
                if (!state.reading) {
                  pna.nextTick(nReadingNextTick, this);
                } else if (state.length) {
                  emitReadable(this);
                }
              }
            }
            return res;
          };
          Readable.prototype.addListener = Readable.prototype.on;
          function nReadingNextTick(self2) {
            debug("readable nexttick read 0");
            self2.read(0);
          }
          Readable.prototype.resume = function() {
            var state = this._readableState;
            if (!state.flowing) {
              debug("resume");
              state.flowing = true;
              resume(this, state);
            }
            return this;
          };
          function resume(stream, state) {
            if (!state.resumeScheduled) {
              state.resumeScheduled = true;
              pna.nextTick(resume_, stream, state);
            }
          }
          function resume_(stream, state) {
            if (!state.reading) {
              debug("resume read 0");
              stream.read(0);
            }
            state.resumeScheduled = false;
            state.awaitDrain = 0;
            stream.emit("resume");
            flow(stream);
            if (state.flowing && !state.reading)
              stream.read(0);
          }
          Readable.prototype.pause = function() {
            debug("call pause flowing=%j", this._readableState.flowing);
            if (false !== this._readableState.flowing) {
              debug("pause");
              this._readableState.flowing = false;
              this.emit("pause");
            }
            return this;
          };
          function flow(stream) {
            var state = stream._readableState;
            debug("flow", state.flowing);
            while (state.flowing && stream.read() !== null) {
            }
          }
          Readable.prototype.wrap = function(stream) {
            var _this = this;
            var state = this._readableState;
            var paused = false;
            stream.on("end", function() {
              debug("wrapped end");
              if (state.decoder && !state.ended) {
                var chunk = state.decoder.end();
                if (chunk && chunk.length)
                  _this.push(chunk);
              }
              _this.push(null);
            });
            stream.on("data", function(chunk) {
              debug("wrapped data");
              if (state.decoder)
                chunk = state.decoder.write(chunk);
              if (state.objectMode && (chunk === null || chunk === void 0))
                return;
              else if (!state.objectMode && (!chunk || !chunk.length))
                return;
              var ret = _this.push(chunk);
              if (!ret) {
                paused = true;
                stream.pause();
              }
            });
            for (var i in stream) {
              if (this[i] === void 0 && typeof stream[i] === "function") {
                this[i] = /* @__PURE__ */ function(method) {
                  return function() {
                    return stream[method].apply(stream, arguments);
                  };
                }(i);
              }
            }
            for (var n = 0; n < kProxyEvents.length; n++) {
              stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
            }
            this._read = function(n2) {
              debug("wrapped _read", n2);
              if (paused) {
                paused = false;
                stream.resume();
              }
            };
            return this;
          };
          Object.defineProperty(Readable.prototype, "readableHighWaterMark", {
            // making it explicit this property is not enumerable
            // because otherwise some prototype manipulation in
            // userland will fail
            enumerable: false,
            get: function() {
              return this._readableState.highWaterMark;
            }
          });
          Readable._fromList = fromList;
          function fromList(n, state) {
            if (state.length === 0)
              return null;
            var ret;
            if (state.objectMode)
              ret = state.buffer.shift();
            else if (!n || n >= state.length) {
              if (state.decoder)
                ret = state.buffer.join("");
              else if (state.buffer.length === 1)
                ret = state.buffer.head.data;
              else
                ret = state.buffer.concat(state.length);
              state.buffer.clear();
            } else {
              ret = fromListPartial(n, state.buffer, state.decoder);
            }
            return ret;
          }
          function fromListPartial(n, list, hasStrings) {
            var ret;
            if (n < list.head.data.length) {
              ret = list.head.data.slice(0, n);
              list.head.data = list.head.data.slice(n);
            } else if (n === list.head.data.length) {
              ret = list.shift();
            } else {
              ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
            }
            return ret;
          }
          function copyFromBufferString(n, list) {
            var p = list.head;
            var c = 1;
            var ret = p.data;
            n -= ret.length;
            while (p = p.next) {
              var str = p.data;
              var nb = n > str.length ? str.length : n;
              if (nb === str.length)
                ret += str;
              else
                ret += str.slice(0, n);
              n -= nb;
              if (n === 0) {
                if (nb === str.length) {
                  ++c;
                  if (p.next)
                    list.head = p.next;
                  else
                    list.head = list.tail = null;
                } else {
                  list.head = p;
                  p.data = str.slice(nb);
                }
                break;
              }
              ++c;
            }
            list.length -= c;
            return ret;
          }
          function copyFromBuffer(n, list) {
            var ret = Buffer.allocUnsafe(n);
            var p = list.head;
            var c = 1;
            p.data.copy(ret);
            n -= p.data.length;
            while (p = p.next) {
              var buf = p.data;
              var nb = n > buf.length ? buf.length : n;
              buf.copy(ret, ret.length - n, 0, nb);
              n -= nb;
              if (n === 0) {
                if (nb === buf.length) {
                  ++c;
                  if (p.next)
                    list.head = p.next;
                  else
                    list.head = list.tail = null;
                } else {
                  list.head = p;
                  p.data = buf.slice(nb);
                }
                break;
              }
              ++c;
            }
            list.length -= c;
            return ret;
          }
          function endReadable(stream) {
            var state = stream._readableState;
            if (state.length > 0)
              throw new Error('"endReadable()" called on non-empty stream');
            if (!state.endEmitted) {
              state.ended = true;
              pna.nextTick(endReadableNT, state, stream);
            }
          }
          function endReadableNT(state, stream) {
            if (!state.endEmitted && state.length === 0) {
              state.endEmitted = true;
              stream.readable = false;
              stream.emit("end");
            }
          }
          function indexOf(xs, x) {
            for (var i = 0, l = xs.length; i < l; i++) {
              if (xs[i] === x)
                return i;
            }
            return -1;
          }
        }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
      }, { "./_stream_duplex": 98, "./internal/streams/BufferList": 103, "./internal/streams/destroy": 104, "./internal/streams/stream": 105, "_process": 92, "core-util-is": 14, "events": 13, "inherits": 80, "isarray": 106, "process-nextick-args": 91, "safe-buffer": 110, "string_decoder/": 107, "util": 11 }], 101: [function(require2, module3, exports3) {
        module3.exports = Transform;
        var Duplex = require2("./_stream_duplex");
        var util = require2("core-util-is");
        util.inherits = require2("inherits");
        util.inherits(Transform, Duplex);
        function afterTransform(er, data) {
          var ts = this._transformState;
          ts.transforming = false;
          var cb = ts.writecb;
          if (!cb) {
            return this.emit("error", new Error("write callback called multiple times"));
          }
          ts.writechunk = null;
          ts.writecb = null;
          if (data != null)
            this.push(data);
          cb(er);
          var rs = this._readableState;
          rs.reading = false;
          if (rs.needReadable || rs.length < rs.highWaterMark) {
            this._read(rs.highWaterMark);
          }
        }
        function Transform(options) {
          if (!(this instanceof Transform))
            return new Transform(options);
          Duplex.call(this, options);
          this._transformState = {
            afterTransform: afterTransform.bind(this),
            needTransform: false,
            transforming: false,
            writecb: null,
            writechunk: null,
            writeencoding: null
          };
          this._readableState.needReadable = true;
          this._readableState.sync = false;
          if (options) {
            if (typeof options.transform === "function")
              this._transform = options.transform;
            if (typeof options.flush === "function")
              this._flush = options.flush;
          }
          this.on("prefinish", prefinish);
        }
        function prefinish() {
          var _this = this;
          if (typeof this._flush === "function") {
            this._flush(function(er, data) {
              done(_this, er, data);
            });
          } else {
            done(this, null, null);
          }
        }
        Transform.prototype.push = function(chunk, encoding) {
          this._transformState.needTransform = false;
          return Duplex.prototype.push.call(this, chunk, encoding);
        };
        Transform.prototype._transform = function(chunk, encoding, cb) {
          throw new Error("_transform() is not implemented");
        };
        Transform.prototype._write = function(chunk, encoding, cb) {
          var ts = this._transformState;
          ts.writecb = cb;
          ts.writechunk = chunk;
          ts.writeencoding = encoding;
          if (!ts.transforming) {
            var rs = this._readableState;
            if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
              this._read(rs.highWaterMark);
          }
        };
        Transform.prototype._read = function(n) {
          var ts = this._transformState;
          if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
            ts.transforming = true;
            this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
          } else {
            ts.needTransform = true;
          }
        };
        Transform.prototype._destroy = function(err, cb) {
          var _this2 = this;
          Duplex.prototype._destroy.call(this, err, function(err2) {
            cb(err2);
            _this2.emit("close");
          });
        };
        function done(stream, er, data) {
          if (er)
            return stream.emit("error", er);
          if (data != null)
            stream.push(data);
          if (stream._writableState.length)
            throw new Error("Calling transform done when ws.length != 0");
          if (stream._transformState.transforming)
            throw new Error("Calling transform done when still transforming");
          return stream.push(null);
        }
      }, { "./_stream_duplex": 98, "core-util-is": 14, "inherits": 80 }], 102: [function(require2, module3, exports3) {
        (function(process, global2, setImmediate) {
          var pna = require2("process-nextick-args");
          module3.exports = Writable;
          function CorkedRequest(state) {
            var _this = this;
            this.next = null;
            this.entry = null;
            this.finish = function() {
              onCorkedFinish(_this, state);
            };
          }
          var asyncWrite = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
          var Duplex;
          Writable.WritableState = WritableState;
          var util = require2("core-util-is");
          util.inherits = require2("inherits");
          var internalUtil = {
            deprecate: require2("util-deprecate")
          };
          var Stream = require2("./internal/streams/stream");
          var Buffer = require2("safe-buffer").Buffer;
          var OurUint8Array = global2.Uint8Array || function() {
          };
          function _uint8ArrayToBuffer(chunk) {
            return Buffer.from(chunk);
          }
          function _isUint8Array(obj) {
            return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
          }
          var destroyImpl = require2("./internal/streams/destroy");
          util.inherits(Writable, Stream);
          function nop() {
          }
          function WritableState(options, stream) {
            Duplex = Duplex || require2("./_stream_duplex");
            options = options || {};
            var isDuplex = stream instanceof Duplex;
            this.objectMode = !!options.objectMode;
            if (isDuplex)
              this.objectMode = this.objectMode || !!options.writableObjectMode;
            var hwm = options.highWaterMark;
            var writableHwm = options.writableHighWaterMark;
            var defaultHwm = this.objectMode ? 16 : 16 * 1024;
            if (hwm || hwm === 0)
              this.highWaterMark = hwm;
            else if (isDuplex && (writableHwm || writableHwm === 0))
              this.highWaterMark = writableHwm;
            else
              this.highWaterMark = defaultHwm;
            this.highWaterMark = Math.floor(this.highWaterMark);
            this.finalCalled = false;
            this.needDrain = false;
            this.ending = false;
            this.ended = false;
            this.finished = false;
            this.destroyed = false;
            var noDecode = options.decodeStrings === false;
            this.decodeStrings = !noDecode;
            this.defaultEncoding = options.defaultEncoding || "utf8";
            this.length = 0;
            this.writing = false;
            this.corked = 0;
            this.sync = true;
            this.bufferProcessing = false;
            this.onwrite = function(er) {
              onwrite(stream, er);
            };
            this.writecb = null;
            this.writelen = 0;
            this.bufferedRequest = null;
            this.lastBufferedRequest = null;
            this.pendingcb = 0;
            this.prefinished = false;
            this.errorEmitted = false;
            this.bufferedRequestCount = 0;
            this.corkedRequestsFree = new CorkedRequest(this);
          }
          WritableState.prototype.getBuffer = function getBuffer() {
            var current = this.bufferedRequest;
            var out = [];
            while (current) {
              out.push(current);
              current = current.next;
            }
            return out;
          };
          (function() {
            try {
              Object.defineProperty(WritableState.prototype, "buffer", {
                get: internalUtil.deprecate(function() {
                  return this.getBuffer();
                }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
              });
            } catch (_) {
            }
          })();
          var realHasInstance;
          if (typeof Symbol === "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === "function") {
            realHasInstance = Function.prototype[Symbol.hasInstance];
            Object.defineProperty(Writable, Symbol.hasInstance, {
              value: function(object) {
                if (realHasInstance.call(this, object))
                  return true;
                if (this !== Writable)
                  return false;
                return object && object._writableState instanceof WritableState;
              }
            });
          } else {
            realHasInstance = function(object) {
              return object instanceof this;
            };
          }
          function Writable(options) {
            Duplex = Duplex || require2("./_stream_duplex");
            if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
              return new Writable(options);
            }
            this._writableState = new WritableState(options, this);
            this.writable = true;
            if (options) {
              if (typeof options.write === "function")
                this._write = options.write;
              if (typeof options.writev === "function")
                this._writev = options.writev;
              if (typeof options.destroy === "function")
                this._destroy = options.destroy;
              if (typeof options.final === "function")
                this._final = options.final;
            }
            Stream.call(this);
          }
          Writable.prototype.pipe = function() {
            this.emit("error", new Error("Cannot pipe, not readable"));
          };
          function writeAfterEnd(stream, cb) {
            var er = new Error("write after end");
            stream.emit("error", er);
            pna.nextTick(cb, er);
          }
          function validChunk(stream, state, chunk, cb) {
            var valid = true;
            var er = false;
            if (chunk === null) {
              er = new TypeError("May not write null values to stream");
            } else if (typeof chunk !== "string" && chunk !== void 0 && !state.objectMode) {
              er = new TypeError("Invalid non-string/buffer chunk");
            }
            if (er) {
              stream.emit("error", er);
              pna.nextTick(cb, er);
              valid = false;
            }
            return valid;
          }
          Writable.prototype.write = function(chunk, encoding, cb) {
            var state = this._writableState;
            var ret = false;
            var isBuf = !state.objectMode && _isUint8Array(chunk);
            if (isBuf && !Buffer.isBuffer(chunk)) {
              chunk = _uint8ArrayToBuffer(chunk);
            }
            if (typeof encoding === "function") {
              cb = encoding;
              encoding = null;
            }
            if (isBuf)
              encoding = "buffer";
            else if (!encoding)
              encoding = state.defaultEncoding;
            if (typeof cb !== "function")
              cb = nop;
            if (state.ended)
              writeAfterEnd(this, cb);
            else if (isBuf || validChunk(this, state, chunk, cb)) {
              state.pendingcb++;
              ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
            }
            return ret;
          };
          Writable.prototype.cork = function() {
            var state = this._writableState;
            state.corked++;
          };
          Writable.prototype.uncork = function() {
            var state = this._writableState;
            if (state.corked) {
              state.corked--;
              if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest)
                clearBuffer(this, state);
            }
          };
          Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
            if (typeof encoding === "string")
              encoding = encoding.toLowerCase();
            if (!(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((encoding + "").toLowerCase()) > -1))
              throw new TypeError("Unknown encoding: " + encoding);
            this._writableState.defaultEncoding = encoding;
            return this;
          };
          function decodeChunk(state, chunk, encoding) {
            if (!state.objectMode && state.decodeStrings !== false && typeof chunk === "string") {
              chunk = Buffer.from(chunk, encoding);
            }
            return chunk;
          }
          Object.defineProperty(Writable.prototype, "writableHighWaterMark", {
            // making it explicit this property is not enumerable
            // because otherwise some prototype manipulation in
            // userland will fail
            enumerable: false,
            get: function() {
              return this._writableState.highWaterMark;
            }
          });
          function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
            if (!isBuf) {
              var newChunk = decodeChunk(state, chunk, encoding);
              if (chunk !== newChunk) {
                isBuf = true;
                encoding = "buffer";
                chunk = newChunk;
              }
            }
            var len = state.objectMode ? 1 : chunk.length;
            state.length += len;
            var ret = state.length < state.highWaterMark;
            if (!ret)
              state.needDrain = true;
            if (state.writing || state.corked) {
              var last = state.lastBufferedRequest;
              state.lastBufferedRequest = {
                chunk,
                encoding,
                isBuf,
                callback: cb,
                next: null
              };
              if (last) {
                last.next = state.lastBufferedRequest;
              } else {
                state.bufferedRequest = state.lastBufferedRequest;
              }
              state.bufferedRequestCount += 1;
            } else {
              doWrite(stream, state, false, len, chunk, encoding, cb);
            }
            return ret;
          }
          function doWrite(stream, state, writev, len, chunk, encoding, cb) {
            state.writelen = len;
            state.writecb = cb;
            state.writing = true;
            state.sync = true;
            if (writev)
              stream._writev(chunk, state.onwrite);
            else
              stream._write(chunk, encoding, state.onwrite);
            state.sync = false;
          }
          function onwriteError(stream, state, sync, er, cb) {
            --state.pendingcb;
            if (sync) {
              pna.nextTick(cb, er);
              pna.nextTick(finishMaybe, stream, state);
              stream._writableState.errorEmitted = true;
              stream.emit("error", er);
            } else {
              cb(er);
              stream._writableState.errorEmitted = true;
              stream.emit("error", er);
              finishMaybe(stream, state);
            }
          }
          function onwriteStateUpdate(state) {
            state.writing = false;
            state.writecb = null;
            state.length -= state.writelen;
            state.writelen = 0;
          }
          function onwrite(stream, er) {
            var state = stream._writableState;
            var sync = state.sync;
            var cb = state.writecb;
            onwriteStateUpdate(state);
            if (er)
              onwriteError(stream, state, sync, er, cb);
            else {
              var finished = needFinish(state);
              if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
                clearBuffer(stream, state);
              }
              if (sync) {
                asyncWrite(afterWrite, stream, state, finished, cb);
              } else {
                afterWrite(stream, state, finished, cb);
              }
            }
          }
          function afterWrite(stream, state, finished, cb) {
            if (!finished)
              onwriteDrain(stream, state);
            state.pendingcb--;
            cb();
            finishMaybe(stream, state);
          }
          function onwriteDrain(stream, state) {
            if (state.length === 0 && state.needDrain) {
              state.needDrain = false;
              stream.emit("drain");
            }
          }
          function clearBuffer(stream, state) {
            state.bufferProcessing = true;
            var entry = state.bufferedRequest;
            if (stream._writev && entry && entry.next) {
              var l = state.bufferedRequestCount;
              var buffer = new Array(l);
              var holder = state.corkedRequestsFree;
              holder.entry = entry;
              var count = 0;
              var allBuffers = true;
              while (entry) {
                buffer[count] = entry;
                if (!entry.isBuf)
                  allBuffers = false;
                entry = entry.next;
                count += 1;
              }
              buffer.allBuffers = allBuffers;
              doWrite(stream, state, true, state.length, buffer, "", holder.finish);
              state.pendingcb++;
              state.lastBufferedRequest = null;
              if (holder.next) {
                state.corkedRequestsFree = holder.next;
                holder.next = null;
              } else {
                state.corkedRequestsFree = new CorkedRequest(state);
              }
              state.bufferedRequestCount = 0;
            } else {
              while (entry) {
                var chunk = entry.chunk;
                var encoding = entry.encoding;
                var cb = entry.callback;
                var len = state.objectMode ? 1 : chunk.length;
                doWrite(stream, state, false, len, chunk, encoding, cb);
                entry = entry.next;
                state.bufferedRequestCount--;
                if (state.writing) {
                  break;
                }
              }
              if (entry === null)
                state.lastBufferedRequest = null;
            }
            state.bufferedRequest = entry;
            state.bufferProcessing = false;
          }
          Writable.prototype._write = function(chunk, encoding, cb) {
            cb(new Error("_write() is not implemented"));
          };
          Writable.prototype._writev = null;
          Writable.prototype.end = function(chunk, encoding, cb) {
            var state = this._writableState;
            if (typeof chunk === "function") {
              cb = chunk;
              chunk = null;
              encoding = null;
            } else if (typeof encoding === "function") {
              cb = encoding;
              encoding = null;
            }
            if (chunk !== null && chunk !== void 0)
              this.write(chunk, encoding);
            if (state.corked) {
              state.corked = 1;
              this.uncork();
            }
            if (!state.ending && !state.finished)
              endWritable(this, state, cb);
          };
          function needFinish(state) {
            return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
          }
          function callFinal(stream, state) {
            stream._final(function(err) {
              state.pendingcb--;
              if (err) {
                stream.emit("error", err);
              }
              state.prefinished = true;
              stream.emit("prefinish");
              finishMaybe(stream, state);
            });
          }
          function prefinish(stream, state) {
            if (!state.prefinished && !state.finalCalled) {
              if (typeof stream._final === "function") {
                state.pendingcb++;
                state.finalCalled = true;
                pna.nextTick(callFinal, stream, state);
              } else {
                state.prefinished = true;
                stream.emit("prefinish");
              }
            }
          }
          function finishMaybe(stream, state) {
            var need = needFinish(state);
            if (need) {
              prefinish(stream, state);
              if (state.pendingcb === 0) {
                state.finished = true;
                stream.emit("finish");
              }
            }
            return need;
          }
          function endWritable(stream, state, cb) {
            state.ending = true;
            finishMaybe(stream, state);
            if (cb) {
              if (state.finished)
                pna.nextTick(cb);
              else
                stream.once("finish", cb);
            }
            state.ended = true;
            stream.writable = false;
          }
          function onCorkedFinish(corkReq, state, err) {
            var entry = corkReq.entry;
            corkReq.entry = null;
            while (entry) {
              var cb = entry.callback;
              state.pendingcb--;
              cb(err);
              entry = entry.next;
            }
            if (state.corkedRequestsFree) {
              state.corkedRequestsFree.next = corkReq;
            } else {
              state.corkedRequestsFree = corkReq;
            }
          }
          Object.defineProperty(Writable.prototype, "destroyed", {
            get: function() {
              if (this._writableState === void 0) {
                return false;
              }
              return this._writableState.destroyed;
            },
            set: function(value) {
              if (!this._writableState) {
                return;
              }
              this._writableState.destroyed = value;
            }
          });
          Writable.prototype.destroy = destroyImpl.destroy;
          Writable.prototype._undestroy = destroyImpl.undestroy;
          Writable.prototype._destroy = function(err, cb) {
            this.end();
            cb(err);
          };
        }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {}, require2("timers").setImmediate);
      }, { "./_stream_duplex": 98, "./internal/streams/destroy": 104, "./internal/streams/stream": 105, "_process": 92, "core-util-is": 14, "inherits": 80, "process-nextick-args": 91, "safe-buffer": 110, "timers": 112, "util-deprecate": 115 }], 103: [function(require2, module3, exports3) {
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
        var Buffer = require2("safe-buffer").Buffer;
        var util = require2("util");
        function copyBuffer(src, target, offset) {
          src.copy(target, offset);
        }
        module3.exports = function() {
          function BufferList() {
            _classCallCheck(this, BufferList);
            this.head = null;
            this.tail = null;
            this.length = 0;
          }
          BufferList.prototype.push = function push(v) {
            var entry = { data: v, next: null };
            if (this.length > 0)
              this.tail.next = entry;
            else
              this.head = entry;
            this.tail = entry;
            ++this.length;
          };
          BufferList.prototype.unshift = function unshift(v) {
            var entry = { data: v, next: this.head };
            if (this.length === 0)
              this.tail = entry;
            this.head = entry;
            ++this.length;
          };
          BufferList.prototype.shift = function shift() {
            if (this.length === 0)
              return;
            var ret = this.head.data;
            if (this.length === 1)
              this.head = this.tail = null;
            else
              this.head = this.head.next;
            --this.length;
            return ret;
          };
          BufferList.prototype.clear = function clear() {
            this.head = this.tail = null;
            this.length = 0;
          };
          BufferList.prototype.join = function join(s) {
            if (this.length === 0)
              return "";
            var p = this.head;
            var ret = "" + p.data;
            while (p = p.next) {
              ret += s + p.data;
            }
            return ret;
          };
          BufferList.prototype.concat = function concat(n) {
            if (this.length === 0)
              return Buffer.alloc(0);
            if (this.length === 1)
              return this.head.data;
            var ret = Buffer.allocUnsafe(n >>> 0);
            var p = this.head;
            var i = 0;
            while (p) {
              copyBuffer(p.data, ret, i);
              i += p.data.length;
              p = p.next;
            }
            return ret;
          };
          return BufferList;
        }();
        if (util && util.inspect && util.inspect.custom) {
          module3.exports.prototype[util.inspect.custom] = function() {
            var obj = util.inspect({ length: this.length });
            return this.constructor.name + " " + obj;
          };
        }
      }, { "safe-buffer": 110, "util": 11 }], 104: [function(require2, module3, exports3) {
        var pna = require2("process-nextick-args");
        function destroy(err, cb) {
          var _this = this;
          var readableDestroyed = this._readableState && this._readableState.destroyed;
          var writableDestroyed = this._writableState && this._writableState.destroyed;
          if (readableDestroyed || writableDestroyed) {
            if (cb) {
              cb(err);
            } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
              pna.nextTick(emitErrorNT, this, err);
            }
            return this;
          }
          if (this._readableState) {
            this._readableState.destroyed = true;
          }
          if (this._writableState) {
            this._writableState.destroyed = true;
          }
          this._destroy(err || null, function(err2) {
            if (!cb && err2) {
              pna.nextTick(emitErrorNT, _this, err2);
              if (_this._writableState) {
                _this._writableState.errorEmitted = true;
              }
            } else if (cb) {
              cb(err2);
            }
          });
          return this;
        }
        function undestroy() {
          if (this._readableState) {
            this._readableState.destroyed = false;
            this._readableState.reading = false;
            this._readableState.ended = false;
            this._readableState.endEmitted = false;
          }
          if (this._writableState) {
            this._writableState.destroyed = false;
            this._writableState.ended = false;
            this._writableState.ending = false;
            this._writableState.finished = false;
            this._writableState.errorEmitted = false;
          }
        }
        function emitErrorNT(self2, err) {
          self2.emit("error", err);
        }
        module3.exports = {
          destroy,
          undestroy
        };
      }, { "process-nextick-args": 91 }], 105: [function(require2, module3, exports3) {
        module3.exports = require2("events").EventEmitter;
      }, { "events": 13 }], 106: [function(require2, module3, exports3) {
        var toString = {}.toString;
        module3.exports = Array.isArray || function(arr) {
          return toString.call(arr) == "[object Array]";
        };
      }, {}], 107: [function(require2, module3, exports3) {
        var Buffer = require2("safe-buffer").Buffer;
        var isEncoding = Buffer.isEncoding || function(encoding) {
          encoding = "" + encoding;
          switch (encoding && encoding.toLowerCase()) {
            case "hex":
            case "utf8":
            case "utf-8":
            case "ascii":
            case "binary":
            case "base64":
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
            case "raw":
              return true;
            default:
              return false;
          }
        };
        function _normalizeEncoding(enc) {
          if (!enc)
            return "utf8";
          var retried;
          while (true) {
            switch (enc) {
              case "utf8":
              case "utf-8":
                return "utf8";
              case "ucs2":
              case "ucs-2":
              case "utf16le":
              case "utf-16le":
                return "utf16le";
              case "latin1":
              case "binary":
                return "latin1";
              case "base64":
              case "ascii":
              case "hex":
                return enc;
              default:
                if (retried)
                  return;
                enc = ("" + enc).toLowerCase();
                retried = true;
            }
          }
        }
        function normalizeEncoding(enc) {
          var nenc = _normalizeEncoding(enc);
          if (typeof nenc !== "string" && (Buffer.isEncoding === isEncoding || !isEncoding(enc)))
            throw new Error("Unknown encoding: " + enc);
          return nenc || enc;
        }
        exports3.StringDecoder = StringDecoder;
        function StringDecoder(encoding) {
          this.encoding = normalizeEncoding(encoding);
          var nb;
          switch (this.encoding) {
            case "utf16le":
              this.text = utf16Text;
              this.end = utf16End;
              nb = 4;
              break;
            case "utf8":
              this.fillLast = utf8FillLast;
              nb = 4;
              break;
            case "base64":
              this.text = base64Text;
              this.end = base64End;
              nb = 3;
              break;
            default:
              this.write = simpleWrite;
              this.end = simpleEnd;
              return;
          }
          this.lastNeed = 0;
          this.lastTotal = 0;
          this.lastChar = Buffer.allocUnsafe(nb);
        }
        StringDecoder.prototype.write = function(buf) {
          if (buf.length === 0)
            return "";
          var r;
          var i;
          if (this.lastNeed) {
            r = this.fillLast(buf);
            if (r === void 0)
              return "";
            i = this.lastNeed;
            this.lastNeed = 0;
          } else {
            i = 0;
          }
          if (i < buf.length)
            return r ? r + this.text(buf, i) : this.text(buf, i);
          return r || "";
        };
        StringDecoder.prototype.end = utf8End;
        StringDecoder.prototype.text = utf8Text;
        StringDecoder.prototype.fillLast = function(buf) {
          if (this.lastNeed <= buf.length) {
            buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
            return this.lastChar.toString(this.encoding, 0, this.lastTotal);
          }
          buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
          this.lastNeed -= buf.length;
        };
        function utf8CheckByte(byte) {
          if (byte <= 127)
            return 0;
          else if (byte >> 5 === 6)
            return 2;
          else if (byte >> 4 === 14)
            return 3;
          else if (byte >> 3 === 30)
            return 4;
          return byte >> 6 === 2 ? -1 : -2;
        }
        function utf8CheckIncomplete(self2, buf, i) {
          var j = buf.length - 1;
          if (j < i)
            return 0;
          var nb = utf8CheckByte(buf[j]);
          if (nb >= 0) {
            if (nb > 0)
              self2.lastNeed = nb - 1;
            return nb;
          }
          if (--j < i || nb === -2)
            return 0;
          nb = utf8CheckByte(buf[j]);
          if (nb >= 0) {
            if (nb > 0)
              self2.lastNeed = nb - 2;
            return nb;
          }
          if (--j < i || nb === -2)
            return 0;
          nb = utf8CheckByte(buf[j]);
          if (nb >= 0) {
            if (nb > 0) {
              if (nb === 2)
                nb = 0;
              else
                self2.lastNeed = nb - 3;
            }
            return nb;
          }
          return 0;
        }
        function utf8CheckExtraBytes(self2, buf, p) {
          if ((buf[0] & 192) !== 128) {
            self2.lastNeed = 0;
            return "�";
          }
          if (self2.lastNeed > 1 && buf.length > 1) {
            if ((buf[1] & 192) !== 128) {
              self2.lastNeed = 1;
              return "�";
            }
            if (self2.lastNeed > 2 && buf.length > 2) {
              if ((buf[2] & 192) !== 128) {
                self2.lastNeed = 2;
                return "�";
              }
            }
          }
        }
        function utf8FillLast(buf) {
          var p = this.lastTotal - this.lastNeed;
          var r = utf8CheckExtraBytes(this, buf);
          if (r !== void 0)
            return r;
          if (this.lastNeed <= buf.length) {
            buf.copy(this.lastChar, p, 0, this.lastNeed);
            return this.lastChar.toString(this.encoding, 0, this.lastTotal);
          }
          buf.copy(this.lastChar, p, 0, buf.length);
          this.lastNeed -= buf.length;
        }
        function utf8Text(buf, i) {
          var total = utf8CheckIncomplete(this, buf, i);
          if (!this.lastNeed)
            return buf.toString("utf8", i);
          this.lastTotal = total;
          var end = buf.length - (total - this.lastNeed);
          buf.copy(this.lastChar, 0, end);
          return buf.toString("utf8", i, end);
        }
        function utf8End(buf) {
          var r = buf && buf.length ? this.write(buf) : "";
          if (this.lastNeed)
            return r + "�";
          return r;
        }
        function utf16Text(buf, i) {
          if ((buf.length - i) % 2 === 0) {
            var r = buf.toString("utf16le", i);
            if (r) {
              var c = r.charCodeAt(r.length - 1);
              if (c >= 55296 && c <= 56319) {
                this.lastNeed = 2;
                this.lastTotal = 4;
                this.lastChar[0] = buf[buf.length - 2];
                this.lastChar[1] = buf[buf.length - 1];
                return r.slice(0, -1);
              }
            }
            return r;
          }
          this.lastNeed = 1;
          this.lastTotal = 2;
          this.lastChar[0] = buf[buf.length - 1];
          return buf.toString("utf16le", i, buf.length - 1);
        }
        function utf16End(buf) {
          var r = buf && buf.length ? this.write(buf) : "";
          if (this.lastNeed) {
            var end = this.lastTotal - this.lastNeed;
            return r + this.lastChar.toString("utf16le", 0, end);
          }
          return r;
        }
        function base64Text(buf, i) {
          var n = (buf.length - i) % 3;
          if (n === 0)
            return buf.toString("base64", i);
          this.lastNeed = 3 - n;
          this.lastTotal = 3;
          if (n === 1) {
            this.lastChar[0] = buf[buf.length - 1];
          } else {
            this.lastChar[0] = buf[buf.length - 2];
            this.lastChar[1] = buf[buf.length - 1];
          }
          return buf.toString("base64", i, buf.length - n);
        }
        function base64End(buf) {
          var r = buf && buf.length ? this.write(buf) : "";
          if (this.lastNeed)
            return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
          return r;
        }
        function simpleWrite(buf) {
          return buf.toString(this.encoding);
        }
        function simpleEnd(buf) {
          return buf && buf.length ? this.write(buf) : "";
        }
      }, { "safe-buffer": 110 }], 108: [function(require2, module3, exports3) {
        exports3 = module3.exports = require2("./lib/_stream_readable.js");
        exports3.Stream = exports3;
        exports3.Readable = exports3;
        exports3.Writable = require2("./lib/_stream_writable.js");
        exports3.Duplex = require2("./lib/_stream_duplex.js");
        exports3.Transform = require2("./lib/_stream_transform.js");
        exports3.PassThrough = require2("./lib/_stream_passthrough.js");
      }, { "./lib/_stream_duplex.js": 98, "./lib/_stream_passthrough.js": 99, "./lib/_stream_readable.js": 100, "./lib/_stream_transform.js": 101, "./lib/_stream_writable.js": 102 }], 109: [function(require2, module3, exports3) {
        function ReInterval(callback, interval, args) {
          var self2 = this;
          this._callback = callback;
          this._args = args;
          this._interval = setInterval(callback, interval, this._args);
          this.reschedule = function(interval2) {
            if (!interval2)
              interval2 = self2._interval;
            if (self2._interval)
              clearInterval(self2._interval);
            self2._interval = setInterval(self2._callback, interval2, self2._args);
          };
          this.clear = function() {
            if (self2._interval) {
              clearInterval(self2._interval);
              self2._interval = void 0;
            }
          };
          this.destroy = function() {
            if (self2._interval) {
              clearInterval(self2._interval);
            }
            self2._callback = void 0;
            self2._interval = void 0;
            self2._args = void 0;
          };
        }
        function reInterval() {
          if (typeof arguments[0] !== "function")
            throw new Error("callback needed");
          if (typeof arguments[1] !== "number")
            throw new Error("interval needed");
          var args;
          if (arguments.length > 0) {
            args = new Array(arguments.length - 2);
            for (var i = 0; i < args.length; i++) {
              args[i] = arguments[i + 2];
            }
          }
          return new ReInterval(arguments[0], arguments[1], args);
        }
        module3.exports = reInterval;
      }, {}], 110: [function(require2, module3, exports3) {
        var buffer = require2("buffer");
        var Buffer = buffer.Buffer;
        function copyProps(src, dst) {
          for (var key in src) {
            dst[key] = src[key];
          }
        }
        if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
          module3.exports = buffer;
        } else {
          copyProps(buffer, exports3);
          exports3.Buffer = SafeBuffer;
        }
        function SafeBuffer(arg, encodingOrOffset, length) {
          return Buffer(arg, encodingOrOffset, length);
        }
        copyProps(Buffer, SafeBuffer);
        SafeBuffer.from = function(arg, encodingOrOffset, length) {
          if (typeof arg === "number") {
            throw new TypeError("Argument must not be a number");
          }
          return Buffer(arg, encodingOrOffset, length);
        };
        SafeBuffer.alloc = function(size, fill, encoding) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          var buf = Buffer(size);
          if (fill !== void 0) {
            if (typeof encoding === "string") {
              buf.fill(fill, encoding);
            } else {
              buf.fill(fill);
            }
          } else {
            buf.fill(0);
          }
          return buf;
        };
        SafeBuffer.allocUnsafe = function(size) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          return Buffer(size);
        };
        SafeBuffer.allocUnsafeSlow = function(size) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          return buffer.SlowBuffer(size);
        };
      }, { "buffer": 12 }], 111: [function(require2, module3, exports3) {
        module3.exports = shift;
        function shift(stream) {
          var rs = stream._readableState;
          if (!rs)
            return null;
          return rs.objectMode ? stream.read() : stream.read(getStateLength(rs));
        }
        function getStateLength(state) {
          if (state.buffer.length) {
            if (state.buffer.head) {
              return state.buffer.head.data.length;
            }
            return state.buffer[0].length;
          }
          return state.length;
        }
      }, {}], 112: [function(require2, module3, exports3) {
        (function(setImmediate, clearImmediate) {
          var nextTick = require2("process/browser.js").nextTick;
          var apply = Function.prototype.apply;
          var slice = Array.prototype.slice;
          var immediateIds = {};
          var nextImmediateId = 0;
          exports3.setTimeout = function() {
            return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
          };
          exports3.setInterval = function() {
            return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
          };
          exports3.clearTimeout = exports3.clearInterval = function(timeout) {
            timeout.close();
          };
          function Timeout(id, clearFn) {
            this._id = id;
            this._clearFn = clearFn;
          }
          Timeout.prototype.unref = Timeout.prototype.ref = function() {
          };
          Timeout.prototype.close = function() {
            this._clearFn.call(window, this._id);
          };
          exports3.enroll = function(item, msecs) {
            clearTimeout(item._idleTimeoutId);
            item._idleTimeout = msecs;
          };
          exports3.unenroll = function(item) {
            clearTimeout(item._idleTimeoutId);
            item._idleTimeout = -1;
          };
          exports3._unrefActive = exports3.active = function(item) {
            clearTimeout(item._idleTimeoutId);
            var msecs = item._idleTimeout;
            if (msecs >= 0) {
              item._idleTimeoutId = setTimeout(function onTimeout() {
                if (item._onTimeout)
                  item._onTimeout();
              }, msecs);
            }
          };
          exports3.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
            var id = nextImmediateId++;
            var args = arguments.length < 2 ? false : slice.call(arguments, 1);
            immediateIds[id] = true;
            nextTick(function onNextTick() {
              if (immediateIds[id]) {
                if (args) {
                  fn.apply(null, args);
                } else {
                  fn.call(null);
                }
                exports3.clearImmediate(id);
              }
            });
            return id;
          };
          exports3.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
            delete immediateIds[id];
          };
        }).call(this, require2("timers").setImmediate, require2("timers").clearImmediate);
      }, { "process/browser.js": 92, "timers": 112 }], 113: [function(require2, module3, exports3) {
        var punycode = require2("punycode");
        var util = require2("./util");
        exports3.parse = urlParse;
        exports3.resolve = urlResolve;
        exports3.resolveObject = urlResolveObject;
        exports3.format = urlFormat;
        exports3.Url = Url;
        function Url() {
          this.protocol = null;
          this.slashes = null;
          this.auth = null;
          this.host = null;
          this.port = null;
          this.hostname = null;
          this.hash = null;
          this.search = null;
          this.query = null;
          this.pathname = null;
          this.path = null;
          this.href = null;
        }
        var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]*$/, simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, delims = ["<", ">", '"', "`", " ", "\r", "\n", "	"], unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims), autoEscape = ["'"].concat(unwise), nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape), hostEndingChars = ["/", "?", "#"], hostnameMaxLen = 255, hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/, hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, unsafeProtocol = {
          "javascript": true,
          "javascript:": true
        }, hostlessProtocol = {
          "javascript": true,
          "javascript:": true
        }, slashedProtocol = {
          "http": true,
          "https": true,
          "ftp": true,
          "gopher": true,
          "file": true,
          "http:": true,
          "https:": true,
          "ftp:": true,
          "gopher:": true,
          "file:": true
        }, querystring = require2("querystring");
        function urlParse(url, parseQueryString, slashesDenoteHost) {
          if (url && util.isObject(url) && url instanceof Url)
            return url;
          var u = new Url();
          u.parse(url, parseQueryString, slashesDenoteHost);
          return u;
        }
        Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
          if (!util.isString(url)) {
            throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
          }
          var queryIndex = url.indexOf("?"), splitter = queryIndex !== -1 && queryIndex < url.indexOf("#") ? "?" : "#", uSplit = url.split(splitter), slashRegex = /\\/g;
          uSplit[0] = uSplit[0].replace(slashRegex, "/");
          url = uSplit.join(splitter);
          var rest = url;
          rest = rest.trim();
          if (!slashesDenoteHost && url.split("#").length === 1) {
            var simplePath = simplePathPattern.exec(rest);
            if (simplePath) {
              this.path = rest;
              this.href = rest;
              this.pathname = simplePath[1];
              if (simplePath[2]) {
                this.search = simplePath[2];
                if (parseQueryString) {
                  this.query = querystring.parse(this.search.substr(1));
                } else {
                  this.query = this.search.substr(1);
                }
              } else if (parseQueryString) {
                this.search = "";
                this.query = {};
              }
              return this;
            }
          }
          var proto = protocolPattern.exec(rest);
          if (proto) {
            proto = proto[0];
            var lowerProto = proto.toLowerCase();
            this.protocol = lowerProto;
            rest = rest.substr(proto.length);
          }
          if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
            var slashes = rest.substr(0, 2) === "//";
            if (slashes && !(proto && hostlessProtocol[proto])) {
              rest = rest.substr(2);
              this.slashes = true;
            }
          }
          if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
            var hostEnd = -1;
            for (var i = 0; i < hostEndingChars.length; i++) {
              var hec = rest.indexOf(hostEndingChars[i]);
              if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                hostEnd = hec;
            }
            var auth, atSign;
            if (hostEnd === -1) {
              atSign = rest.lastIndexOf("@");
            } else {
              atSign = rest.lastIndexOf("@", hostEnd);
            }
            if (atSign !== -1) {
              auth = rest.slice(0, atSign);
              rest = rest.slice(atSign + 1);
              this.auth = decodeURIComponent(auth);
            }
            hostEnd = -1;
            for (var i = 0; i < nonHostChars.length; i++) {
              var hec = rest.indexOf(nonHostChars[i]);
              if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                hostEnd = hec;
            }
            if (hostEnd === -1)
              hostEnd = rest.length;
            this.host = rest.slice(0, hostEnd);
            rest = rest.slice(hostEnd);
            this.parseHost();
            this.hostname = this.hostname || "";
            var ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
            if (!ipv6Hostname) {
              var hostparts = this.hostname.split(/\./);
              for (var i = 0, l = hostparts.length; i < l; i++) {
                var part = hostparts[i];
                if (!part)
                  continue;
                if (!part.match(hostnamePartPattern)) {
                  var newpart = "";
                  for (var j = 0, k = part.length; j < k; j++) {
                    if (part.charCodeAt(j) > 127) {
                      newpart += "x";
                    } else {
                      newpart += part[j];
                    }
                  }
                  if (!newpart.match(hostnamePartPattern)) {
                    var validParts = hostparts.slice(0, i);
                    var notHost = hostparts.slice(i + 1);
                    var bit = part.match(hostnamePartStart);
                    if (bit) {
                      validParts.push(bit[1]);
                      notHost.unshift(bit[2]);
                    }
                    if (notHost.length) {
                      rest = "/" + notHost.join(".") + rest;
                    }
                    this.hostname = validParts.join(".");
                    break;
                  }
                }
              }
            }
            if (this.hostname.length > hostnameMaxLen) {
              this.hostname = "";
            } else {
              this.hostname = this.hostname.toLowerCase();
            }
            if (!ipv6Hostname) {
              this.hostname = punycode.toASCII(this.hostname);
            }
            var p = this.port ? ":" + this.port : "";
            var h = this.hostname || "";
            this.host = h + p;
            this.href += this.host;
            if (ipv6Hostname) {
              this.hostname = this.hostname.substr(1, this.hostname.length - 2);
              if (rest[0] !== "/") {
                rest = "/" + rest;
              }
            }
          }
          if (!unsafeProtocol[lowerProto]) {
            for (var i = 0, l = autoEscape.length; i < l; i++) {
              var ae = autoEscape[i];
              if (rest.indexOf(ae) === -1)
                continue;
              var esc = encodeURIComponent(ae);
              if (esc === ae) {
                esc = escape(ae);
              }
              rest = rest.split(ae).join(esc);
            }
          }
          var hash = rest.indexOf("#");
          if (hash !== -1) {
            this.hash = rest.substr(hash);
            rest = rest.slice(0, hash);
          }
          var qm = rest.indexOf("?");
          if (qm !== -1) {
            this.search = rest.substr(qm);
            this.query = rest.substr(qm + 1);
            if (parseQueryString) {
              this.query = querystring.parse(this.query);
            }
            rest = rest.slice(0, qm);
          } else if (parseQueryString) {
            this.search = "";
            this.query = {};
          }
          if (rest)
            this.pathname = rest;
          if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
            this.pathname = "/";
          }
          if (this.pathname || this.search) {
            var p = this.pathname || "";
            var s = this.search || "";
            this.path = p + s;
          }
          this.href = this.format();
          return this;
        };
        function urlFormat(obj) {
          if (util.isString(obj))
            obj = urlParse(obj);
          if (!(obj instanceof Url))
            return Url.prototype.format.call(obj);
          return obj.format();
        }
        Url.prototype.format = function() {
          var auth = this.auth || "";
          if (auth) {
            auth = encodeURIComponent(auth);
            auth = auth.replace(/%3A/i, ":");
            auth += "@";
          }
          var protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = false, query = "";
          if (this.host) {
            host = auth + this.host;
          } else if (this.hostname) {
            host = auth + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]");
            if (this.port) {
              host += ":" + this.port;
            }
          }
          if (this.query && util.isObject(this.query) && Object.keys(this.query).length) {
            query = querystring.stringify(this.query);
          }
          var search = this.search || query && "?" + query || "";
          if (protocol && protocol.substr(-1) !== ":")
            protocol += ":";
          if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
            host = "//" + (host || "");
            if (pathname && pathname.charAt(0) !== "/")
              pathname = "/" + pathname;
          } else if (!host) {
            host = "";
          }
          if (hash && hash.charAt(0) !== "#")
            hash = "#" + hash;
          if (search && search.charAt(0) !== "?")
            search = "?" + search;
          pathname = pathname.replace(/[?#]/g, function(match) {
            return encodeURIComponent(match);
          });
          search = search.replace("#", "%23");
          return protocol + host + pathname + search + hash;
        };
        function urlResolve(source, relative) {
          return urlParse(source, false, true).resolve(relative);
        }
        Url.prototype.resolve = function(relative) {
          return this.resolveObject(urlParse(relative, false, true)).format();
        };
        function urlResolveObject(source, relative) {
          if (!source)
            return relative;
          return urlParse(source, false, true).resolveObject(relative);
        }
        Url.prototype.resolveObject = function(relative) {
          if (util.isString(relative)) {
            var rel = new Url();
            rel.parse(relative, false, true);
            relative = rel;
          }
          var result = new Url();
          var tkeys = Object.keys(this);
          for (var tk = 0; tk < tkeys.length; tk++) {
            var tkey = tkeys[tk];
            result[tkey] = this[tkey];
          }
          result.hash = relative.hash;
          if (relative.href === "") {
            result.href = result.format();
            return result;
          }
          if (relative.slashes && !relative.protocol) {
            var rkeys = Object.keys(relative);
            for (var rk = 0; rk < rkeys.length; rk++) {
              var rkey = rkeys[rk];
              if (rkey !== "protocol")
                result[rkey] = relative[rkey];
            }
            if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
              result.path = result.pathname = "/";
            }
            result.href = result.format();
            return result;
          }
          if (relative.protocol && relative.protocol !== result.protocol) {
            if (!slashedProtocol[relative.protocol]) {
              var keys = Object.keys(relative);
              for (var v = 0; v < keys.length; v++) {
                var k = keys[v];
                result[k] = relative[k];
              }
              result.href = result.format();
              return result;
            }
            result.protocol = relative.protocol;
            if (!relative.host && !hostlessProtocol[relative.protocol]) {
              var relPath = (relative.pathname || "").split("/");
              while (relPath.length && !(relative.host = relPath.shift()))
                ;
              if (!relative.host)
                relative.host = "";
              if (!relative.hostname)
                relative.hostname = "";
              if (relPath[0] !== "")
                relPath.unshift("");
              if (relPath.length < 2)
                relPath.unshift("");
              result.pathname = relPath.join("/");
            } else {
              result.pathname = relative.pathname;
            }
            result.search = relative.search;
            result.query = relative.query;
            result.host = relative.host || "";
            result.auth = relative.auth;
            result.hostname = relative.hostname || relative.host;
            result.port = relative.port;
            if (result.pathname || result.search) {
              var p = result.pathname || "";
              var s = result.search || "";
              result.path = p + s;
            }
            result.slashes = result.slashes || relative.slashes;
            result.href = result.format();
            return result;
          }
          var isSourceAbs = result.pathname && result.pathname.charAt(0) === "/", isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === "/", mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [], relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
          if (psychotic) {
            result.hostname = "";
            result.port = null;
            if (result.host) {
              if (srcPath[0] === "")
                srcPath[0] = result.host;
              else
                srcPath.unshift(result.host);
            }
            result.host = "";
            if (relative.protocol) {
              relative.hostname = null;
              relative.port = null;
              if (relative.host) {
                if (relPath[0] === "")
                  relPath[0] = relative.host;
                else
                  relPath.unshift(relative.host);
              }
              relative.host = null;
            }
            mustEndAbs = mustEndAbs && (relPath[0] === "" || srcPath[0] === "");
          }
          if (isRelAbs) {
            result.host = relative.host || relative.host === "" ? relative.host : result.host;
            result.hostname = relative.hostname || relative.hostname === "" ? relative.hostname : result.hostname;
            result.search = relative.search;
            result.query = relative.query;
            srcPath = relPath;
          } else if (relPath.length) {
            if (!srcPath)
              srcPath = [];
            srcPath.pop();
            srcPath = srcPath.concat(relPath);
            result.search = relative.search;
            result.query = relative.query;
          } else if (!util.isNullOrUndefined(relative.search)) {
            if (psychotic) {
              result.hostname = result.host = srcPath.shift();
              var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
              if (authInHost) {
                result.auth = authInHost.shift();
                result.host = result.hostname = authInHost.shift();
              }
            }
            result.search = relative.search;
            result.query = relative.query;
            if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
              result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
            }
            result.href = result.format();
            return result;
          }
          if (!srcPath.length) {
            result.pathname = null;
            if (result.search) {
              result.path = "/" + result.search;
            } else {
              result.path = null;
            }
            result.href = result.format();
            return result;
          }
          var last = srcPath.slice(-1)[0];
          var hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last === "." || last === "..") || last === "";
          var up = 0;
          for (var i = srcPath.length; i >= 0; i--) {
            last = srcPath[i];
            if (last === ".") {
              srcPath.splice(i, 1);
            } else if (last === "..") {
              srcPath.splice(i, 1);
              up++;
            } else if (up) {
              srcPath.splice(i, 1);
              up--;
            }
          }
          if (!mustEndAbs && !removeAllDots) {
            for (; up--; up) {
              srcPath.unshift("..");
            }
          }
          if (mustEndAbs && srcPath[0] !== "" && (!srcPath[0] || srcPath[0].charAt(0) !== "/")) {
            srcPath.unshift("");
          }
          if (hasTrailingSlash && srcPath.join("/").substr(-1) !== "/") {
            srcPath.push("");
          }
          var isAbsolute = srcPath[0] === "" || srcPath[0] && srcPath[0].charAt(0) === "/";
          if (psychotic) {
            result.hostname = result.host = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
            var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
            if (authInHost) {
              result.auth = authInHost.shift();
              result.host = result.hostname = authInHost.shift();
            }
          }
          mustEndAbs = mustEndAbs || result.host && srcPath.length;
          if (mustEndAbs && !isAbsolute) {
            srcPath.unshift("");
          }
          if (!srcPath.length) {
            result.pathname = null;
            result.path = null;
          } else {
            result.pathname = srcPath.join("/");
          }
          if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
            result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
          }
          result.auth = relative.auth || result.auth;
          result.slashes = result.slashes || relative.slashes;
          result.href = result.format();
          return result;
        };
        Url.prototype.parseHost = function() {
          var host = this.host;
          var port = portPattern.exec(host);
          if (port) {
            port = port[0];
            if (port !== ":") {
              this.port = port.substr(1);
            }
            host = host.substr(0, host.length - port.length);
          }
          if (host)
            this.hostname = host;
        };
      }, { "./util": 114, "punycode": 93, "querystring": 96 }], 114: [function(require2, module3, exports3) {
        module3.exports = {
          isString: function(arg) {
            return typeof arg === "string";
          },
          isObject: function(arg) {
            return typeof arg === "object" && arg !== null;
          },
          isNull: function(arg) {
            return arg === null;
          },
          isNullOrUndefined: function(arg) {
            return arg == null;
          }
        };
      }, {}], 115: [function(require2, module3, exports3) {
        (function(global2) {
          module3.exports = deprecate;
          function deprecate(fn, msg) {
            if (config("noDeprecation")) {
              return fn;
            }
            var warned = false;
            function deprecated() {
              if (!warned) {
                if (config("throwDeprecation")) {
                  throw new Error(msg);
                } else if (config("traceDeprecation")) {
                  console.trace(msg);
                } else {
                  formatAppLog("warn", "at node_modules/mqtt/dist/mqtt.js:13761", msg);
                }
                warned = true;
              }
              return fn.apply(this, arguments);
            }
            return deprecated;
          }
          function config(name) {
            try {
              if (!global2.localStorage)
                return false;
            } catch (_) {
              return false;
            }
            var val = global2.localStorage[name];
            if (null == val)
              return false;
            return String(val).toLowerCase() === "true";
          }
        }).call(this, typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
      }, {}], 116: [function(require2, module3, exports3) {
        module3.exports = function isBuffer(arg) {
          return arg && typeof arg === "object" && typeof arg.copy === "function" && typeof arg.fill === "function" && typeof arg.readUInt8 === "function";
        };
      }, {}], 117: [function(require2, module3, exports3) {
        (function(process, global2) {
          var formatRegExp = /%[sdj%]/g;
          exports3.format = function(f) {
            if (!isString(f)) {
              var objects = [];
              for (var i = 0; i < arguments.length; i++) {
                objects.push(inspect(arguments[i]));
              }
              return objects.join(" ");
            }
            var i = 1;
            var args = arguments;
            var len = args.length;
            var str = String(f).replace(formatRegExp, function(x2) {
              if (x2 === "%%")
                return "%";
              if (i >= len)
                return x2;
              switch (x2) {
                case "%s":
                  return String(args[i++]);
                case "%d":
                  return Number(args[i++]);
                case "%j":
                  try {
                    return JSON.stringify(args[i++]);
                  } catch (_) {
                    return "[Circular]";
                  }
                default:
                  return x2;
              }
            });
            for (var x = args[i]; i < len; x = args[++i]) {
              if (isNull(x) || !isObject(x)) {
                str += " " + x;
              } else {
                str += " " + inspect(x);
              }
            }
            return str;
          };
          exports3.deprecate = function(fn, msg) {
            if (isUndefined(global2.process)) {
              return function() {
                return exports3.deprecate(fn, msg).apply(this, arguments);
              };
            }
            if (process.noDeprecation === true) {
              return fn;
            }
            var warned = false;
            function deprecated() {
              if (!warned) {
                if (process.throwDeprecation) {
                  throw new Error(msg);
                } else if (process.traceDeprecation) {
                  console.trace(msg);
                } else {
                  formatAppLog("error", "at node_modules/mqtt/dist/mqtt.js:13885", msg);
                }
                warned = true;
              }
              return fn.apply(this, arguments);
            }
            return deprecated;
          };
          var debugs = {};
          var debugEnviron;
          exports3.debuglog = function(set) {
            if (isUndefined(debugEnviron))
              debugEnviron = process.env.NODE_DEBUG || "";
            set = set.toUpperCase();
            if (!debugs[set]) {
              if (new RegExp("\\b" + set + "\\b", "i").test(debugEnviron)) {
                var pid = process.pid;
                debugs[set] = function() {
                  var msg = exports3.format.apply(exports3, arguments);
                  formatAppLog("error", "at node_modules/mqtt/dist/mqtt.js:13907", "%s %d: %s", set, pid, msg);
                };
              } else {
                debugs[set] = function() {
                };
              }
            }
            return debugs[set];
          };
          function inspect(obj, opts) {
            var ctx = {
              seen: [],
              stylize: stylizeNoColor
            };
            if (arguments.length >= 3)
              ctx.depth = arguments[2];
            if (arguments.length >= 4)
              ctx.colors = arguments[3];
            if (isBoolean(opts)) {
              ctx.showHidden = opts;
            } else if (opts) {
              exports3._extend(ctx, opts);
            }
            if (isUndefined(ctx.showHidden))
              ctx.showHidden = false;
            if (isUndefined(ctx.depth))
              ctx.depth = 2;
            if (isUndefined(ctx.colors))
              ctx.colors = false;
            if (isUndefined(ctx.customInspect))
              ctx.customInspect = true;
            if (ctx.colors)
              ctx.stylize = stylizeWithColor;
            return formatValue(ctx, obj, ctx.depth);
          }
          exports3.inspect = inspect;
          inspect.colors = {
            "bold": [1, 22],
            "italic": [3, 23],
            "underline": [4, 24],
            "inverse": [7, 27],
            "white": [37, 39],
            "grey": [90, 39],
            "black": [30, 39],
            "blue": [34, 39],
            "cyan": [36, 39],
            "green": [32, 39],
            "magenta": [35, 39],
            "red": [31, 39],
            "yellow": [33, 39]
          };
          inspect.styles = {
            "special": "cyan",
            "number": "yellow",
            "boolean": "yellow",
            "undefined": "grey",
            "null": "bold",
            "string": "green",
            "date": "magenta",
            // "name": intentionally not styling
            "regexp": "red"
          };
          function stylizeWithColor(str, styleType) {
            var style = inspect.styles[styleType];
            if (style) {
              return "\x1B[" + inspect.colors[style][0] + "m" + str + "\x1B[" + inspect.colors[style][1] + "m";
            } else {
              return str;
            }
          }
          function stylizeNoColor(str, styleType) {
            return str;
          }
          function arrayToHash(array) {
            var hash = {};
            array.forEach(function(val, idx) {
              hash[val] = true;
            });
            return hash;
          }
          function formatValue(ctx, value, recurseTimes) {
            if (ctx.customInspect && value && isFunction(value.inspect) && // Filter out the util module, it's inspect function is special
            value.inspect !== exports3.inspect && // Also filter out any prototype objects using the circular check.
            !(value.constructor && value.constructor.prototype === value)) {
              var ret = value.inspect(recurseTimes, ctx);
              if (!isString(ret)) {
                ret = formatValue(ctx, ret, recurseTimes);
              }
              return ret;
            }
            var primitive = formatPrimitive(ctx, value);
            if (primitive) {
              return primitive;
            }
            var keys = Object.keys(value);
            var visibleKeys = arrayToHash(keys);
            if (ctx.showHidden) {
              keys = Object.getOwnPropertyNames(value);
            }
            if (isError(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
              return formatError(value);
            }
            if (keys.length === 0) {
              if (isFunction(value)) {
                var name = value.name ? ": " + value.name : "";
                return ctx.stylize("[Function" + name + "]", "special");
              }
              if (isRegExp(value)) {
                return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
              }
              if (isDate(value)) {
                return ctx.stylize(Date.prototype.toString.call(value), "date");
              }
              if (isError(value)) {
                return formatError(value);
              }
            }
            var base = "", array = false, braces = ["{", "}"];
            if (isArray(value)) {
              array = true;
              braces = ["[", "]"];
            }
            if (isFunction(value)) {
              var n = value.name ? ": " + value.name : "";
              base = " [Function" + n + "]";
            }
            if (isRegExp(value)) {
              base = " " + RegExp.prototype.toString.call(value);
            }
            if (isDate(value)) {
              base = " " + Date.prototype.toUTCString.call(value);
            }
            if (isError(value)) {
              base = " " + formatError(value);
            }
            if (keys.length === 0 && (!array || value.length == 0)) {
              return braces[0] + base + braces[1];
            }
            if (recurseTimes < 0) {
              if (isRegExp(value)) {
                return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
              } else {
                return ctx.stylize("[Object]", "special");
              }
            }
            ctx.seen.push(value);
            var output;
            if (array) {
              output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
            } else {
              output = keys.map(function(key) {
                return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
              });
            }
            ctx.seen.pop();
            return reduceToSingleString(output, base, braces);
          }
          function formatPrimitive(ctx, value) {
            if (isUndefined(value))
              return ctx.stylize("undefined", "undefined");
            if (isString(value)) {
              var simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
              return ctx.stylize(simple, "string");
            }
            if (isNumber(value))
              return ctx.stylize("" + value, "number");
            if (isBoolean(value))
              return ctx.stylize("" + value, "boolean");
            if (isNull(value))
              return ctx.stylize("null", "null");
          }
          function formatError(value) {
            return "[" + Error.prototype.toString.call(value) + "]";
          }
          function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
            var output = [];
            for (var i = 0, l = value.length; i < l; ++i) {
              if (hasOwnProperty(value, String(i))) {
                output.push(formatProperty(
                  ctx,
                  value,
                  recurseTimes,
                  visibleKeys,
                  String(i),
                  true
                ));
              } else {
                output.push("");
              }
            }
            keys.forEach(function(key) {
              if (!key.match(/^\d+$/)) {
                output.push(formatProperty(
                  ctx,
                  value,
                  recurseTimes,
                  visibleKeys,
                  key,
                  true
                ));
              }
            });
            return output;
          }
          function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
            var name, str, desc;
            desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
            if (desc.get) {
              if (desc.set) {
                str = ctx.stylize("[Getter/Setter]", "special");
              } else {
                str = ctx.stylize("[Getter]", "special");
              }
            } else {
              if (desc.set) {
                str = ctx.stylize("[Setter]", "special");
              }
            }
            if (!hasOwnProperty(visibleKeys, key)) {
              name = "[" + key + "]";
            }
            if (!str) {
              if (ctx.seen.indexOf(desc.value) < 0) {
                if (isNull(recurseTimes)) {
                  str = formatValue(ctx, desc.value, null);
                } else {
                  str = formatValue(ctx, desc.value, recurseTimes - 1);
                }
                if (str.indexOf("\n") > -1) {
                  if (array) {
                    str = str.split("\n").map(function(line) {
                      return "  " + line;
                    }).join("\n").substr(2);
                  } else {
                    str = "\n" + str.split("\n").map(function(line) {
                      return "   " + line;
                    }).join("\n");
                  }
                }
              } else {
                str = ctx.stylize("[Circular]", "special");
              }
            }
            if (isUndefined(name)) {
              if (array && key.match(/^\d+$/)) {
                return str;
              }
              name = JSON.stringify("" + key);
              if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
                name = name.substr(1, name.length - 2);
                name = ctx.stylize(name, "name");
              } else {
                name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
                name = ctx.stylize(name, "string");
              }
            }
            return name + ": " + str;
          }
          function reduceToSingleString(output, base, braces) {
            var length = output.reduce(function(prev, cur) {
              if (cur.indexOf("\n") >= 0)
                ;
              return prev + cur.replace(/\u001b\[\d\d?m/g, "").length + 1;
            }, 0);
            if (length > 60) {
              return braces[0] + (base === "" ? "" : base + "\n ") + " " + output.join(",\n  ") + " " + braces[1];
            }
            return braces[0] + base + " " + output.join(", ") + " " + braces[1];
          }
          function isArray(ar) {
            return Array.isArray(ar);
          }
          exports3.isArray = isArray;
          function isBoolean(arg) {
            return typeof arg === "boolean";
          }
          exports3.isBoolean = isBoolean;
          function isNull(arg) {
            return arg === null;
          }
          exports3.isNull = isNull;
          function isNullOrUndefined(arg) {
            return arg == null;
          }
          exports3.isNullOrUndefined = isNullOrUndefined;
          function isNumber(arg) {
            return typeof arg === "number";
          }
          exports3.isNumber = isNumber;
          function isString(arg) {
            return typeof arg === "string";
          }
          exports3.isString = isString;
          function isSymbol(arg) {
            return typeof arg === "symbol";
          }
          exports3.isSymbol = isSymbol;
          function isUndefined(arg) {
            return arg === void 0;
          }
          exports3.isUndefined = isUndefined;
          function isRegExp(re) {
            return isObject(re) && objectToString(re) === "[object RegExp]";
          }
          exports3.isRegExp = isRegExp;
          function isObject(arg) {
            return typeof arg === "object" && arg !== null;
          }
          exports3.isObject = isObject;
          function isDate(d) {
            return isObject(d) && objectToString(d) === "[object Date]";
          }
          exports3.isDate = isDate;
          function isError(e) {
            return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
          }
          exports3.isError = isError;
          function isFunction(arg) {
            return typeof arg === "function";
          }
          exports3.isFunction = isFunction;
          function isPrimitive(arg) {
            return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || // ES6 symbol
            typeof arg === "undefined";
          }
          exports3.isPrimitive = isPrimitive;
          exports3.isBuffer = require2("./support/isBuffer");
          function objectToString(o) {
            return Object.prototype.toString.call(o);
          }
          function pad(n) {
            return n < 10 ? "0" + n.toString(10) : n.toString(10);
          }
          var months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec"
          ];
          function timestamp() {
            var d = /* @__PURE__ */ new Date();
            var time = [
              pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())
            ].join(":");
            return [d.getDate(), months[d.getMonth()], time].join(" ");
          }
          exports3.log = function() {
            formatAppLog("log", "at node_modules/mqtt/dist/mqtt.js:14353", "%s - %s", timestamp(), exports3.format.apply(exports3, arguments));
          };
          exports3.inherits = require2("inherits");
          exports3._extend = function(origin, add) {
            if (!add || !isObject(add))
              return origin;
            var keys = Object.keys(add);
            var i = keys.length;
            while (i--) {
              origin[keys[i]] = add[keys[i]];
            }
            return origin;
          };
          function hasOwnProperty(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
          }
        }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
      }, { "./support/isBuffer": 116, "_process": 92, "inherits": 80 }], 118: [function(require2, module3, exports3) {
        (function(process, global2) {
          var Transform = require2("readable-stream").Transform;
          var duplexify = require2("duplexify");
          var WS = require2("ws");
          var Buffer = require2("safe-buffer").Buffer;
          module3.exports = WebSocketStream;
          function buildProxy(options, socketWrite, socketEnd) {
            var proxy = new Transform({
              objectMode: options.objectMode
            });
            proxy._write = socketWrite;
            proxy._flush = socketEnd;
            return proxy;
          }
          function WebSocketStream(target, protocols, options) {
            var stream, socket;
            var isBrowser = process.title === "browser";
            var isNative = !!global2.WebSocket;
            var socketWrite = isBrowser ? socketWriteBrowser : socketWriteNode;
            if (protocols && !Array.isArray(protocols) && "object" === typeof protocols) {
              options = protocols;
              protocols = null;
              if (typeof options.protocol === "string" || Array.isArray(options.protocol)) {
                protocols = options.protocol;
              }
            }
            if (!options)
              options = {};
            if (options.objectMode === void 0) {
              options.objectMode = !(options.binary === true || options.binary === void 0);
            }
            var proxy = buildProxy(options, socketWrite, socketEnd);
            if (!options.objectMode) {
              proxy._writev = writev;
            }
            var bufferSize = options.browserBufferSize || 1024 * 512;
            var bufferTimeout = options.browserBufferTimeout || 1e3;
            if (typeof target === "object") {
              socket = target;
            } else {
              if (isNative && isBrowser) {
                socket = new WS(target, protocols);
              } else {
                socket = new WS(target, protocols, options);
              }
              socket.binaryType = "arraybuffer";
            }
            if (socket.readyState === socket.OPEN) {
              stream = proxy;
            } else {
              stream = duplexify.obj();
              socket.onopen = onopen;
            }
            stream.socket = socket;
            socket.onclose = onclose;
            socket.onerror = onerror;
            socket.onmessage = onmessage;
            proxy.on("close", destroy);
            var coerceToBuffer = !options.objectMode;
            function socketWriteNode(chunk, enc, next) {
              if (socket.readyState !== socket.OPEN) {
                next();
                return;
              }
              if (coerceToBuffer && typeof chunk === "string") {
                chunk = Buffer.from(chunk, "utf8");
              }
              socket.send(chunk, next);
            }
            function socketWriteBrowser(chunk, enc, next) {
              if (socket.bufferedAmount > bufferSize) {
                setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next);
                return;
              }
              if (coerceToBuffer && typeof chunk === "string") {
                chunk = Buffer.from(chunk, "utf8");
              }
              try {
                socket.send(chunk);
              } catch (err) {
                return next(err);
              }
              next();
            }
            function socketEnd(done) {
              socket.close();
              done();
            }
            function onopen() {
              stream.setReadable(proxy);
              stream.setWritable(proxy);
              stream.emit("connect");
            }
            function onclose() {
              stream.end();
              stream.destroy();
            }
            function onerror(err) {
              stream.destroy(err);
            }
            function onmessage(event) {
              var data = event.data;
              if (data instanceof ArrayBuffer)
                data = Buffer.from(data);
              else
                data = Buffer.from(data, "utf8");
              proxy.push(data);
            }
            function destroy() {
              socket.close();
            }
            function writev(chunks, cb) {
              var buffers = new Array(chunks.length);
              for (var i = 0; i < chunks.length; i++) {
                if (typeof chunks[i].chunk === "string") {
                  buffers[i] = Buffer.from(chunks[i], "utf8");
                } else {
                  buffers[i] = chunks[i].chunk;
                }
              }
              this._write(Buffer.concat(buffers), "binary", cb);
            }
            return stream;
          }
        }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
      }, { "_process": 92, "duplexify": 17, "readable-stream": 108, "safe-buffer": 110, "ws": 119 }], 119: [function(require2, module3, exports3) {
        var ws = null;
        if (typeof WebSocket !== "undefined") {
          ws = WebSocket;
        } else if (typeof MozWebSocket !== "undefined") {
          ws = MozWebSocket;
        } else if (typeof window !== "undefined") {
          ws = window.WebSocket || window.MozWebSocket;
        }
        module3.exports = ws;
      }, {}], 120: [function(require2, module3, exports3) {
        module3.exports = wrappy;
        function wrappy(fn, cb) {
          if (fn && cb)
            return wrappy(fn)(cb);
          if (typeof fn !== "function")
            throw new TypeError("need wrapper function");
          Object.keys(fn).forEach(function(k) {
            wrapper[k] = fn[k];
          });
          return wrapper;
          function wrapper() {
            var args = new Array(arguments.length);
            for (var i = 0; i < args.length; i++) {
              args[i] = arguments[i];
            }
            var ret = fn.apply(this, args);
            var cb2 = args[args.length - 1];
            if (typeof ret === "function" && ret !== cb2) {
              Object.keys(cb2).forEach(function(k) {
                ret[k] = cb2[k];
              });
            }
            return ret;
          }
        }
      }, {}], 121: [function(require2, module3, exports3) {
        module3.exports = extend;
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        function extend() {
          var target = {};
          for (var i = 0; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
              if (hasOwnProperty.call(source, key)) {
                target[key] = source[key];
              }
            }
          }
          return target;
        }
      }, {}] }, {}, [9])(9);
    });
  })(mqtt$1);
  var mqttExports = mqtt$1.exports;
  const mqtt = /* @__PURE__ */ getDefaultExportFromCjs(mqttExports);
  const APP = {
    data() {
      return {
        host: "iot-06z009x0arwe1va.mqtt.iothub.aliyuncs.com",
        port: 443,
        clientId: "j120vFnUp26.web_mqtt|securemode=2,signmethod=hmacsha256,timestamp=1737290441216|",
        username: "web_mqtt&j120vFnUp26",
        password: "633ef089f6c6128c68cb9c833d2e73b64abb34ecfbfb13003fde3f4bfd75aa64",
        setTopic: "/j120vFnUp26/web_mqtt/user/get",
        pubTopic: "/sys/j120vFnUp26/web_mqtt/thing/event/property/post",
        pubReply: "/sys/j120vFnUp26/web_mqtt/thing/event/property/post_reply",
        isConnected: false,
        connectionStatus: "Disconnected",
        messages: [],
        state: null,
        time: null,
        client: null,
        parsedHistoryData: [],
        shelfData: {}
      };
    },
    onPullDownRefresh() {
      formatAppLog("log", "at pages/index/APP.js:25", "Pull-down refresh triggered.");
      this.clearData();
      this.disconnectMQTT();
      uni.stopPullDownRefresh();
    },
    methods: {
      connectMQTT() {
        const {
          host,
          port,
          clientId,
          username,
          password
        } = this;
        let http;
        http = `wxs://${host}:${port}/mqtt`;
        uni.connectSocket = /* @__PURE__ */ function(connectSocket) {
          return function(options) {
            formatAppLog("log", "at pages/index/APP.js:52", options);
            options.success = options.success || function() {
            };
            return connectSocket.call(this, options);
          };
        }(uni.connectSocket);
        this.client = mqtt.connect(http, {
          clientId,
          username,
          password
        });
        this.client.on("connect", () => {
          this.isConnected = true;
          this.connectionStatus = "Connected";
          this.client.subscribe(`${this.setTopic}`, (err) => {
            if (err) {
              formatAppLog("error", "at pages/index/APP.js:72", "Failed to subscribe", err);
            } else {
              formatAppLog("log", "at pages/index/APP.js:74", "Subscribed to topic successfully");
            }
          });
        });
        this.client.on("message", (topic, message) => {
          const msg = `Topic: ${topic}, Message: ${message.toString()}`;
          this.messages.push(msg);
          try {
            this.onMessageReceived(topic, message.toString());
          } catch (err) {
            formatAppLog("warn", "at pages/index/APP.js:85", "Received non-JSON message", message.toString());
          }
        });
        this.client.on("error", (error) => {
          formatAppLog("error", "at pages/index/APP.js:90", "MQTT Error:", error);
        });
        this.client.on("close", () => {
          this.isConnected = false;
          this.connectionStatus = "Disconnected";
        });
      },
      onMessageReceived(topic, rawMessage) {
        if (topic === `${this.setTopic}`) {
          try {
            const parsedMessage = JSON.parse(rawMessage);
            if (parsedMessage && parsedMessage.items) {
              this.deviceData = parsedMessage;
              const items = parsedMessage.items;
              Object.keys(items).forEach((key) => {
                const value = items[key];
                formatAppLog("log", "at pages/index/APP.js:112", "value:", value);
                if (value) {
                  this.state = value.value;
                  this.parsedHistoryData.push({
                    time: value.time,
                    state: this.state || "0"
                  });
                }
                formatAppLog("log", "at pages/index/APP.js:121", "state", this.state);
              });
              this.parsedHistoryData.sort((a, b) => b.time - a.time);
            } else {
              formatAppLog("warn", "at pages/index/APP.js:125", "No items found in message");
            }
          } catch (err) {
            formatAppLog("error", "at pages/index/APP.js:128", "Failed to parse message:", err);
          }
        }
      },
      // 切换锁状态
      toggleLockState() {
        const newState = this.state === 1 ? 0 : 1;
        this.state = newState;
        const payload = {
          id: Date.now().toString(),
          version: "1.0",
          params: {
            Lock: newState
            // 上报的新状态
          },
          method: "thing.event.property.post"
        };
        if (this.client) {
          this.client.publish(
            `${this.pubTopic}`,
            // 目标 Topic
            JSON.stringify(payload),
            // 数据
            (err) => {
              if (err) {
                formatAppLog("error", "at pages/index/APP.js:177", "Failed to publish lock state:", err);
              } else {
                formatAppLog("log", "at pages/index/APP.js:179", `Lock state changed to ${newState} and reported successfully.`);
              }
            }
          );
        } else {
          formatAppLog("warn", "at pages/index/APP.js:185", "MQTT client is not connected.");
        }
      },
      clearData() {
        this.isConnected = false;
        this.connectionStatus = "Disconnected";
        this.messages = [];
        this.deviceData = {
          items: {}
        };
        this.parsedHistoryData = [];
        this.shelfData = {};
        formatAppLog("log", "at pages/index/APP.js:197", "clear values.");
      },
      disconnectMQTT() {
        if (this.client) {
          this.client.end();
          this.isConnected = false;
          this.connectionStatus = "Disconnected";
        }
      },
      // 格式化时间戳
      formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
      }
    }
  };
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$1 = APP;
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("div", {
      id: "app",
      class: "app-container"
    }, [
      vue.createElementVNode("h1", null, "Aliyun MQTT Connection "),
      vue.createElementVNode("div", { class: "container" }, [
        vue.createElementVNode("h3", null, "连接设置"),
        vue.createCommentVNode(' <div class="form-group">\r\n				<label for="host">Host:</label>\r\n				<input v-model="host" id="host" :disabled="true" />\r\n			</div>\r\n			<div class="form-group">\r\n				<label for="port">Port:</label>\r\n				<input v-model="port" type="number" id="port" :disabled="true" />\r\n			</div> '),
        vue.createElementVNode("div", { class: "form-group" }, [
          vue.createElementVNode("label", { for: "clientId" }, "Client ID:"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.clientId = $event),
              id: "clientId",
              disabled: true
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, _ctx.clientId]
          ])
        ]),
        vue.createElementVNode("div", { class: "form-group" }, [
          vue.createElementVNode("label", { for: "username" }, "Username:"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => _ctx.username = $event),
              id: "username",
              disabled: true
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, _ctx.username]
          ])
        ]),
        vue.createCommentVNode(' <div class="form-group">\r\n				<label for="password">Password:</label>\r\n				<input v-model="password" id="password" :disabled="true" />\r\n			</div> '),
        !_ctx.isConnected ? (vue.openBlock(), vue.createElementBlock("button", {
          key: 0,
          onClick: _cache[2] || (_cache[2] = (...args) => _ctx.connectMQTT && _ctx.connectMQTT(...args))
        }, "Connect")) : (vue.openBlock(), vue.createElementBlock("button", {
          key: 1,
          onClick: _cache[3] || (_cache[3] = (...args) => _ctx.disconnectMQTT && _ctx.disconnectMQTT(...args))
        }, "Disconnect"))
      ]),
      vue.createElementVNode(
        "div",
        { id: "connection-status" },
        vue.toDisplayString(_ctx.connectionStatus),
        1
        /* TEXT */
      ),
      vue.createElementVNode("hr"),
      vue.createElementVNode("div", { class: "messages" }, [
        vue.createCommentVNode(' 			<h2>消息显示</h2>\r\n			<div class="messages-container">\r\n				<text v-for="(msg, index) in messages" :key="index" class="message" selectable="true">{{ msg }}</text>\r\n			</div> ')
      ]),
      vue.createElementVNode("hr"),
      vue.createElementVNode("h3", null, "设备数据"),
      vue.createElementVNode("div", { class: "device-data-container" }, [
        vue.createCommentVNode(" 数据显示 "),
        vue.createElementVNode("div", { class: "device-data-item" }, [
          vue.createElementVNode("span", { class: "data-name" }, "当前锁状态"),
          vue.createElementVNode("div", { class: "data-value" }, [
            vue.withDirectives(vue.createElementVNode(
              "p",
              null,
              " 等待设备端数据 ",
              512
              /* NEED_PATCH */
            ), [
              [vue.vShow, _ctx.state == null]
            ]),
            vue.withDirectives(vue.createElementVNode(
              "div",
              null,
              [
                vue.createElementVNode(
                  "p",
                  null,
                  "Value: " + vue.toDisplayString(_ctx.state) + " (" + vue.toDisplayString(_ctx.state === 1 ? "开" : "关") + ") ",
                  1
                  /* TEXT */
                )
              ],
              512
              /* NEED_PATCH */
            ), [
              [vue.vShow, _ctx.state !== null]
            ]),
            vue.createCommentVNode(" 切换状态按钮 "),
            vue.createElementVNode("button", {
              onClick: _cache[4] || (_cache[4] = (...args) => _ctx.toggleLockState && _ctx.toggleLockState(...args))
            }, "切换锁状态")
          ])
        ])
      ]),
      vue.createElementVNode("h3", null, "历史数据"),
      vue.createElementVNode("div", { class: "history-data-container" }, [
        vue.createElementVNode("div", { class: "history-data-header" }, [
          vue.createElementVNode("div", { class: "history-data-item" }, "时间"),
          vue.createElementVNode("div", { class: "history-data-item" }, "锁状态")
        ]),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList(_ctx.parsedHistoryData, (item, index) => {
            return vue.openBlock(), vue.createElementBlock("div", {
              class: "history-data-row",
              key: index
            }, [
              vue.createElementVNode(
                "div",
                { class: "history-data-item" },
                vue.toDisplayString(_ctx.formatTimestamp(item.time)),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "div",
                { class: "history-data-item" },
                vue.toDisplayString(item.state === 1 ? "开" : "关"),
                1
                /* TEXT */
              )
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "G:/keilMDK5/Project/RFID_Parking_Lock/main/pages/index/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
      formatAppLog("log", "at App.vue:5", "Design By XJY");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:8", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:11", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "G:/keilMDK5/Project/RFID_Parking_Lock/main/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
