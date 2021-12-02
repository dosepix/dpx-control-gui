const axios = require('axios');

export var Equalization = (function() {
    var equal_modal = $('#equal-modal');
    var equal_modal_body = document.querySelector('#equal-modal-body');
    var equal_start_button = $('#equal-start-button');
    var equal_discard_button = $('#equal-discard-button');

    function show_modal() {
        equal_modal.modal('show');
    }

    var interrupt_measure = false;
    async function measure() {
        await axios.get(window.url + 'measure/equal').then(function (res) {
            console.log(res);
            // Show progress in modal
        }).catch((err) => {
            return;
        });

        // Perform measurement
        let response = {data: {stage: undefined}};
        let status_bar = undefined;
        let label = undefined;
        while (response.data.stage != 'finished') {
            if (interrupt_measure) {
                await axios.delete(window.url + 'measure/equal').then((res) => {
                    equal_modal.modal('hide');
                    // TODO: Reset modal
                    // Connect.update(window.dpx_state.thl_calib_id);
                });
                return;
            }

            await axios.post(window.url + 'measure/equal').then(function (res) {
                response = res;

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

        // Sucessfully equalized
        console.log(response.data);
        config_state.equal = true;
    }

    equal_start_button.on("click", async () => {
        interrupt_measure = false;
        console.log(window.dpx_state);
        // If thl_calib is selected, set it
        if (window.dpx_state.thl_calib_id != undefined) {
            await axios.get(window.url + `config/set_thl_calib?id=${window.dpx_state.thl_calib_id}`);
        }

        measure();
    });

    // Close modal and destroy measurement if still running
    equal_discard_button.on('click', () => {
        interrupt_measure = true;
    });

    return {
        show_modal, show_modal,
        measure: measure,
    };
})();
