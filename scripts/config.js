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
    var dismiss_config_button =$('#dismiss-config-button');

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

    create_config_button.on('click', async () => {
        let config_id = await write_config();
        Renderer.dpx_state.config_id = config_id;

        // Jump back to previous page
        Sidebar.jump_back(  Renderer.app_state );
    });

    dismiss_config_button.on('click', () => {
        // Jump back to previous page
        Sidebar.jump_back( Renderer.app_state );
    });

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
