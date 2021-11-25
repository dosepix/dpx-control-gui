const axios = require('axios');
const chartjs = require('chart.js');

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

function check_empty() {
    if (!input_name.val()) {
        console.log('Name is missing');
        return true;
    }

    if (!input_dpx.val()) {
        console.log('DPX number is missing');
        return true;
    }

    if (!input_ikrum.val()) {
        console.log('Ikrum is missing');
        return true;
    }
}

// === THL CALIBRATION ===
thl_calib_button.on('click', async () => {
    if (check_empty()) return;

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
    let res = {status: 0};
    let volt = [];
    let ADC = [];
    let cnt = 0;
    let start_time = Date.now();
    while (res.status != 410) {
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
        });
        cnt++;
    }
});

// === EQUALIZATION ===
equal_button.on('click', async () => {
    console.log('Click');
    axios.get(window.url + 'measure/equal').then(function (res) {
        console.log(res);

        // Show progress in modal
        equal_modal.modal('show');
    }).catch((err) => {
        return;
    });


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
});

$( document ).ready(() => {

});
