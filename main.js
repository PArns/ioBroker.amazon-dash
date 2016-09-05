/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var utils = require(__dirname + '/lib/utils');
var adapter = utils.adapter('amazon-dash');
var int_array_to_hex = require('./helpers.js').int_array_to_hex;
var manufacturer_directory = require('./manufacturer.js').manufacturer_directory;
var pcap = require('pcap');

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

adapter.on('ready', function () {
    var pcap_session = pcap.createSession("", "arp");

    pcap_session.on('packet', function (raw_packet) {
        var packet = pcap.decode.packet(raw_packet);
        if (packet.payload.ethertype === 2054) {

            var mac = packet.payload.payload.sender_ha.addr;
            mac = int_array_to_hex(mac);

            var nice_mac = mac.replaceAll(":", "-");

            var manufacturer = manufacturer_directory[mac.slice(0, 8).toString().toUpperCase().split(':').join('')];

            if (manufacturer === "Amazon Technologies Inc.") {
                adapter.setObjectNotExists(nice_mac + ".pressed", {
                    type: "state",
                    common: {
                        name: "Dash button pressed",
                        type: "boolean",
                        role: "switch",
                        read: true,
                        write: false
                    }
                });

                adapter.setState(nice_mac + ".pressed", {val: true, ack: true});

                setTimeout(function () {
                    adapter.setState(nice_mac + ".pressed", {val: false, ack: true});
                }, 5000);

                adapter.setObjectNotExists(nice_mac + ".lastPressed", {
                    type: "state",
                    common: {
                        name: "Dash button last pressed date",
                        type: "string",
                        role: "indicator.date",
                        read: true,
                        write: false
                    }
                });

                adapter.setState(nice_mac + ".state", {val: (new Date()).toISOString(), ack: true});

                adapter.setObjectNotExists(nice_mac + ".switch", {
                    type: "state",
                    common: {
                        name: "Dash button state toggle",
                        type: "boolean",
                        role: "switch",
                        read: true,
                        write: false
                    }
                });

                adapter.getState(nice_mac + ".switch", function (err, state) {
                    if (!state || err)
                        adapter.setState(nice_mac + ".switch", {val: false, ack: true});
                    else
                        adapter.setState(nice_mac + ".switch", {val: !state.val, ack: true});
                });
            }
        }
    });
});