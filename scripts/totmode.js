const chartjs = require('chart.js');
const axios = require('axios');

import { Pixel_matrix } from './pixel_matrix.js';
export var Totmode = (function() {
    // = Private =
    var input_fields = document.querySelector('#input-fields');
    var start_button = $('#start-button');
    var input_name = $('#input-name');

    // ToT range
    var tot_range_input = document.querySelector('#tot-range-input');
    var tot_range_slider = document.querySelector('#tot-range-slider');
    const tot_max = 400;
    var tot_curr = tot_max;
    tot_range_input.max = tot_max;
    tot_range_slider.max = tot_max;

    // Pixel select
    var pixel_select = $('#pixel-select');
    var pixel_select_button = $('#pixel-select-button');
    var pixel_select_modal = $('#pixel-select-modal');

    // Duration
    var select_time = $('#select-time');
    var input_time = $('#input-time');

    // Status variables
    var measurement_running = false;
    var interval = null;

    tot_range_input.addEventListener('input', () => {
        if (tot_range_input.value > tot_max) {
            tot_range_input.value = tot_max;
        }
        tot_range_slider.value = tot_range_input.value;
        myChart.options.scales.x.max = tot_range_input.value;
        // if (!measurement_running) myChart.update();
        tot_curr = tot_range_input.value;
    });

    tot_range_slider.addEventListener('input', () => {
        tot_range_input.value = tot_range_slider.value;

        myChart.options.scales.x.max = tot_range_slider.value;
        // if (!measurement_running) myChart.update();
        tot_curr = tot_range_slider.value;
    });

    const chartAreaBorder = {
        id: 'chartAreaBorder',
        beforeDraw(chart, args, options) {
        const {ctx, chartArea: {left, top, width, height}} = chart;
        ctx.save();
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = options.borderWidth;
        ctx.setLineDash(options.borderDash || []);
        ctx.lineDashOffset = options.borderDashOffset;
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
        }
    };

    const config = {
        type: 'bar',
        options: {
            animation : false,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Registered events",
                        font: {
                            size: 20,
                        },    
                    },
                },
                x: {
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
                chartAreaBorder: {
                    borderColor: 'black',
                    borderWidth: 1,
                    // borderDash: [5, 5],
                    // borderDashOffset: 2,
                },
            },
        },
        plugins: [chartAreaBorder],
    }; 

    const myChart = new chartjs.Chart(
        document.getElementById('chart'),
        config
    );

    async function start_measurement() {
        return await axios.get(window.url + 'measure/tot');
    }

    async function stop_measurement() {
        return await axios.delete(window.url + 'measure/tot');
    }

    // Show pixels
    pixel_select.on("change", () => {
        if (pixel_select.val() != "single") {
            pixel_select_button.hide();
        } else {
            pixel_select_button.show();
        }
    });

    // Duration
    select_time.on("change", () => {
        if (select_time.val() == "Infinite") {
            input_time.prop('disabled', true);
        } else {
            input_time.prop('disabled', false);
        }
    });

    async function get_frame() {
        // Show only selected pixels
        if (pixel_select.val() == 'single') {
            let shown_pixels = Pixel_matrix.get_shown_pixels();
            return await axios.post(window.url + 'measure/tot', 
                {'show': pixel_select.val(),
                'pixels': shown_pixels}
            );
        } else {
            return await axios.post(window.url + 'measure/tot', {'show': pixel_select.val()});
        }
    }

    start_button.on('click', async () => {
        if(!measurement_running) {
            console.log('Start measurement');
            // Update plot in a specified interval to reduce CPU load

            // Start measurement
            let res = await start_measurement();
            measurement_running = true;
            input_fields.style.opacity = 0.5;
            start_button[0].innerText = "Stop";

            // Measure until stop button press
            while (measurement_running) {
                let frame = await get_frame();

                // Select ToT range
                let l = frame.data.bins.slice(0, tot_curr);
                let d = frame.data.frame.slice(0, tot_curr);

                let data = {
                    labels: l,
                    datasets: [{
                        barPercentage: 1,
                        data: d,
                    }],
                }
                myChart.data = data;
                myChart.update();
            }
        } else {
            await stop_measurement();
            if(interval != null) {
                clearInterval(interval);
            }
            measurement_running = false;
            input_fields.style.opacity = 1;
            start_button[0].innerText = "Start";
        }
    });

    pixel_select_button.on('click', () => {
        pixel_select_modal.modal('show');
    });

    function on_init() {
        // Pixel select
        if (pixel_select.val() != "single") {
            pixel_select_button.hide();
        } else {
            pixel_select_button.show();
        }

        // Generate initial name in the input field
        // If initial name already in db, 
        // increment its index until the name is unique
        axios.get(window.url + `measure/get_meas_ids_names?user_id=${window.current_user.id}&mode=tot`).then((res) => {
            let names = res.data.map(n => n.name)
            let start_name = `tot_meas${window.dpx_state.dpx_id}`;
            let name = start_name;
            let idx = 0;
            while(names.includes(name)) {
                // Increment name index by 1
                name = start_name + "_" + String(idx);
                idx++;
            }
            input_name.val( name );
        }).catch((err) => {
            // No configs found
            input_name.val('tot_meas');
        });
    }

    // Public
    return {
        on_init: on_init,
    };
})();
