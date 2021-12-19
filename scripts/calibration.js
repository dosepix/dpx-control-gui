const chartjs = require('chart.js');
const axios = require('axios');
const tf = require('@tensorflow/tfjs');
import { Totmode } from './totmode.js';
import { Renderer } from './renderer.js';

export var Calibration = (function() {
    var start_calib_button = $('.calibration #start-calib-button');
    var tot_hist_select = document.querySelector('.calibration #tot-hist-select');

    let config_tot = {
        type: 'bar',
        options: {
            responsive: true,
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
                padding: 30,
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

    start_calib_button.on('click', async () => {
        // Get selected measurement from database
        let meas_id = tot_hist_select.value;
        let tot_hists = await Totmode.read_tot_hist(meas_id);

        // Predict calibration parameters
        const inputTensor = tf.tensor(tot_hists, [256, 400, 1]);
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

            let bins_pixel = [];
            for (let x = 0; x < 400; x++) {
                bins_pixel.push( a + b * x + c / (x - t) );
            }
            bins.push(bins_pixel);
        }

        const data_energy = {
            labels: bins[0],
            datasets: [{
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: tot_hists[0],
            }]
        };
        chart_energy.data = data_energy;
        chart_energy.update();

        let bins_tot = [];
        for (let b = 0; b < 400; b++) bins_tot.push(b);
        const data_tot = {
            labels: bins_tot,
            datasets: [{    
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: tot_hists[0],
            }]
        };
        chart_tot.data = data_tot;
        chart_tot.update();
        console.log('done');
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
