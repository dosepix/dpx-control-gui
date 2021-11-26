const bootstrap = require('bootstrap');
const axios = require('axios');
import { Config } from './config.js';
import { Connect } from './connect.js';
import { Main } from './main.js';
import { Totmode } from './totmode.js';

export var Sidebar = (function() {
    // = Private =
    // === SIDEBAR BUTTONS & LINKS ===
    var sidebar_collapse_button = document.querySelector('#sidebar-collapse-button');
    var sidebar_home_link = document.querySelector('#sidebar-home-link');
    var sidebar_connect_link = document.querySelector('#sidebar-connect-link');

    // === USER MENU ===
    var user_name = document.querySelector('#user-name');

    // Create new user
    var new_user_link = document.querySelector('#new-user-link');
    var change_user_link = document.querySelector('#change-user-link');
    var new_user_modal = $('#new-user-modal');
    // new_user_modal.appendTo("body");
    var new_user_create_button = $('#new-user-create-button');
    var new_user_dismiss_button = $('#new-user-dismiss-button');
    var new_user_input = document.querySelector('#new-user-input');

    // Change user
    var change_user_modal = $('#change-user-modal');
    var change_user_select = document.querySelector('#change-user-select');
    var change_user_button = $('#change-user-button');
    var change_user_dismiss_button = $('#change-user-dismiss-button');

    // === CONTAINER MANAGEMENT ===
    // Hide and show container according to the current state of the app
    var main_container = document.querySelector('#main-container');
    var connect_container = document.querySelector('#connect-container');
    var totmode_container = document.querySelector('#totmode-container');
    var config_container = document.querySelector('#config-container');

    const containers = {
        main: main_container,
        connect: connect_container,
        config: config_container,
        totmode: totmode_container,
    }

    const pages = {
        main: Main,
        connect: Connect,
        config: Config,
        totmode: Totmode,
    }

    var contents = document.querySelectorAll('.container');

    function hide(element) {
        element.style.display = "none";
    }

    function hideAll() {
        for (var i = 0; i < contents.length; i++) {
            hide(contents[i]);
        }
    }

    function show(element) {
        element.style.display = "block";
    }

    function show_container(name) {
        hideAll();
        console.log(name);

        // Show container
        show(containers[name]);

        // Execute init if available
        if (Object.keys(pages).includes(name)) {
            console.log(pages[name]);
            pages[name].on_init();
        }
    }

    // Main page
    sidebar_home_link.onclick = function() {
        show_container('main');
    }

    // Connect page
    sidebar_connect_link.onclick = function() {
        show_container('connect');
    }

    // === NEW USER MENU ===
    var new_user_popover;

    function new_popover(popover, element, title, content) {
        if (popover != undefined) {
            if (popover._isEnabled != null) popover.dispose();
        }
        let options = {
            title: title,
            content: content,
            trigger: "manual",
            placement: "right",
            container: 'body'
        }
        popover = new bootstrap.Popover(element, options);
        popover.show();
        return popover;
    }

    function create_new_user () {
        if(!new_user_input.value) {
            new_user_popover= new_popover(new_user_popover, new_user_input, 
                "Please provide a name", "Field cannot be empty");

        } else {
            // Write user to database
            axios.post(window.url + 'user/new_user', {"name": new_user_input.value}).then(function (response) {
                // Clear input and exit
                clear_input_modal();
            }).catch(function (error) {
                if (error.toJSON().message == "Network Error") {
                    new_user_popover = new_popover(new_user_popover, new_user_input, 
                        "Network error", "Couldn't connect to API. Make sure dpx_api is running");
                    return;
                } else {
                    if (error.response.status == 405) {
                        // User already in database
                        new_user_popover = new_popover(new_user_popover, new_user_input, 
                            "User already existing!", "Please choose a different name");
                    }
                }
            });
        }
    }

    new_user_input.addEventListener('input', () => {
        if(new_user_popover._isEnabled != null)
            new_user_popover.hide();
    });

    function clear_input_modal() {
        // Hiding modal removes attached popover
        /* if (new_user_popover != null) {
            new_user_popover.dispose();
        } */

        new_user_modal.modal('hide');
        new_user_input.value = null;
        // Stop listening to key input
        new_user_input.removeEventListener("keyup", create_on_enter);
    }

    function create_on_enter(event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            create_new_user();
        }
    }

    // Show modal
    new_user_link.onclick = function() {
        new_user_popover = new bootstrap.Popover(new_user_input);
        new_user_modal.modal('show');
        // Set cursor to input field
        new_user_input.focus();
        new_user_input.addEventListener("keyup", create_on_enter);
    }

    // Clear when modal is closed
    // new_user_dismiss_button.on('click', clear_input_modal);
    new_user_modal.on('hidden.bs.modal', function () {
        clear_input_modal();
    })

    // Modal buttons
    new_user_create_button.on('click', create_new_user);

    // Change to other user
    change_user_link.onclick = function() {
    }

    // === CHANGE USER MENU ===
    // TODO: What happens if DPX is connected and user is changed?
    // Show modal
    change_user_link.onclick = function() {
        axios.get(window.url + 'user/get_users').then((res) => {
            if (res.status != 200) return;

            // Get user list from db
            var user_list = [];
            for(let user of res.data) {
                user_list.push( user.name );
            }

            // Clear all users from select
            for(let idx=0; idx < change_user_select.options.length; idx) {
                change_user_select.remove(idx); 
            }

            // Update list of available users
            if(user_list.length > 0) {
                // Clear all options
                for(let user of user_list) {
                    change_user_select.add(new Option(user));
                }
                change_user_select.disabled = false;
                change_user_button.prop('disabled', false);
            } else {
                change_user_select.add(new Option('No users available'));
                change_user_select.disabled = true;
                change_user_button.prop('disabled', true);
            }

            change_user_modal.modal('show');
        });
    }

    // Set username in text and to global variable
    function change_user_event() {
        // TODO: change to correct id
        window.current_user = {
            id: -1,
            name: change_user_select.value
        };
        user_name.innerHTML = window.current_user.name;
        change_user_modal.modal('hide');
    }

    change_user_button.on("click", () => {
        change_user_event()
    });

    change_user_modal.on("keyup", (event) => {
        if (event.keyCode === 13 & !change_user_select.disabled) {
            change_user_event()
        }
    });

    // = Public =
    return {
        hide: hide,
        hideAll: hideAll,
        show: show,
        show_container: show_container,
    }
})();

// === INIT ===
$( document ).ready(() => {
    Sidebar.show_container('main');
});
