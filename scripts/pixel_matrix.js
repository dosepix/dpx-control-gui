/*
// Check mouse button state
var mouseDown = 0;
document.body.onmousedown = function() { 
    mouseDown = 1;
}
document.body.onmouseup = function() {
    mouseDown = 0;
} */

export var Pixel_matrix = (function() {
    // = Private =
    var button_matrix = document.querySelector('#button-matrix');
    var pixel_select_all_button = document.querySelector('#pixel-select-all-button');
    var pixel_deselect_all_button = document.querySelector('#pixel-deselect-all-button');    

    // === GENERATE PIXEL MATRIX ===
    var show_pixels = [];
    function create_button_matrix() {
        let buttons = [];
        for (let row = 0; row < 16; row++) {
            for (let i = 0; i < 16; i++) {
                let btn = document.createElement("div");
                // btn.innerHTML = " ";
                if ([0, 1, 14, 15].includes(row)) {
                    btn.className = "box_button_inactive_small"; // "btn btn-primary";
                } else {
                    btn.className = "box_button_inactive"; // "btn btn-primary";
                }

                btn.role = "button";
                btn.idx = row * 16 + i;
                btn.active = false;
                
                btn.onclick = function() {
                    if (this.active) {
                        if ([0, 1, 14, 15].includes(row)) {
                            this.className = "box_button_inactive_small";
                        } else {
                            this.className = "box_button_inactive";
                        }
                        this.active = false;
                        show_pixels.splice(show_pixels.indexOf(this.idx), 1);
                    } else if (!show_pixels.includes(this.idx)) {
                        // this.style.background = "#4CAF50";
                        if ([0, 1, 14, 15].includes(row)) {
                            this.className = "box_button_small";
                        } else {
                            this.className = "box_button";
                        }
                        this.active = true;
                        show_pixels.push( this.idx );
                    }
                }
                buttons.push( btn );
                button_matrix.appendChild(btn);
            }
            let line_break = document.createElement("div");
            line_break.className = "line-break";
            button_matrix.appendChild(line_break);
            // row_div.appendChild(document.createElement("br"));
        }
        console.log(button_matrix);
        return buttons;
    }

    // Deselect all pixels
    pixel_deselect_all_button.onclick = function() {
        for (let btn of buttons) {
            btn.className = "box_button_inactive";
            btn.active = false;
        }
        show_pixels = [];
    }

    // Select all pixels
    pixel_select_all_button.onclick = function() {
        show_pixels = [];
        for (let pixel=0; pixel < 256; pixel++) {
            buttons[pixel].active = true;

            if ([0, 1, 14, 15].includes(pixel % 16)) {
                buttons[pixel].className = "box_button_small";
            } else {
                buttons[pixel].className = "box_button";
            }
            show_pixels.push(pixel);
        }
    }

    var buttons = create_button_matrix();
    function get_shown_pixels() {
        return show_pixels;
    }

    function on_init() {}

    // = Public =
    return {
        on_init: on_init,
        get_shown_pixels: get_shown_pixels,
    }
})();
