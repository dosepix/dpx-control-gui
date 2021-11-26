const bootstrap = require('bootstrap');
const axios = require('axios');
import { Sidebar } from './sidebar.js';
import { Main } from './main.js';

export var Connect = (function() {
    // = Private =
    // === Port Selection ===
    var port_select_refresh_button = $("#port-select-refresh-button");
    var port_select = document.querySelector('#port-select'); // $("#port-select");
    var baud_input = document.querySelector("#baud-input");
    var dpx_input = $("#dpx-input");
    var config_select = document.querySelector("#config-select");
    var config_select_button = $("#config-select-button");
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

    async function establish_connection(container_name) {
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
                $('#baud-input').popover('show');
                // alert_modal.modal('show');
                return;
            }

            axios.post(window.url + 'control/set_baud', {"baud": baud_input.value})
                .then((res) => {
                    // console.log(res);
                }).catch((error) => {

                }
            );

            // Load config, otherwise use standard values
            /*
            if (config_input.value) {
                axios.post(window.url + 'control/set_config', {"file": config_input.files[0].path});
            } */

            // Try to connect
            connect_button.text("Connecting...");
            connect_button.prop('disabled', true);

            // TODO: Requires timeout!
            axios.post(url + 'control/connect').then(async (res) => {
                // Visually show connection approach

                await is_connected();
                connect_button.text("Connect");
                connect_button.prop('disabled', false);
        
                // Return to main screen if sucessfully connected
                Main.connection_state();
                Sidebar.show_container( container_name );
            }).catch((error) => {
                // Cannot connect!
                // Enable connection
                connect_button.text("Connect");
                connect_button.prop('disabled', false);        

                let err = error.toJSON().status;
                switch(err) {
                    case 503:
                        // Ensure popover is only created once
                        connect_button.popover('show');
                    
                        console.log("Permission denied");
                        // Permission denied
                        break;
                    case 400:
                        // Baud rate or port missing
                        break;
                    default:
                        console.log(error.toJSON());
                }
            });
        } else {
            disconnect();
        }
    }

    async function is_connected() {
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

    async function disconnect() {
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

    // console.log(port_select.val());
    port_select_refresh_button.on('click', get_ports);

    // Connect button
    connect_button.on('click', () => { establish_connection("main") });

    // Create new config
    config_select_button.on("click", async () => {
        // Do not connect, just create config
        /*
        connect_button.text("Connecting...");
        connect_button.prop('disabled', true);
        config_select_button.text("Connecting...");
        config_select_button.prop('disabled', true);
        try {
            await establish_connection( "config" );
        } catch(error) {
            return;
        }
        */
        Sidebar.show_container("config");
    });

    function find_configs(dpx_number) {
        // Clean select
        for(let idx=0; idx < config_select.options.length; idx) {
            config_select.remove(idx); 
        }

        // Search configs
        axios.get(window.url + `config/get_all?dpx_id=${dpx_number}`).then((res) => {
            console.log(res);
            for (let config of res.data) {
                config_select.add(new Option(config.name));
            }
            config_select.disabled = false;
        }).catch((err) => {
            // If there are no configs
            config_select.add(new Option("No configs found - select DPX number"));
            config_select.disabled = true;
        });
    }

    // Scan database every time a number is put in the DPX number field
    dpx_input.on('input', () => {
        let dpx_number = dpx_input.val();
        window.dpx_state.dpx_id = dpx_number;

        // Scan database for existing configs
        find_configs(dpx_number);
    });

    // === Popovers ===
    // Attach error popovers to elements
    // Connect button
    let options = {
        title: "Error",
        content: "Permission denied or device not found. Connect your device or assign appropriate rights to access it",
        trigger: "manual",
        placement: "right",
        container: 'body'
    }
    connect_button.popover(options);

    // Baud rate input
    options = {
        title: "Baud rate error",
        content: "Please set an appropriate baud rate. Field cannot be empty!",
        trigger: "manual",
        placement: "right",
        container: 'body'
    }
    $('#baud-input').popover(options);

    // Hide popovers
    $('#baud-input').on('input', () => {
        $('#baud-input').popover('hide');
    });

    $(document).on("click", () => {
        connect_button.popover('hide');
    });

    function on_init() {
        // Scan for ports
        Connect.get_ports();

        // Show default configs
        Connect.find_configs(0);
    }

    // = Public =
    return {
        on_init: on_init,
        get_ports: get_ports,
        find_configs: find_configs,
        is_connected: is_connected,
        disconnect: disconnect,
    }
})();

// Execute on init
$( document ).ready(() => {
});
