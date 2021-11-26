window.url = 'http://127.0.0.1:5000/';

// App state
window.app_state = {
    state: "main",
    get state() {
        return this.state;
    },
    set state(value) {
        this.state = value;
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
