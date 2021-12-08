const bootstrap = require('bootstrap');
const axios = require('axios');
import { Sidebar } from './sidebar.js';
import { Main } from './main.js';
import { Thl_calibration } from './thl_calib.js';
import { Equalization } from './equalization.js';

export var Connect = (function() {
    // = Private =
    var gray_out = 0.5;

    // === Port Selection ===
    var port_select_refresh_button = $("#port-select-refresh-button");
    var port_select = document.querySelector('#port-select'); // $("#port-select");
    var baud_input = document.querySelector("#baud-input");
    var dpx_input = $("#dpx-input");

    // === Config ===
    var config_select = document.querySelector("#config-select");
    var config_select_button = $("#config-select-button");

    // === THL Calib ===
    var thl_calib_div = $("#thl-calib-div");
    var thl_calib_select = document.querySelector('#thl-calib-select');
    var thl_calib_new_button = document.querySelector('#thl-calib-new-button');
    var thl_calib_reset_button = $('#thl-calib-reset-button');

    // === Equalization ===
    var equal_select = document.querySelector('#equal-select');
    var equal_new_button = document.querySelector('#equal-new-button');
    var equal_reset_button = $('#equal-reset-button');

    // === Connect ===
    var connect_button = $("#connect-button");
    var alert_modal = $("#alert-modal");
    alert_modal.appendTo("body");

    // Show available ports in select
    function get_ports() {
        axios.post(window.url + 'control/get_ports').then((res) => {
            let ports = res.data.ports;

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

    async function establish_connection(container_name=undefined) {
        if (!window.dpx_connected) {
            // Port is required
            if (port_select.value === null) {
                // TODO: Change text
                alert_modal.modal('show');
                return;
            } 

            await axios.post(window.url + 'control/set_port', {"port": port_select.value})
            .then((res) => {});

            // Baud rate is required
            if (!baud_input.value) {
                console.log("Baud rate is missing!");
                $('#baud-input').popover('show');
                // alert_modal.modal('show');
                return;
            }

            await axios.post(window.url + 'control/set_baud', {"baud": baud_input.value})
            .then((res) => {
                // console.log(res);
                }).catch((error) => {});

            // Load config, otherwise use standard values
            /*
            if (config_input.value) {
                axios.post(window.url + 'control/set_config', {"file": config_input.files[0].path});
            } */

            // Try to connect
            connect_button.text("Connecting...");
            connect_button.prop('disabled', true);

            // TODO: Requires timeout!
            await axios.post(url + 'control/connect').then(async (res) => {
                // Visually show connection approach

                await is_connected();
                connect_button.text("Disconnect");
                connect_button.attr('class', 'btn btn-danger');
                connect_button.prop('disabled', false);
        
                // Return to main screen if sucessfully connected
                Main.connection_state();
                if (container_name != undefined) {
                    Sidebar.show_container( container_name );
                }
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
                throw(err);
            });
        } else {
            disconnect();
            connect_button.text("Connect");
            connect_button.attr('class', 'btn btn-primary')
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
    connect_button.on('click', () => {
        establish_connection( 'main' );
    });

    // Create new config
    config_select_button.on("click", async () => {
        Sidebar.show_container( 'config' );
    });

    function enable_select(select, new_button, reset_button) {
        select.disabled = false;
        select.style.opacity = 1;
        new_button.disabled = false;
        new_button.style.opacity = 1;
        reset_button.prop('disabled', false);
    }

    function disable_select(select, new_button, reset_button, text) {
        // Clear thl calib select
        for(let idx=0; idx < select.options.length; idx) {
            select.remove(idx); 
        }
        // Disable THL calib selection
        select.add(new Option(text, undefined));
        select.disabled = true;
        new_button.disabled = true;

        // Gray out elements
        select.style.opacity = gray_out;
        new_button.style.opacity = gray_out;
        reset_button.prop('disabled', true);
    }

    // Get configs from db and set options in selection
    async function find_configs(dpx_number) {
        // Clear config select
        for(let idx=0; idx < config_select.options.length; idx) {
            config_select.remove(idx); 
        }

        // Search configs
        try {
            let res = await axios.get(window.url + `config/get_all?dpx_id=${dpx_number}`);
            for (let config of res.data) {
                config_select.add(new Option(config.name, config.id));
            }
            config_select.disabled = false;

            // Currently selected config
            window.dpx_state.config_id = config_select.value;

            // Scan for existing THL calibs and equalizations
            await find_thl_calibs(config_select.value);
            await find_equalizations(config_select.value);

            return true;
        } catch (err) {
            // If there are no configs
            config_select.add(new Option("No configs found - select DPX number", undefined));
            config_select.disabled = true;
            window.dpx_state.config_id = undefined;

            disable_select(thl_calib_select, thl_calib_new_button, thl_calib_reset_button, "Select config first");
            window.dpx_state.thl_calib_id = undefined;
            disable_select(equal_select, equal_new_button, equal_reset_button, "Select config first");
            window.dpx_state.equal_id = undefined;
            return false;
        }
    }

    async function find_thl_calibs(config_id) {
        // Clear thl calib select
        for(let idx=0; idx < thl_calib_select.options.length; idx) {
            thl_calib_select.remove(idx); 
        }

        // Search thl calibs
        try {
            let res = await axios.get(window.url + `config/get_thl_calib_ids_names?config_id=${config_id}`);
            for (let thl_calib of res.data) {
                thl_calib_select.add(new Option(thl_calib.name, thl_calib.id));
            }

            // Enable selection and creation of new one
            enable_select(thl_calib_select, thl_calib_new_button, thl_calib_reset_button);

            // Set currently shown value
            if (window.dpx_state.thl_calib_id == undefined) {
                window.dpx_state.thl_calib_id = thl_calib_select.value;
            } 
            thl_calib_select.value = window.dpx_state.thl_calib_id;
            return true;
        } catch (err) {
            // No calibrations found, only allow to create a new one
            disable_select(thl_calib_select, thl_calib_new_button, thl_calib_reset_button, "No calibrations found");
            thl_calib_new_button.disabled = false;
            window.dpx_state.thl_calib_id = undefined;
            thl_calib_new_button.style.opacity = 1;

            return false;
        }
    }

    async function find_equalizations(config_id) {
        // Clear equal select
        for(let idx=0; idx < equal_select.options.length; idx) {
            equal_select.remove(idx); 
        }

        // Search equals
        try {
            let res = await axios.get(window.url + `config/get_equal_ids_names?config_id=${config_id}`);
            for (let equal of res.data) {
                equal_select.add(new Option(equal.name, equal.id));
            }

            // Enable selection and creation of new one
            enable_select(equal_select, equal_new_button, equal_reset_button);
            if (window.dpx_state.equal_id == undefined) {
                window.dpx_state.equal_id = equal_select.value;
            }
            equal_select.value = window.dpx_state.equal_id;
            return true;
        } catch (err) {
            // No equalizations found, only allow to create a new one
            disable_select(equal_select, equal_new_button, equal_reset_button, "No equalizations found");
            window.dpx_state.equal_id = undefined;
            equal_new_button.disabled = false;
            equal_new_button.style.opacity = 1;

            return false;
        }
    }

    // Scan database every time a number is put in the DPX number field
    dpx_input.on('input', () => {
        window.dpx_state.dpx_id = dpx_input.val();
        find_configs(dpx_input.val());
    });

    // Get selected config-id
    config_select.onchange = () => {
        window.dpx_state.config_id = config_select.value;
        find_thl_calibs(config_select.value);
        find_equalizations(config_select.value);
    };

    // Get selected thl-calib-id
    thl_calib_select.onchange = () => {
        window.dpx_state.thl_calib_id = thl_calib_select.value;
    };

    // Get selected equalization
    equal_select.onchange = () => {
        window.dpx_state.equal_id = equal_select.value;
    };

    // Create new THL calibration
    thl_calib_new_button.onclick = async function() {
        // Connect if not already connected
        if (!(await is_connected())) {
            establish_connection().then(() => {
                Thl_calibration.on_init();
                Thl_calibration.show_modal();
            });
        } else {
            Thl_calibration.on_init();
            Thl_calibration.show_modal();
        }
    }

    // Create new equalization
    equal_new_button.onclick = async function() {
        // Connect if not already connected
        if (!(await is_connected())) {
            establish_connection().then(() => {
                Equalization.on_init();
                Equalization.show_modal();
            });
        } else {
            Equalization.on_init();
            Equalization.show_modal();
        }
    }

    // === Reset buttons ===
    thl_calib_reset_button.on('click', () => {
        thl_calib_select.value = "No calibration selected";
        window.dpx_state.thl_calib_id = undefined;
    });

    equal_reset_button.on('click', () => {
        equal_select.value = "No equalization selected";
        window.dpx_state.equal_id = undefined;
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

    // Update connect screen
    function update_thl_calib(thl_calib_id) {
        thl_calib_select.value = thl_calib_id;
    }

    function update_equal(equal_id) {
        equal_select.value = equal_id;
    }

    function update() {
        find_configs(window.dpx_state.dpx_id);
        update_thl_calib(window.dpx_state.thl_calib_id);
        update_equal(window.dpx_state.equal_id);
    }

    // Call on init
    async function on_init() {
        console.log("Connect init");
        if (await is_connected()) {
            connect_button.text("Disconnect");
            connect_button.attr('class', 'btn btn-danger');
        }

        // Scan for ports
        Connect.get_ports();

        // Show available configs
        window.dpx_state.dpx_id = dpx_input.val();
        find_configs(dpx_input.val());
    }

    // = Public =
    return {
        on_init: on_init,
        get_ports: get_ports,
        find_configs: find_configs,
        is_connected: is_connected,
        disconnect: disconnect,
        update: update,
        update_thl_calib: update_thl_calib,
        update_equal: update_equal,
    }
})();
