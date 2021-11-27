const axios = require('axios');
const chartjs = require('chart.js');
import { Connect } from './connect.js';

export var Thl_calibration = (function() {
    var thl_calib_button = $('#thl-calib-button');
    var thl_calib_modal = $('#thl-calib-modal');
    thl_calib_modal.appendTo("body");
    var thl_calib_progress = $('#thl-calib-progress');
    var thl_calib_speed_label = $('#thl-calib-speed-label');
    var thl_calib_start_button = $('#thl-calib-start-button');
    var thl_calib_discard_button = $('#thl-calib-discard-button');
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
        let volt = [];
        let ADC = [];
        let cnt = 0;
        let start_time = Date.now();
        while (run_loop) {
            await axios.post(window.url + 'measure/thl_calib').then(function (res) {
                // Update only on 10th frame
                if (!(cnt % 10)) {
                    volt.push(res.data.Volt);
                    ADC.push(res.data.ADC);
        
                    let data = {
                        labels: ADC,
                        datasets: [{
                            data: volt,
                        }],
                    }
                    thl_calib_chart.data = data;
                    thl_calib_chart.update();

                    let current_progress = res.data.ADC / 8192. * 100;
                    current_progress = current_progress.toFixed(2);
                    thl_calib_progress.css("width", current_progress + "%")
                    .attr("aria-valuenow", current_progress)
                    .text(current_progress + "%");

                    let fps = cnt / ((Date.now() - start_time) / 1000.);
                    let eta = ((8192. - cnt) / fps).toFixed(2);
                    fps = fps.toFixed(2);
                    thl_calib_speed_label.text(`FPS: ${fps} 1/s, ETA: ${eta} s`);
                }
            }).catch((err) => {
                run_loop = false;
            });
            cnt++;

            // DEBUG
            /*
            if(cnt > 100) {
                break;
            }
            */
        }

        // Write to database
        let thl_calib_params = {
            name: name,
            config_id: config_id,
            volt: volt,
            ADC: ADC,
        }

        await axios.post(window.url + 'config/new_thl_calib', thl_calib_params).then((res) => {
            window.dpx_state.thl_calib_id = res.data.thl_calib_id;
            console.log(window.dpx_state);
            // Enable start button
            thl_calib_start_button.prop("disabled", false);
        });
    }

    thl_calib_start_button.on('click', async () => {
        // Check if name is entered and already in db
        let name = thl_calib_name_input.val();
        axios.get(window.url + `config/get_thl_calib_ids_names?config_id=${window.dpx_state.config_id}`).then((res) => {
            let names = res.data.map(n => n.name)
            if (!names | (names.includes(name))) {
                console.log("Name already taken");
            } else {
                measure(window.dpx_state.config_id, thl_calib_name_input.val());
            }
        }).catch((err) => {
            // No calibrations exist
            measure(window.dpx_state.config_id, thl_calib_name_input.val());
        });
    });

    // Close modal and destroy measurement if still running
    thl_calib_discard_button.on('click', () => {
        axios.delete(window.url + 'measure/thl_calib').then((res) => {
            thl_calib_modal.modal('hide');
            Connect.update(window.dpx_state.thl_calib_id);
        });
    });

    return {
        measure: measure,
        show_modal: show_modal,
    }
})();
