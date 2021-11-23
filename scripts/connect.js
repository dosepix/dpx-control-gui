import { show_container } from './sidebar.js';
import { connection_state } from './main.js';
const axios = require('axios');

// === Port Selection ===
var port_select_refresh_button = $("#port-select-refresh-button");
var port_select = document.querySelector('#port-select'); // $("#port-select");
var baud_input = document.querySelector("#baud-input");
var config_input = document.querySelector("#config-input");
var config_input_reset_button = $("#config-input-reset-button");
var connect_button =$("#connect-button");
var alert_modal = $("#alert-modal");
alert_modal.appendTo("body");

// Show available ports in select
function get_ports() {
    axios.post(window.url + '/control/get_ports').then((res) => {
        let ports = res.data.ports;
        // DEBUG
        // let ports = ['port1', 'port2', 'port3'];

        // Clear all options
        for(let idx=0; idx < port_select.options.length; idx) {
            port_select.remove(idx); 
        }
        if (ports.length > 0) {
            // Add current options
            for (let port of ports) {
                port_select.add(new Option(port));
            }
            port_select.disabled = false;
        } else {
            port_select.add(new Option('No ports available'));
            port_select.disabled = true;
        }
    });
}

// console.log(port_select.val());
port_select_refresh_button.on('click', get_ports);

// Get initial value to reset field on button press
var config_input_init = config_input.value;
config_input_reset_button.on('click', () => {
    config_input.value = config_input_init;
});

connect_button.on('click', async function () {
    // let connected = axios.post();

    if (!window.dpx_connected) {
        // Port is required
        if (port_select.value === null) {
            // TODO: Change text
            alert_modal.modal('show');
            return;
        } 
        axios.post(window.url + 'control/set_port', {"port": port_select.value})
        .then((res) => {});

        // Baud rate is required
        if (!baud_input.value) {
            console.log("Baud rate is missing!");
            alert_modal.modal('show');
            return;
        }

        axios.post(window.url + 'control/set_baud', {"baud": baud_input.value})
            .then((res) => {
                // console.log(res);
            }).catch((error) => {

            }
        );

        // Load config, otherwise use standard values
        if (config_input.value) {
            axios.post(window.url + 'control/set_config', {"file": config_input.files[0].path});
        }

        // TODO: Requires timeout!
        axios.post(url + 'control/connect').then(async (res) => {
            await is_connected();
            connect_button.text("Connect");
            connect_button.prop('disabled', false);
    
            // Return to main screen if sucessfully connected
            connection_state();
            show_container( 'main' );
        }).catch((error) => {
            console.log(error.toJSON());
        });

        connect_button.text("Connecting...");
        connect_button.prop('disabled', true);
    } else {
        disconnect();
    }
});

export async function is_connected() {
    try {
        let res = await axios.get(window.url + 'control/isconnected');
        if (res.status == 201) {
            window.dpx_connected = true;
            return true;
        }
    } catch (err) {
        console.log(err);
        window.dpx_connected = false;
        return false;
    }
}

export async function disconnect() {
    let tries = 10;
    console.log(await is_connected());
    while (await is_connected() & (tries > 0)) {
        // Need to wait for disconnect before state can be checked
        await axios.delete(window.url + 'control/connect')
        .then((res) => {
            console.log(res)
        }).catch((err) => {
            console.log(err);
        });
        tries -= 1;
    }
}

$( document ).ready(() => {
    get_ports();
});
