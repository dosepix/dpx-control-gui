const axios = require('axios');
const chartjs = require('chart.js');
import { Sidebar } from './sidebar.js';
import { Renderer } from './renderer.js';

export var Config = (function() {
    // = Public =
    // Config
    var input_name = $('#input-name');
    var input_dpx = $('#input-dpx');
    var input_ikrum = $('#input-ikrum');
    var create_config_button = $('#create-config-button');
    var dismiss_config_button = $('#dismiss-config-button');

    // Advanced settings
    var adv_sett_modal = $('#adv-sett-modal');
    var adv_sett_modal_body = document.querySelector('#adv-sett-modal-body');
    var adv_sett_cross_button = $('#adv-sett-cross-button');
    var adv_sett_discard_button = $('#adv-sett-discard-button');
    var adv_sett_accept_button = $('#adv-sett-accept-button');
    var adv_sett_button = $('#adv-sett-button');

    // Advanced settings options
    var adv_sett_inputs= {
        'v_casc_reset': $('#pdac-vcasc-input'),
        'i_pixel_dac': $('#pdac-ipixeldac-input'),
        'v_fbk': $('#pdac-vfbk-input'),
        'i_preamp': $('#pdac-ipreamp-input'),
        'v_gnd': $('#pdac-vgnd-input'),
        'v_casc_preamp': $('#pdac-vcascpreamp-input'),
        'i_disc1': $('#pdac-idisc1-input'),
        'i_disc2': $('#pdac-idisc2-input'),
    }

    var adv_sett_sliders = {
        'v_casc_reset': $('#pdac-vcasc-slider'),
        'i_pixel_dac': $('#pdac-ipixeldac-slider'),
        'v_fbk': $('#pdac-vfbk-slider'),
        'i_preamp': $('#pdac-ipreamp-slider'),
        'v_gnd': $('#pdac-vgnd-slider'),
        'v_casc_preamp': $('#pdac-vcascpreamp-slider'),
        'i_disc1': $('#pdac-idisc1-slider'),
        'i_disc2': $('#pdac-idisc2-slider'),
    }

    var adv_sett_reset_buttons = {
        'v_casc_reset': $('#pdac-vcasc-button'),
        'i_pixel_dac': $('#pdac-ipixeldac-button'),
        'v_fbk': $('#pdac-vfbk-button'),
        'i_preamp': $('#pdac-ipreamp-button'),
        'v_gnd': $('#pdac-vgnd-button'),
        'v_casc_preamp': $('#pdac-vcascpreamp-button'),
        'i_disc1': $('#pdac-idisc1-button'),
        'i_disc2': $('#pdac-idisc2-button'),
    }

    var adv_sett_defaults = {
        'v_casc_reset': 84,
        'i_pixel_dac': 59,
        'v_fbk': 71,
        'i_preamp': 29,
        'v_gnd': 31,
        'v_casc_preamp': 49,
        'i_disc1': 27,
        'i_disc2': 54,
    }

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
            'user_id': Renderer.current_user.id,
            'dosepix_id': input_dpx.val(),
            'i_krum': input_ikrum.val(),
        }

        try {
            let res = await axios.post(Renderer.url + 'config/new', config_params);
            return res.data.config_id;
        } catch (error) {
            console.log(error);
        }
    }

    create_config_button.on('click', () => {
        write_config();
        // Jump back to previous page
        Sidebar.jump_back( Renderer.app_state );
    });

    dismiss_config_button.on('click', () => {
        // Jump back to previous page
        Sidebar.jump_back( Renderer.app_state );
    });

    // === Advanced settings ===
    // Open dialog for advanced settings
    adv_sett_button.on('click', () => {
        adv_sett_modal.modal('show');
    });

    // Discard buttons
    function close_adv_sett_modal() {
        adv_sett_modal.modal('hide');
    }

    adv_sett_cross_button.on('click', () => {
        close_adv_sett_modal();
    });

    adv_sett_discard_button.on('click', () => {
        close_adv_sett_modal();
    })

    // Accept button
    adv_sett_accept_button.on('click', () => {

    });

    // If slider is moved, change input
    for (const name in adv_sett_sliders) {
        adv_sett_sliders[name].on('input', () => {
            adv_sett_inputs[name].val(adv_sett_sliders[name].val());
        });
    }

    // If input is changed, adjust slider
    for (const name in adv_sett_inputs) {
        adv_sett_inputs[name].on('input', () => {
            adv_sett_sliders[name].val(adv_sett_inputs[name].val());
        });
    }

    // Reset buttons
    for (const name in adv_sett_reset_buttons) {
        adv_sett_reset_buttons[name].on('click', () => {
            adv_sett_inputs[name].val(adv_sett_defaults[name]);
            adv_sett_sliders[name].val(adv_sett_defaults[name]);
        });
    }

    function on_init() {
        // Create initial config name
        if (Renderer.dpx_state.dpx_id != undefined) {
            input_dpx.val(Renderer.dpx_state.dpx_id);

            // If initial name already in db, 
            // increment its index until the name is unique
            axios.get(Renderer.url + 'config/get_all').then((res) => {
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
