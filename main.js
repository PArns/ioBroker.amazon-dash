/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const cp = require('child_process');
const utils = require('@iobroker/adapter-core');
const pcap = require('pcap');
const adapterName = require('./package.json').name.split('.').pop();

let adapter;

let MACs = [
    '747548',
    'F0D2F1',
    '8871E5',
    '74C246',
    'F0272D',
    '34D270',
    '0C47C9',
    'A002DC',
    'AC63BE',
    '44650D',
    '50F5DA',
    '84D6D0',
    'B47C9C',
    'FCA667',
    '18742E',
    '78E103',
    '6837E9',
    '00FC8B',
    '40B4CD',
    'FC65DE',
    '2C3AE8',
    '6C5697',
    '38F73D',
    '6854FD'
];
let pcapSession;

String.prototype.replaceAll = function (search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function intArrayToHex (intArray) {
    return intArray.map(d => d.toString(16).padStart(2, '0')).join(':');
}

function startAdapter(options) {

    options = options || {};
    Object.assign(options, {
        name: adapterName
    });

    adapter = new utils.Adapter(options);

    adapter.on('ready', () => main());

    adapter.on('unload', callback => {
        try {
            adapter.log.info('cleaned everything up...');
            pcapSession.close();
            pcapSession = null;
            callback();
        } catch (e) {
            callback();
        }
    });

    return adapter;
} // endStartAdapter

function checkNetCapRights() {
    return new Promise((resolve, reject) => {
        const cmd = `sudo setcap 'cap_net_raw,cap_net_admin+eip' ${process.execPath}`;

        // System call used for update of js-controller itself,
        // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
        const child = cp.exec(cmd);

        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot set rights: ${code}`);
            } else {
                // command succeeded
                resolve();
            }
        });
    });
}

async function main() {
    if (adapter.config.checkRights && process.platform === 'linux') {
        await checkNetCapRights();
    }

    if (adapter.config.devices && adapter.config.devices.length) {
        for (let k = 0; k < adapter.config.devices.length; k++) {
            const mac = adapter.config.devices[k].mac;
            const macOK = mac.replaceAll(':', '');

            if (macOK.length > 5) {
                MACs.push(macOK.substring(0, 6));
                adapter.log.debug(`manual MAC: ${MACs.push(macOK.substring(0, 6))}`);
            }
        }
    }

    MACs = removeDuplicates(MACs);

    if (typeof adapter.config.interface === 'undefined' || adapter.config.interface === '') {
        adapter.config.interface = '';
        adapter.log.info('starting pcap session on default interface');
    } else {
        adapter.log.info(`starting pcap session on interface ${adapter.config.interface}`);
    }

    pcapSession = pcap.createSession(adapter.config.interface, {filter: 'arp'});

    pcapSession.on('packet', async rawPacket => {
        const packet = pcap.decode.packet(rawPacket);

        if (packet.payload.ethertype === 2054) {
            let mac = packet.payload.payload.sender_ha.addr;
            mac = intArrayToHex(mac);

            const niceMac = mac.replaceAll(':', '-');
            const needle = mac.slice(0, 8).toString().toUpperCase().split(':').join('');

            adapter.log.debug(`needle MAC: ${needle}`);

            if (MACs.includes(needle)) {
                try {
                    const obj = await adapter.getObjectAsync(niceMac);
                    // if non-existent or not type device
                    if (!obj || obj.type !== 'device') {
                        await adapter.setObjectAsync(niceMac, {
                            type: 'device',
                            common: {},
                            native: {}
                        });
                    }
                } catch (e) {
                    adapter.log.error(`Cannot create state [${niceMac}]: ${e}`);
                }

                const id = `${niceMac}.pressed`;

                await adapter.setObjectNotExistsAsync(id, {
                    type: 'state',
                    common: {
                        name: 'Dash button pressed',
                        type: 'boolean',
                        role: 'switch',
                        read: true,
                        write: false
                    }
                });

                await adapter.setStateAsync(id, {val: true, ack: true});

                // reset press state to false in 5 seconds
                setTimeout(() =>
                    adapter.setState(id, {val: false, ack: true}), 5000);

                await adapter.setObjectNotExistsAsync(`${niceMac}.lastPressed`, {
                    type: 'state',
                    common: {
                        name: 'Dash button last pressed date',
                        type: 'string',
                        role: 'indicator.date',
                        read: true,
                        write: false
                    }
                });

                await adapter.setStateAsync(`${niceMac}.lastPressed`, {val: (new Date()).toISOString(), ack: true});

                await adapter.setObjectNotExistsAsync(`${niceMac}.switch`, {
                    type: 'state',
                    common: {
                        name: 'Dash button state toggle',
                        type: 'boolean',
                        role: 'switch',
                        read: true,
                        write: false
                    }
                });

                try {
                    const state = await adapter.getStateAsync(`${niceMac}.switch`);
                    if (!state) {
                        await adapter.setStateAsync(`${niceMac}.switch`, {val: false, ack: true});
                    } else {
                        if (Date.now() - state.lc > 5000) {
                            await adapter.setStateAsync(`${niceMac}.switch`, {val: !state.val, ack: true});
                        }
                    }
                } catch (e) {
                    adapter.log.error(`Cannot set switch state [${niceMac}.switch]: ${e}`);
                }
            }
        }
    });
}

function removeDuplicates(arr) {
    const obj = {};
    const retArray = [];
    for (let i = 0; i < arr.length; i++) {
        obj[arr[i]] = true;
    }
    for (const key in obj) {
        retArray.push(key);
    }
    return retArray;
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} // endElse
