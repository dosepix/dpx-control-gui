const axios = require('axios');
const chartjs = require('chart.js');
import { Connect } from './connect.js';

export var Thl_calibration = (function() {
    var thl_calib_button = $('#thl-calib-button');
    var thl_calib_modal = $('#thl-calib-modal');
    thl_calib_modal.appendTo("body");

    var thl_calib_progress = $('#thl-calib-progress');
    var thl_calib_fps_label = $('#thl-calib-fps-label');
    var thl_calib_eta_label = $('#thl-calib-eta-label');
    var thl_calib_start_button = $('#thl-calib-start-button');
    var thl_calib_discard_button = $('#thl-calib-discard-button');
    var thl_calib_cross_button = $('#thl-calib-cross-button');
    var thl_calib_name_input = $('#thl-calib-name-input');

    // Chart
    var thl_calib_chart = undefined;

    function show_modal() {
        thl_calib_modal.modal('show');

        // Destroy chart if already existing
        if (thl_calib_chart != undefined) {
            thl_calib_chart.destroy();
        }

        // Create chart
        const config = {
            type: 'line',
            data: undefined,
            options: {
                showLine: false,
                animation : false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "ADC",
                            font: {
                                size: 20,
                            },    
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Volt",
                            font: {
                                size: 20,
                            },    
                        },
                    },
                },
                layout: {
                    padding: 30,
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
        }; 

        thl_calib_chart = new chartjs.Chart(
            document.getElementById('thl-calib-chart'),
            config
        );
    }

    async function measure(config_id, name) {
        console.log(config_id);
        // Start measurement
        try {
            await axios.get(window.url + 'measure/thl_calib');
        } catch(err) {
            return;
        }
        
        // Disable start button
        thl_calib_start_button.prop("disabled", true);

        // Loop while generator alive
        var run_loop = true;
        var error = false;
        let volt = [];
        let ADC = [];
        let volt_show = [];
        let ADC_show = [];
        let cnt = 0;
        let start_time = Date.now();
        while (run_loop) {
            await axios.post(window.url + 'measure/thl_calib').then(function (res) {
                volt.push(res.data.Volt);
                ADC.push(res.data.ADC);

                // Update only on 10th frame
                if (!(cnt % 10)) {
                    volt_show.push(res.data.Volt);
                    ADC_show.push(res.data.ADC);
        
                    // Update chart
                    let data = {
                        labels: ADC_show,
                        datasets: [{
                            data: volt_show,
                        }],
                    }
                    thl_calib_chart.data = data;
                    thl_calib_chart.update();

                    // Update progress shown in status bar
                    let current_progress = res.data.ADC / 8192. * 100;
                    current_progress = current_progress.toFixed(2);
                    thl_calib_progress.css("width", current_progress + "%")
                        .attr("aria-valuenow", current_progress)
                        .text(current_progress + "%");

                    // Get readouts per second and display current value
                    let fps = cnt / ((Date.now() - start_time) / 1000.);
                    let eta = ((8192. - cnt) / fps).toFixed(2);
                    fps = fps.toFixed(2);
                    thl_calib_fps_label.text(`FPS: ${fps} 1/s`);
                    thl_calib_eta_label.text(`ETA: ${eta} s`);
                }
            }).catch((err) => {
                run_loop = false;

                // When measurement is suddenly stopped, an error is thrown
                if(err.toJSON().status == 500) {
                    error = true;
                }
            });
            cnt++;

            // DEBUG
            /*
            if(cnt > 100) {
                break;
            }
            */
        }

        // Return if error took place during measurement
        if (error) {
            return;
        }

        // Loop finished, set status bar to 100 %
        thl_calib_progress.css("width", 100 + "%")
            .attr("aria-valuenow", 100)
            .text(100 + "%");

        // Write to database
        let thl_calib_params = {
            name: name,
            config_id: config_id,
            volt: volt,
            ADC: ADC,
        }

        await axios.post(window.url + 'config/new_thl_calib', thl_calib_params).then((res) => {
            // Set calibration to newly created one
            window.dpx_state.thl_calib_id = res.data.thl_calib_id;

            console.log(window.dpx_state);
            // Enable start button
            thl_calib_start_button.prop("disabled", false);

            // Update connect screen
            Connect.update();
        });
    }

    thl_calib_start_button.on('click', async () => {
        // Check if name is entered and already in db
        let name = thl_calib_name_input.val();
        if (!name | name.length === 0) {
            thl_calib_name_input.popover('dispose');
            thl_calib_name_input.popover(popover_options_empty);
            thl_calib_name_input.popover('show');
            return;
        } 

        // Check if THL calib with selected name is already in db
        axios.get(window.url + `config/get_thl_calib_ids_names?config_id=${window.dpx_state.config_id}`).then((res) => {
            let names = res.data.map(n => n.name)
            if (!names | (names.includes(name))) {
                thl_calib_name_input.popover('dispose');
                thl_calib_name_input.popover(popover_options_in_use);
                thl_calib_name_input.popover('show');
                console.log("Name already taken");
            } else {
                thl_calib_name_input.popover('hide');
                measure(window.dpx_state.config_id, thl_calib_name_input.val());
            }
        }).catch((err) => {
            // No calibrations exist
            measure(window.dpx_state.config_id, thl_calib_name_input.val());
        });
    });

    function stop_measurement() {
        thl_calib_start_button.prop("disabled", false);

        // Stop measurement and close modal
        axios.delete(window.url + 'measure/thl_calib').then((res) => {
            thl_calib_modal.modal('hide');
            Connect.update();
        });
    }

    // Close modal and destroy measurement if still running
    thl_calib_discard_button.on('click', () => {
        stop_measurement();
    });

    thl_calib_cross_button.on('click', () => {
        stop_measurement();
    });

    // === Popovers ===
    var popover_options_in_use = {
        title: "Error",
        content: "Name already in use! Please choose a different name",
        trigger: "manual",
        placement: "right",
        container: 'body'
    }

    var popover_options_empty = {
        title: "Error",
        content: "Field cannot be empty. Please provide a name",
        trigger: "manual",
        placement: "right",
        container: 'body'
    }

    thl_calib_name_input.popover(popover_options_in_use);
    thl_calib_name_input.popover('hide');

    // Hide on input
    thl_calib_name_input.on('input', () => {
        thl_calib_name_input.popover('hide');
    });

    function on_init() {
        thl_calib_start_button.prop("disabled", false);

        // Reset status bar
        thl_calib_progress.css("width", 0 + "%")
            .attr("aria-valuenow", 0)
            .text(0 + "%");

        // Reset speed labels
        thl_calib_fps_label.text(`FPS: N/A`);
        thl_calib_eta_label.text(`ETA: N/A`);

        // Generate initial name in the input field
        if (window.dpx_state.dpx_id != undefined) {
            // If initial name already in db, 
            // increment its index until the name is unique
            axios.get(window.url + `config/get_thl_calib_ids_names?config_id=${window.dpx_state.config_id}`).then((res) => {
                let names = res.data.map(n => n.name)
                let start_name = `thl_calib_dpx${window.dpx_state.dpx_id}`;
                let name = start_name;
                let idx = 0;
                while(names.includes(name)) {
                    // Increment name index by 1
                    name = start_name + "_" + String(idx);
                    idx++;
                }
                thl_calib_name_input.val( name );
            }).catch((err) => {
                // No configs found
                thl_calib_name_input.val(`thl_calib_dpx${window.dpx_state.dpx_id}`);
            });
        }
    }

    return {
        measure: measure,
        show_modal: show_modal,
        on_init: on_init,
    }
})();
