import { show_container } from './sidebar.js';
import { disconnect, is_connected } from './connect.js'

// Page containers
var connect_container = document.querySelector('#connect-container');
var connect_card = document.querySelector('#connect-card');
var connect_img = document.querySelector('#connect-img');
var connect_text = document.querySelector('#connect-text');
var connect_title = document.querySelector('#connect-title');

// Measurement cards
var cards_measure = document.querySelector('#cards-measure');
var totmode_card = document.querySelector('#totmode-card');

var gray_out = 0.5;
var measure_enabled;

// === CONNECT ===
connect_card.onclick = function() {
    if(window.dpx_connected) {
        // Disconnect DPX
        disconnect();
        connection_state();
    } else {
        show_container('connect');
    }
}

export function connection_state() {
    // Return if DPX is connected
    if (window.dpx_connected) {
        // Show measurement options
        cards_measure.style.opacity = 1.;
        measure_enabled = true;

        // Change image and text
        connect_img.src = 'assets/dpx_disconnect.svg';
        connect_title.innerHTML ="Disconnect DPX";
        connect_text.innerHTML = "Are you done yet?";
        return;
    }

    // DPX not connected
    measure_enabled = false;

    // Change image and text
    connect_img.src = 'assets/dpx_connect.svg';
    connect_title.innerHTML ="Connect DPX";
    connect_text.innerHTML = "Establish connection to one or multiple Dosepix detectors. Required to perform measurements";

    // Gray out measurement options
    cards_measure.style.opacity = gray_out;
    $( connect_card ).popover('show');
}

// === ToT MODE ===
totmode_card.onclick = function() {
   if(window.dpx_connected) {
       show_container('totmode');
   }
};

// Check state of connection once per second:
// DPX might by disconnected manually at any time
var dpx_connected_last = false;
setInterval(() => {
    // Only execute when state changes
    if (dpx_connected_last != window.dpx_connected) {
        connection_state();
    }
    dpx_connected_last = window.dpx_connected;
}, 1000);

$( document ).ready(async () => {
    console.log( await is_connected() );
    connection_state()
});
