const chartjs = require('chart.js');
const axios = require('axios');
import { Pixel_matrix } from './pixel_matrix.js';
import { Renderer } from './renderer.js';

export var Dosimode = (function() {
    // = Private =
    const input_fields = document.querySelector('.dosimode * > #input-fields');
    const start_button = $('.dosimode * > #start-button');
    const input_name = $('.dosimode * > #input-name');
    const pixel_select = $('.dosimode * > #pixel-select');
    const pixel_select_button = $('.dosimode * > #pixel-select-button');
    const pixel_select_modal = $('.dosimode #pixel-select-modal');

    // Status variables
    var measurement_running = false;

    // = CHART =
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
        document.querySelector('.dosimode * > #chart'),
        config
    );

    // Start measurement and return id
    async function start_measurement() {
        await axios.get(Renderer.url + `config/set_equal?equal_id=${Renderer.dpx_state.equal_id}`);
        return await axios.get(Renderer.url + 'measure/dosi');
    }

    // Stop and store histogram of measurement
    async function stop_measurement(meas_id) {
        let save_str = save ? 'true' : 'false';
        return await axios.delete(Renderer.url + `measure/dosi?meas_id=${meas_id}`);
    }

    start_button.on('click', async () => {
        if(!measurement_running) {
            // Check input fields and throw errors if necessary
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
                let res = await axios.get(Renderer.url + `measure/get_meas_ids_names?user_id=${Renderer.current_user.id}&mode=${dosi}`);
                let names = res.data.map(n => n.name);

                if(names.includes(input_name.val())) {
                    input_name.popover('dispose');
                    input_name.popover(Renderer.popover_options.in_use);
                    input_name.popover('show');
                    return;
                }
            } catch(err) {
                if (err.toJSON().status == 404) {
                    console.log('No Dosi-mode measurements in db');
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

        } else {
            stop_measurement();
        }
    });

    // Show pixels
    pixel_select.on("change", () => {
        if (pixel_select.val() != "single") {
            pixel_select_button.hide();
        } else {
            pixel_select_button.show();
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

    function initial_name() {
        // Generate initial name in the input field
        axios.get(Renderer.url + `measure/get_meas_ids_names?user_id=${Renderer.current_user.id}&mode=dosi`).then((res) => {
            let names = res.data.map(n => n.name);
            let start_name = `dosi_meas`;
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
            input_name.val('dosi_meas');
        });
    }

    function on_init() {
        pixel_select.val('all').trigger('change');
        initial_name();
    }

    return {
        on_init: on_init,
    };
})();
