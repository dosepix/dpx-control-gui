const axios = require('axios');
const chartjs = require('chart.js');
import { Sidebar } from './sidebar.js';

export var Config = (function() {
    // = Public =
    // Config
    var input_name = $('#input-name');
    var input_dpx = $('#input-dpx');
    var input_ikrum = $('#input-ikrum');
    var create_config_button = $('#create-config-button');
    var dismiss_config_button =$('#dismiss-config-button');

    // Equalization
    var equal_modal = $('#equal-modal');
    var equal_modal_body = document.querySelector('#equal-modal-body');
    var equal_button = $('#equal-button');
    var equal_discard_button = $('#equal-discard-button');

    // Global config state
    var config_state = {
        config_id: -1,
        common: false,
        thl_calib: false,
        equal: false,
    }

    function set_config_state(state) {
        config_state = state;
    }

    // Write config to database
    async function write_config() {
        if (!input_name.val()) {
            console.log('Name is missing');
            return undefined;
        }

        if (!input_dpx.val()) {
            console.log('DPX number is missing');
            return undefined;
        }

        if (!input_ikrum.val()) {
            console.log('Ikrum is missing');
            return undefined;
        }

        let config_params = {
            'name': input_name.val(),
            'user_id': window.current_user.id,
            'dosepix_id': input_dpx.val(),
            'i_krum': input_ikrum.val(),
        }

        try {
            let res = await axios.post(window.url + 'config/new', config_params);
            return res.data.config_id;
        } catch (error) {
            console.log(error);
        }
    }

    // === EQUALIZATION ===
    equal_button.on('click', async () => {
        var config_id;
        if(!config_state.common) {
            config_id = await write_config();
            if (config_id == undefined) return;

            config_state.config_id = config_id;
            config_state.common = true;
        } else {
            config_id = config_state.config_id;
        }

        // Check if THL calib exists
        await axios.get(window.url + `config/set_thl_calib?config_id=${config_id}`).then(function (res) {
            console.log(res);
            let thl_calib_data = res.data;
        }).catch((err) => {console.log(err);});

        await axios.get(window.url + 'measure/equal').then(function (res) {
            console.log(res);

            // Show progress in modal
            equal_modal.modal('show');
        }).catch((err) => {
            return;
        });

        // Perform measurement
        let res = {data: {stage: undefined}};
        let status_bar = undefined;
        let label = undefined;
        while (res.data.stage != 'finished') {
            await axios.post(window.url + 'measure/equal').then(function (res) {
                console.log(res.data);
                switch (res.data.stage) {
                    case 'THL_pre_start':
                        console.log('Start measurement')

                        // Label
                        label = document.createElement('label');
                        equal_modal_body.appendChild(label);
                        $(label).text('Starting Measurement');

                        // Status bar
                        status_bar = document.createElement('div');
                        status_bar.className = 'progress-bar progress-bar-success progress-bar-striped active';
                        status_bar.setAttribute("role", "progress");
                        equal_modal_body.appendChild(status_bar);
                        break;

                    case 'THL_pre_loop_start':
                        $(label).text(`Scanning THL for pixelDAC ${res.data.status}`)

                    case 'THL_start':
                        $(status_bar).css("width", 0 + "%")
                            .attr("aria-valuenow", 0)
                        break;

                    case 'THL':
                    case 'THL_pre':
                        let current_progress = res.data.status * 100;
                        current_progress = current_progress.toFixed( 2 );
                        // status_bar[0].setAttribute('aria-valuenow', res.data.status * 100);
                        $(status_bar).css("width", current_progress + "%")
                            .attr("aria-valuenow", current_progress)
                            .text(current_progress + "%");
                        console.log(res.data.status);
                        break;

                    default:
                        break;
                }
            });
        }
        for (let i = 0; i < 10; i++) {
        }

        config_state.equal = true;
    });

    create_config_button.on('click', () => {
        write_config();

        // Jump back to previous page
        Sidebar.jump_back(  window.app_state );
    });

    dismiss_config_button.on('click', () => {
        // Jump back to previous page
        Sidebar.jump_back(  window.app_state );
    });

    function on_init() {
        // Create initial config name
        if (window.dpx_state.dpx_id != undefined) {
            input_dpx.val(window.dpx_state.dpx_id);

            // If initial name already in db, 
            // increment its index until the name is unique
            axios.get(window.url + 'config/get_all').then((res) => {
                let configs = res.data.map(config => {return config.name});
                let start_name = `config_dpx${input_dpx.val()}`;
                let name = start_name;
                let idx = 0;
                while(configs.includes(name)) {
                    // Increment name index by 1
                    name = start_name + "_" + String(idx);
                    idx++;
                }
                input_name.val( name );
            }).catch((err) => {
                // No configs found
                input_name.val(`config_dpx${input_dpx.val()}`);
            });
        }
    }

    // = Private =
    return {
        on_init: on_init,
        set_config_state: set_config_state,
    }
})();
