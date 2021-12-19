const chartjs = require('chart.js');
const axios = require('axios');
import { Pixel_matrix } from './pixel_matrix.js';
import { Renderer } from './renderer.js';

export var Totmode = (function() {
    // = Private =
    var input_fields = document.querySelector('.totmode #input-fields');
    var start_button = $('.totmode #start-button');
    var input_name = $('.totmode #input-name');
    var hist_only_check = $('.totmode #hist-only-check');
    console.log(input_fields);

    // ToT range
    var tot_range_input = document.querySelector('.totmode #tot-range-input');
    var tot_range_slider = document.querySelector('.totmode #tot-range-slider');
    const tot_max = 400;
    var tot_curr = tot_max;
    tot_range_input.max = tot_max;
    tot_range_slider.max = tot_max;

    // Pixel select
    var pixel_select = $('.totmode #pixel-select');
    var pixel_select_button = $('.totmode #pixel-select-button');
    var pixel_select_modal = $('.totmode #pixel-select-modal');

    // Duration
    var select_time = $('.totmode #select-time');
    var input_time = $('.totmode #input-time');

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
            responsive: true,
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
        return await axios.get(Renderer.url + 'measure/tot');
    }

    // Stop and store histogram of measurement
    async function stop_measurement(save, meas_id) {
        let save_str = save ? 'true' : 'false';
        return await axios.delete(Renderer.url + `measure/tot?save=${save_str}&meas_id=${meas_id}`);
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

    async function get_frame(meas_id, mode) {
        // Show only selected pixels
        if (pixel_select.val() == 'single') {
            let shown_pixels = Pixel_matrix.get_shown_pixels();
            return await axios.post(Renderer.url + 'measure/tot', 
                {'show': pixel_select.val(),
                'pixels': shown_pixels,
                'meas_id': meas_id,
                'mode': mode,
                }
            );
        } else {
            return await axios.post(Renderer.url + 'measure/tot', {
                'show': pixel_select.val(),
                'meas_id': meas_id,
                'mode': mode,
            });
        }
    }

    // Read ToT histogram from db
    async function read_tot_hist(meas_id) {
        let tot_hists = [];
        // Read ToT histograms from database
        for (let pixel = 0; pixel < 256; pixel++) {
            // TODO: change 0 to pixel
            try {
                let res = await axios.get(Renderer.url + `measure/tot_hist?meas_id=${meas_id}&pixel_id=${0}`);
                let hist = res.data.map(n => n.value);
                if (hist.length < 400) {
                    // Measurement is empty
                    return [];
                }
                tot_hists.push( hist )
            } catch(error) {}
        }
        return tot_hists;
    }

    start_button.on('click', async () => {
        var meas_id = undefined;
        if(!measurement_running) {
            console.log('Start measurement');
            // Maybe update plot in a specified interval to reduce CPU load
            // Check if measurement name already in use
            try {
                let name = input_name.val();
                // Empty input
                if (!name | name.length === 0) {
                    input_name.popover('dispose');
                    input_name.popover(Renderer.popover_options.empty);
                    input_name.popover('show');
                    return;
                }

                // Check for duplicate entries
                let res = await axios.get(Renderer.url + `measure/get_meas_ids_names?user_id=${Renderer.current_user.id}&mode=${mode}`);
                let names = res.data.map(n => n.name);

                if(names.includes(input_name.val())) {
                    input_name.popover('dispose');
                    input_name.popover(Renderer.popover_options.in_use);
                    input_name.popover('show');        
                    return;
                }
            } catch(err) {
                if (err.toJSON().status == 404) {
                    console.log('No ToT measurements in db');
                } else {
                    // Failed to fetch from db
                    return;
                }
            }

            // Start measurement
            try {
                await start_measurement();
                measurement_running = true;
                input_fields.style.opacity = 0.5;
                start_button[0].innerText = "Stop";
            } catch(error) {
                // Todo: couldn't start measurement
                return;
            }

            // Add new measurement to db
            try {
                let info = {
                    config_id: Renderer.dpx_state.config_id,
                    user_id: Renderer.current_user.id,
                    mode: 'tot_hist',
                    name: input_name.val(),
                }

                let res = await axios.post(Renderer.url + 'measure/new_measurement', info);
                meas_id = res.data.meas_id;
            } catch(error) {
                console.log(error);
                return;
            }

            // Measure until stop button press
            let frame = undefined;
            while (measurement_running) {
                frame = await get_frame(meas_id, mode);

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
            if (meas_id != undefined) {
                await stop_measurement(true, meas_id);
                meas_id = undefined;
            } else {
                await stop_measurement(false, -1);
            }

            if(interval != null) {
                clearInterval(interval);
            }
            measurement_running = false;
            input_fields.style.opacity = 1;
            start_button[0].innerText = "Start";
            initial_name();
        }
    });

    pixel_select_button.on('click', () => {
        pixel_select_modal.modal('show');
    });

    // === Popovers ===
    input_name.popover(Renderer.popover_options.in_use);
    input_name.popover('hide');

    // Hide on input
    input_name.on('input', () => {
        input_name.popover('hide');
    });

    // Save histogram or every frame
    var mode = hist_only_check.is(':checked') ? 'tot_hist' : 'tot';
    hist_only_check.on('change', () => {
        mode = hist_only_check.is(':checked') ? 'tot_hist' : 'tot';
    });

    function initial_name() {
        // Generate initial name in the input field
        axios.get(Renderer.url + `measure/get_meas_ids_names?user_id=${Renderer.current_user.id}&mode=${mode}`).then((res) => {
            console.log(res);
            let names = res.data.map(n => n.name);
            let start_name = `tot_meas`;
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

    function on_init() {
        // Pixel select
        if (pixel_select.val() != "single") {
            pixel_select_button.hide();
        } else {
            pixel_select_button.show();
        }

        initial_name();
    }

    // Public
    return {
        on_init: on_init,
        read_tot_hist: read_tot_hist,
    };
})();
