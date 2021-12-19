const chartjs = require('chart.js');
const axios = require('axios');
const { ipcRenderer } = require('electron');
import { Totmode } from './totmode.js';
import { Renderer } from './renderer.js';

export var Database = (function() {
    var meas_mode_select = document.querySelector('.database #meas-mode-select');
    var meas_select = document.querySelector('.database #meas-select');
    var save_button = document.querySelector('.database #save-button');

    // Chart
    let config = {
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

    const chart = new chartjs.Chart(
        document.getElementById('database-chart'),
        config,
    );

    var selected_mode = undefined;
    function find_meas() {
        switch (meas_mode_select.value) {
            case "ToT":
                selected_mode = "tot";
                break;
            case "ToT (hist)":
                selected_mode = "tot_hist";
                break;
            case "Dosi":
                selected_mode = "dosi";
                break;
            case "Integration":
                selected_mode = "integration";
                break;
            case "Integration (hist)":
                selected_mode = "integration_hist";
                break;
        }

        // Clear chart
        chart.clear();

        // Clear select
        for(let idx=0; idx < meas_select.options.length; idx) {
            meas_select.remove(idx); 
        }

        axios.get(Renderer.url + `measure/get_meas_ids_names?user_id=${Renderer.current_user.id}&mode=${selected_mode}`)
        .then((res) => {
            // Added found measurement names to select
            let names = res.data.map(n => n.name);
            let ids = res.data.map(n => n.id);
            for (let idx=0; idx < names.length; idx++) {
                meas_select.add(new Option(names[idx], ids[idx]));
            }
            meas_select.disabled = false;
            select_meas();
        }).catch((error) => {
            // No measurements found or read error
            meas_select.add(new Option("No data found", -1));
            meas_select.disabled = true;
        });
    }

    var download_data = undefined;
    async function select_meas() {
        let data = undefined;
        let bins = undefined;
        switch (selected_mode) {
            case 'tot_hist':
                bins = [];
                for (let b = 0; b < 400; b++) bins.push(b);
                let hist = await Totmode.read_tot_hist(meas_select.value);

                // Sum columns
                if (hist.length) {
                    data = hist.reduce( (r, a) => r.map((b, i) => a[i] + b) );
                }

                // Download data
                download_data = {
                    bins: bins,
                    hist: hist,
                }
                break;
        }

        // Return if no data is found
        if(data == undefined) {
            chart.clear();
            return;
        }

        // Update chart
        const data_plot = {
            labels: bins,
            datasets: [{
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: data,
            }]
        };
        chart.data = data_plot;
        chart.update();
    }

    save_button.addEventListener('click', (event) => {
        let name = meas_select.options[meas_select.selectedIndex].text
        ipcRenderer.send('save-file', [name, download_data]);
    });

    // Scan database when mode is changed
    meas_mode_select.addEventListener('change', find_meas);

    // Select measurement
    meas_select.addEventListener('change', select_meas);

    function on_init() {
        find_meas();
    }
    
    return {
        on_init: on_init,
    }
})();
