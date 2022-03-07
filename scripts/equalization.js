const axios = require('axios');
import { Connect } from './connect.js';
import { Renderer } from './renderer.js';

export var Equalization = (function() {
    var equal_modal = $('#equal-modal');
    var equal_modal_body = document.querySelector('#equal-modal-body');
    var equal_start_button = $('#equal-start-button');
    var equal_discard_button = $('#equal-discard-button');
    var equal_cross_button = $('#equal-cross-button');
    var equal_name_input = $('#equal-name-input');

    function show_modal() {
        equal_modal.modal('show');
    }

    // Init with true, as measurement is not running
    var interrupt_measure = true;
    async function measure() {
        await axios.get(Renderer.url + 'measure/equal').then(function (res) {
            console.log(res);
            // Show progress in modal
        }).catch((err) => {
            return;
        });

        // Perform measurement
        let response = {data: {stage: undefined}};

        let status_bars = {
            'pre_00': undefined,
            'pre_3f': undefined,
            'main': undefined,
        }

        let labels = {
            'pre_00': undefined,
            'pre_3f': undefined,
            'main': undefined,
        }

        let last_text = "";
        let cnt = 0;
        let dots_num = 0;
        let status = {
            last_text: "",
            last_statusbar_id: undefined,
            last_label_id: undefined,
        }
        while (response.data.stage != 'finished') {
            equal_start_button.prop("disabled", true);

            if (interrupt_measure) {
                await axios.delete(Renderer.url + 'measure/equal').then((res) => {
                    equal_modal.modal('hide');
                    // TODO: Reset modal
                    // Connect.update(Renderer.dpx_state.thl_calib_id);
                });
                return;
            }

            await axios.post(Renderer.url + 'measure/equal').then(function (res) {
                response = res;
                switch (res.data.stage) {
                    case 'Init':
                        console.log('Start measurement')
                        equal_modal_body.appendChild(document.createElement('hr'));
                        break;

                    // Pre-scan
                    case 'THL_pre_start':
                        console.log('THL pre start');
                        // Label
                        labels['pre_00'] = document.createElement('label');
                        equal_modal_body.appendChild(labels['pre_00']);
                        $(labels['pre_00']).text('Starting Measurement');
                        status.last_label_id = 'pre_00';
                        break;

                    case 'THL_start':
                        console.log('THL start');
                        // Label
                        labels['main'] = document.createElement('label');
                        equal_modal_body.appendChild(labels.main);
                        $(labels['main']).text('Starting Measurement');
                        status.last_label_id = 'main';
                        break;

                    case 'THL_pre_loop_start':
                        if (res.data.status == '3f') {
                            labels['pre_3f'] = document.createElement('label');
                            equal_modal_body.appendChild(labels['pre_3f']);
                            status.last_label_id = 'pre_3f';

                            // Set 0f bar to 100%
                            $(status_bars[status.last_statusbar_id]).css("width", 100 + "%")
                                .attr("aria-valuenow", 100)
                                .text(100 + "%");
                        }
                    case 'THL_loop_start':
                        // Status bar
                        if (status.last_label_id == 'main') {
                            // Set 3f bar to 100%
                            $(status_bars[status.last_statusbar_id]).css("width", 100 + "%")
                                .attr("aria-valuenow", 100)
                                .text(100 + "%");
                            status.last_statusbar_id = `main`;
                        } else {
                            status.last_statusbar_id = `pre_${res.data.status}`;
                        }

                        status_bars[status.last_statusbar_id] = document.createElement('div');
                        status_bars[status.last_statusbar_id].className = 'progress-bar progress-bar-success progress-bar-striped active';
                        status_bars[status.last_statusbar_id].setAttribute("role", "progress");
                        equal_modal_body.appendChild(status_bars[status.last_statusbar_id]);

                        $(status_bars[status.last_statusbar_id]).css("width", 0 + "%")
                            .attr("aria-valuenow", 0);

                        if (status.last_label_id == 'main') {
                            last_text = `Final scan`;
                        } else {
                            last_text = `Scanning THL for pixelDAC ${res.data.status}`;
                        }
                        $(labels[status.last_label_id]).text(last_text);

                        console.log('THL loop start');
                        console.log(labels);
                        console.log(status_bars);
                        break;
    
                    case 'THL_pre':
                    case 'THL':
                        dots_num = cnt % 4;
                        $(labels[status.last_label_id]).text(last_text + '.'.repeat(dots_num));

                        let current_progress = res.data.status * 100;
                        current_progress = current_progress.toFixed( 2 );
                        $(status_bars[status.last_statusbar_id]).css("width", current_progress + "%")
                            .attr("aria-valuenow", current_progress)
                            .text(current_progress + "%");
                        break;

                    case 'finished':
                        $(status_bars[status.last_statusbar_id]).css("width", 100 + "%")
                            .attr("aria-valuenow", 100)
                            .text(100 + "%");
    
                        
                        let store_data = {
                            config_id: Renderer.dpx_state.config_id,
                            name: equal_name_input.val(),
                            v_tha: response.data.THL,
                            confbits: response.data.confMask,
                            pixeldac: response.data.pixelDAC,
                        }
                        
                        axios.post(Renderer.url + 'config/new_equal', store_data).then(function (res) {
                            console.log(res);
                            Renderer.dpx_state.equal_id = res.data.equal_id;
                        });

                    default:
                        break;
                }
            });
            cnt++;
        }

        // Sucessfully equalized
        console.log(response.data);
        equal_start_button.prop("disabled", false);
        interrupt_measure = true;
    }

    equal_start_button.on("click", async () => {
        // Check if name is entered and already in db
        let name = equal_name_input.val();
        if (!name | name.length === 0) {
            equal_name_input.popover('dispose');
            equal_name_input.popover(Renderer.popover_options.empty);
            equal_name_input.popover('show');
            return;
        }

        // Check if THL calib with selected name is already in db
        try {
            let res = await axios.get(Renderer.url + `config/get_equal_ids_names?config_id=${Renderer.dpx_state.config_id}`);
            let names = res.data.map(n => n.name)
            if (!names | (names.includes(name))) {
                equal_name_input.popover('dispose');
                equal_name_input.popover(Renderer.popover_options.in_use);
                equal_name_input.popover('show');
                console.log("Name already taken");
                return;
            } else {
                equal_name_input.popover('hide');
            }
        } catch (err) {
        }

        interrupt_measure = false;
        console.log("Set THL calibration");
        console.log(Renderer.dpx_state);

        // If thl_calib is selected, set it
        if (Renderer.dpx_state.thl_calib_id != undefined) {
            await axios.get(Renderer.url + `config/set_thl_calib?id=${Renderer.dpx_state.thl_calib_id}`);
        }
        measure();
    });

    function stop_measurement() {
        equal_start_button.prop("disabled", false);

        // Stop measurement and clear and close modal
        axios.delete(Renderer.url + 'measure/thl_calib').then((res) => {
            equal_modal.modal('hide');

            // Clear modal
            var div = document.getElementById('equal-modal-body');
            while(div.firstChild){
                div.removeChild(div.firstChild);
            }            

            Connect.update();
        });
    }

    // Discard buttons
    equal_discard_button.on('click', () => {
        if (!interrupt_measure) {
            if (confirm("Do you really want to interrupt the measurement?")) {
                interrupt_measure = true;
                stop_measurement();
            }
        } else {
            equal_modal.modal('hide');
        }
    });

    equal_cross_button.on('click', () => {
        if (!interrupt_measure) {
            if (confirm("Do you really want to interrupt the measurement?")) {
                interrupt_measure = true;
                stop_measurement();
            }
        } else {
            equal_modal.modal('hide');
        }
    });

    // === Popovers ===
    equal_name_input.popover(Renderer.popover_options.in_use);
    equal_name_input.popover('hide');

    // Hide on input
    equal_name_input.on('input', () => {
        equal_name_input.popover('hide');
    });

    // = Init function =
    function on_init() {
        equal_start_button.prop("disabled", false);

        // Generate initial name in the input field
        if (Renderer.dpx_state.dpx_id != undefined) {
            // If initial name already in db, 
            // increment its index until the name is unique
            axios.get(Renderer.url + `config/get_equal_ids_names?config_id=${Renderer.dpx_state.config_id}`).then((res) => {
                let names = res.data.map(n => n.name)
                let start_name = `equal_dpx${Renderer.dpx_state.dpx_id}`;
                let name = start_name;
                let idx = 0;
                while(names.includes(name)) {
                    // Increment name index by 1
                    name = start_name + "_" + String(idx);
                    idx++;
                }
                equal_name_input.val( name );
            }).catch((err) => {
                // No configs found
                equal_name_input.val(`equal_dpx${Renderer.dpx_state.dpx_id}`);
            });
        }
    }

    return {
        show_modal: show_modal,
        on_init: on_init,
        measure: measure,
    };
})();
