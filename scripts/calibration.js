const chartjs = require('chart.js');
const axios = require('axios');
const tf = require('@tensorflow/tfjs');
import { Totmode } from './totmode.js';
import { Renderer } from './renderer.js';

export var Calibration = (function() {
    const start_calib_button = document.querySelector('.calibration * > #start-calib-button');
    const tot_hist_select = document.querySelector('.calibration * > #tot-hist-select');
    const pixel_select_range = document.querySelector('.calibration * > #pixel-select-range');
    const pixel_select_input = document.querySelector('.calibration * > #pixel-select-input');

    let config_tot = {
        type: 'line',
        options: {
            responsive: true,
            aspectRatio: 1,
            animation : false,
            scales: {
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: "Registered events",
                        font: {
                            size: 20,
                        },
                    },
                },
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: "ToT (10 ns)",
                        font: {
                            size: 20,
                        },
                    },
                },
            },
            layout: {
                padding: "1rem",
            },
            plugins: {
                legend: {
                    display: false,
                },
            },
        },
    };

    let config_energy = JSON.parse(JSON.stringify(config_tot));
    config_energy.options.scales.x.title.text = "Deposited energy (keV)";
    config_energy.options.scales.y.title.text = "";

    const chart_tot = new chartjs.Chart(
        document.getElementById('tot-hist'),
        config_tot,
    );

    const chart_energy = new chartjs.Chart(
        document.getElementById('energy-hist'),
        config_energy,
    );

    async function load_model(file) {
        // Load neural net
        try {
            return tf.loadLayersModel(file);
        } catch(err) {
            return undefined;
        }
    }

    function ToT_to_energy(x, a, b, c, t) {
        return 1./(2*a) * ( t*a + x - b + Math.sqrt((b + t*a - x)**2 - 4*a*c) );
    }

    function update_plots(bins_energy, bins_tot, hist_tot) {
        const data_energy = {
            labels: bins_energy,
            datasets: [{
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: hist_tot,
            }]
        };
        chart_energy.data = data_energy;
        chart_energy.update();

        const data_tot = {
            labels: bins_tot,
            datasets: [{    
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: hist_tot,
            }]
        };
        chart_tot.data = data_tot;
        chart_tot.update();
        console.log('done');
    }

    // Equal pixel input and slider value
    pixel_select_range.onchange = () => {
        pixel_select_input.value = pixel_select_range.value;
    }

    function equal_inputs() {
        // Ensure pixel input is in range
        if (pixel_select_input.value > 255) {
            pixel_select_input.value = 255;
        } else if (pixel_select_input.value < 0) {
            pixel_select_input.value = 0;
        }
        pixel_select_range.value = pixel_select_input.value;
    }
    pixel_select_input.onchange = equal_inputs;

    start_calib_button.addEventListener('click', async () => {
        // Disable button during calibration
        start_calib_button.classList.add('disabled');
        start_calib_button.innerHTML = "Calibrating...";

        // Get selected measurement from database
        let meas_id = tot_hist_select.value;
        let tot_hists = await Totmode.read_tot_hist(meas_id);
        // TODO throw error when not working

        // Normalize histogram
        let tot_hists_norm = [];
        for (let idx=0; idx < 256; idx++) {
            let temp = [];
            let max = Math.max(...tot_hists[idx]);
            for(let i = 0, length = tot_hists[idx].length; i < length; i++){
                temp.push( tot_hists[idx][i] / max );
            }
            tot_hists_norm.push( temp );
        }

        // Predict calibration parameters
        const inputTensor = tf.tensor(tot_hists_norm, [256, 400, 1]);
        let pred = model.predict(inputTensor);
        pred = Array.from(pred.dataSync());

        // Split to get parameters for every pixel
        const calib_params = [];
        while(pred.length) {
            calib_params.push(pred.splice(0, 4));
        }

        // Transform bins to deposited energy
        let bins = [];
        for (let pixel = 0; pixel < 256; pixel++) {
            let a = calib_params[pixel][0];
            let b = calib_params[pixel][1];
            let c = calib_params[pixel][2];
            let t = calib_params[pixel][3];

            a *= 1.85;
            b *= 125;
            c *= -275;
            t *= 7.5;

            let bins_pixel = [];
            for (let x = 0; x < 400; x++) {
                let energy = ToT_to_energy(x, a, b, c, t);
                if (energy > 70) continue;
                bins_pixel.push( energy );
                tot_hists[pixel][bins_pixel] /= (bins_pixel[-1] - bins_pixel[-2]);
            }
            bins.push(bins_pixel);
        }

        let bins_tot = [];
        for (let b = 0; b < 400; b++) bins_tot.push(b);

        update_plots(bins[pixel_select_range.value], bins_tot, tot_hists[pixel_select_range.value]);
        pixel_select_range.onchange = () => {
            pixel_select_input.value = pixel_select_range.value;
            let pixel = pixel_select_range.value;
            update_plots(bins[pixel], bins_tot, tot_hists[pixel]);
        }

        pixel_select_input.onchange = () => {
            equal_inputs();
            let pixel = pixel_select_input.value;
            update_plots(bins[pixel], bins_tot, tot_hists[pixel]);
        }

        start_calib_button.innerHTML = "Calibrate";
        start_calib_button.classList.remove('disabled');
    });

    var model = undefined;
    async function on_init() {
        await axios.get(Renderer.url + `measure/get_meas_ids_names?user_id=${Renderer.current_user.id}&mode=tot_hist`).then((res) => {
            let names = res.data.map(n => n.name);
            let meas_ids = res.data.map(n => n.id);

            for(let idx=0; idx < tot_hist_select.options.length; idx++) {
                tot_hist_select.remove(idx); 
            }

            if (names.length > 0) {
                // Add current options
                for (let idx=0; idx < names.length; idx++) {
                    tot_hist_select.add(new Option(names[idx], meas_ids[idx]));
                }
                tot_hist_select.disabled = false;
            } else {
                tot_hist_select.add(new Option('No measurements available', undefined));
                tot_hist_select.disabled = true;
            }
        }).catch((err) => {
            console.log(err);
            // No measurements found
        });

        let file = "./assets/DNNCalib_large/model.json";
        model = await load_model(file);
        console.log(model);
    }

    return {
        on_init: on_init,
    }
})();
