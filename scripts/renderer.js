window.url = 'http://127.0.0.1:5000/';

// App state
window.app_state = {
    stack: [],
    get state() {
        return this.stack[this.stack.length - 1];
    },
    get_state: function get_state() {
        return this.stack[this.stack.length - 1];
    },
    clear_state: function clear_state() {
        self.stack = [];
    },
    push_state: function push_state(state) {
        this.stack.push(state);
    },
    pop_state: function pop_state() {
        return this.stack.pop();
    }
}

// DPX state
window.dpx_state = {
    id: undefined,
    config_id: undefined,
    thl_calib_id: undefined,
    equal_id: undefined,
    get state() {
        return {
            id: this.id, 
            config_id: this.config_id,
            thl_calib_id: this.thl_calib_id,
            equal_id: this.equal_id,
        }
    },
    set state(value) {
        this.id = value.id;
        this.config_id = value.config_id;
        this.thl_calib_id = value.thl_calib_id;
        this.equal_id = value.equal_id;
    }
}

// User state
window.current_user = {
    name: "default",
    id: -1,
    get data() {
        return {name: this.name, id: this.id};
    },
    set data(value) {
        this.id = value.id;
        this.name = value.name;
    }
}

// Dosepix state
window.dpx_connected = {
    value: false,
    get state() {
        return this.value;
    },
    set state(value) {
        this.value = value;
        // Can call functions after state was set
    }
}

// Init
window.dpx_state = {
    id: undefined, 
    config_id: undefined,
    thl_calib_id: undefined,
    equal_id: undefined,
}
window.dpx_connected = false;
window.current_user = {name: "default", id: -1};
