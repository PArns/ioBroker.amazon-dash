/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var utils = require(__dirname + '/lib/utils');
var adapter = utils.Adapter('amazon-dash');
var int_array_to_hex = require('./helpers.js').int_array_to_hex;
var pcap = require('pcap');

var MACs = [   // no defaults
];

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


adapter.on('ready', function () {
    main();
});

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

function main() {
    var k;
    if (adapter.config.devices && adapter.config.devices.length) {
        for (k = 0; k < adapter.config.devices.length; k++) {
            var mac = adapter.config.devices[k].mac;
            var macOK = mac.replaceAll(":", "");

            if (macOK.length > 11) {                // full MAC´s
                MACs.push(macOK.substring(0,12));
                adapter.log.debug('manual MAC : ' + MACs.push(macOK.substring(0,6)));
            }
        }
    }

    MACs = remove_duplicates(MACs);

    if (typeof adapter.config.interface == 'undefined' || adapter.config.interface === '') {
        adapter.config.interface = "";
        adapter.log.info('starting pcap session on default interface');
    } else {
        adapter.log.info('starting pcap session on interface '+adapter.config.interface);
    }

    var pcap_session = pcap.createSession(adapter.config.interface, "arp");

    pcap_session.on('packet', function (raw_packet) {
        var packet = pcap.decode.packet(raw_packet);
        if (packet.payload.ethertype === 2054) {

            var mac = packet.payload.payload.sender_ha.addr;
            mac = int_array_to_hex(mac);

            var nice_mac = mac.replaceAll(":", "-");
            var needle = mac.slice(0, 17).toString().toUpperCase().split(':').join('');

            adapter.log.debug('needle MAC : ' + needle);
            
            if (MACs.indexOf(needle) > -1) {
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

                adapter.setState(nice_mac + ".lastPressed", {val: (new Date()).toISOString(), ack: true});

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
                    else {
                        var now = new Date();
                        if (now.getTime() - state.lc > 5000) {
                            adapter.setState(nice_mac + ".switch", {val: !state.val, ack: true});
                        }
                    }
                });
            }
        }
    });
}

function remove_duplicates(arr) {
    var obj = {};
    var ret_arr = [];
    for (var i = 0; i < arr.length; i++) {
        obj[arr[i]] = true;
    }
    for (var key in obj) {
        ret_arr.push(key);
    }
    return ret_arr;
}
