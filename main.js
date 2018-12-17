/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

const utils = require(__dirname + '/lib/utils');
const adapter = utils.Adapter('amazon-dash');
const int_array_to_hex = require('./helpers.js').int_array_to_hex;
const pcap = require('pcap');

let MACs = [
    "747548",
    "F0D2F1",
    "8871E5",
    "74C246",
    "F0272D",
    "34D270",
    "0C47C9",
    "A002DC",
    "AC63BE",
    "44650D",
    "50F5DA",
    "84D6D0",
    "B47C9C",
    "FCA667",
    "18742E",
    "78E103",
    "6837E9",
    "00FC8B",
    "40B4CD",
    "FC65DE",
    "2C3AE8",
    "6C5697",
    "38F73D"
];

String.prototype.replaceAll = function (search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


adapter.on('ready', function () {
    main();
});

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', (callback) => {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

function main() {
    if (adapter.config.devices && adapter.config.devices.length) {
        for (let k = 0; k < adapter.config.devices.length; k++) {
            let mac = adapter.config.devices[k].mac;
            let macOK = mac.replaceAll(":", "");

            if (macOK.length > 5) {                
                MACs.push(macOK.substring(0,6));
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

    let pcap_session = pcap.createSession(adapter.config.interface, "arp");

    pcap_session.on('packet', function (raw_packet) {
        const packet = pcap.decode.packet(raw_packet);
        if (packet.payload.ethertype === 2054) {

            let mac = packet.payload.payload.sender_ha.addr;
            mac = int_array_to_hex(mac);

            const nice_mac = mac.replaceAll(":", "-");
            const needle = mac.slice(0, 8).toString().toUpperCase().split(':').join('');

            adapter.log.debug('needle MAC : ' + needle);
            
            if (MACs.indexOf(needle) > -1) {

                adapter.getObject(nice_mac, (err, obj) => {
                    // if non existent or not type device
                    if (!obj || obj.type !== 'device') {
                        adapter.setObject(nice_mac, {
                            type: "device",
                            common: {},
                            native: {}
                        });
                    } // endIf
                });

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

                setTimeout(() => {
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

                adapter.getState(nice_mac + ".switch", (err, state) => {
                    if (!state || err)
                        adapter.setState(nice_mac + ".switch", {val: false, ack: true});
                    else {
                        const now = new Date();
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
    let obj = {};
    let ret_arr = [];
    for (let i = 0; i < arr.length; i++) {
        obj[arr[i]] = true;
    }
    for (let key in obj) {
        ret_arr.push(key);
    }
    return ret_arr;
}
