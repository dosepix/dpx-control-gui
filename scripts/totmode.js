const chartjs = require('chart.js');
const axios = require('axios');

var input_fields = document.querySelector('#input-fields');
var start_button = $('#start-button');

// ToT range
var tot_range_input = document.querySelector('#tot-range-input');
var tot_range_slider = document.querySelector('#tot-range-slider');
const tot_max = 400;
var tot_curr = tot_max;
tot_range_input.max = tot_max;
tot_range_slider.max = tot_max;

tot_range_input.addEventListener('input', () => {
    if (tot_range_input.value > tot_max) {
        tot_range_input.value = tot_max;
        return;
    }
    tot_range_slider.value = tot_range_input.value;
});

tot_range_slider.addEventListener('input', () => {
    tot_range_input.value = tot_range_slider.value;

    myChart.options.scales.x.max = tot_range_slider.value;
    tot_curr = tot_range_slider.value;
});

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}  

function data_generator() {
    let labels = Array.from({length: 100}, (x, i) => i);
    let rand = [];
    for (let i=0; i < 100; i++) {
        rand.push( 0 ); // getRandomInt(0, 100) );
    }
    let data = {
        labels: labels,
        datasets: [{
            barPercentage: 1,
            data: rand,
        }],
    }
    return data;
}

let data = data_generator();

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
    data: data,
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
    return await axios.post(window.url + 'measure/tot');
}

async function stop_measurement() {
    return await axios.delete(window.url + 'measure/tot');
}

async function get_frame() {
    return await axios.get(window.url + 'measure/tot');
}

var measurement_running = false;
var interval = null;
start_button.on('click', async () => {
    if(!measurement_running) {
        console.log('Start measurement');
        // Update plot in a specified interval to reduce CPU load

        // Example
        /* interval = setInterval(() => {
            let idx = getRandomInt(0, 99);
            data.datasets[0].data[idx] += getRandomInt(1, 10);
            config.data = data;
            myChart.update(config);
        }, 1000); */

        // Start measurement
        let res = await start_measurement();
        measurement_running = true;
        input_fields.style.opacity = 0.5;
        start_button[0].innerText = "Stop";

        // Measure until stop button press
        while (true & measurement_running) {
            let frame = await get_frame();
            let l = frame.data.bins.slice(0, tot_curr);
            let d = frame.data.frame.slice(0, tot_curr);

            let data = {
                labels: frame.data.bins,
                datasets: [{
                    barPercentage: 1,
                    data: d,
                }],
            }
            config.data = data;
            myChart.update(config);
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
