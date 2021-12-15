const chartjs = require('chart.js');
const axios = require('axios');
const tf = require('@tensorflow/tfjs');
import { Renderer } from './renderer.js';

export var Calibration = (function() {
    var start_calib_button = $('.calibration #start-calib-button');
    var tot_hist_select = document.querySelector('.calibration #tot-hist-select');

    /*
    const labels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    ];

    const data = {
        labels: labels,
        datasets: [{
            label: 'My First dataset',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: [0, 10, 5, 2, 20, 30, 45],
        }]
    };

    let config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
        },
    };

    const chart = new chartjs.Chart(
        document.getElementById('chart'),
        config,
    );
    */

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

        axios.get(Renderer.url + `measure/tot_hist?meas_id=${meas_id}`).then((res) => {
            let bins = res.data.map(n => n.bin);
            let hist = res.data.map(n => n.value);

            const inputTensor = tf.tensor(hist, [1, 400, 1]);
            console.log(inputTensor);
            let pred = model.predict(inputTensor);
            console.log(Array.from(pred.dataSync()));
        });
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
