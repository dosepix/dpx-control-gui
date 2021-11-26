const axios = require('axios');
const chartjs = require('chart.js');

export var Config = (function() {
    // = Public =
    // Config
    var input_name = $('#input-name');
    var input_dpx = $('#input-dpx');
    var input_ikrum = $('#input-ikrum');
    var creat_config_button = $('#create-config-button');

    // THL Calibration
    var thl_calib_button = $('#thl-calib-button');
    var thl_calib_modal = $('#thl-calib-modal');
    var thl_calib_progress = $('#thl-calib-progress');
    var thl_calib_speed_label = $('#thl-calib-speed-label');

    // Equalization
    var equal_modal = $('#equal-modal');
    var equal_modal_body = document.querySelector('#equal-modal-body');
    var equal_button = $('#equal-button');
    var equal_discard_button = $('#equal-discard-button');

    // Global config state
    var config_state;

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

    // === THL CALIBRATION ===
    thl_calib_button.on('click', async () => {
        // Create config if not already done
        var config_id;
        if(!config_state.common) {
            config_id = await write_config();
            if (config_id == undefined) return;

            config_state.config_id = config_id;
            config_state.common = true;
        } else {
            config_id = config_state.config_id;
        }

        // TODO
        // Check if calibration for config already exists
        // if so, ask to overwrite

        // Start calibration
        await axios.get(window.url + 'measure/thl_calib').then((res) => {
            thl_calib_modal.modal('show');
        }).catch((err) => {
            return;
        });

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

        const thl_calib_chart = new chartjs.Chart(
            document.getElementById('thl-calib-chart'),
            config
        );
        
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
            config_id: config_id,
            volt: volt,
            ADC: ADC,
        }

        axios.post(window.url + 'config/new_thl_calib', thl_calib_params).then((res) => {
            console.log('res');
        });

        config_state.thl_calib = true;
    });

    // === EQUALIZATION ===
    equal_button.on('click', async () => {
        console.log('Click');
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

    function on_init() {
        console.log("Config is ready");
        if (window.dpx_state.dpx_id != undefined) {
            input_dpx.val(window.dpx_state.dpx_id);
        }
    
        set_config_state({
            config_id: -1,
            common: false,
            thl_calib: false,
            equal: false,
        });
    }

    // = Private =
    return {
        on_init: on_init,
        set_config_state: set_config_state,
    }
})();
