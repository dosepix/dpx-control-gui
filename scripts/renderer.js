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

// User state
window.current_user = {
    name: "default",
    get name() {
        return this.name;
    },
    set name(value) {
        this.name = value;
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
window.dpx_connected = false;
window.current_user = 'default';
