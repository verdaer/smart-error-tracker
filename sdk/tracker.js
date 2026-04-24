class SmartTracker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.endpoint = "http://localhost:3000/report";
        this.init();
    }

    init() {
        // Normal hataları yakalar
        window.onerror = (msg, url, line, col, error) => {
            this.send({ message: msg, stack: error?.stack, type: 'JS_ERROR' });
        };
        // API veya internet hatalarını (Promise) yakalar
        window.onunhandledrejection = (event) => {
            this.send({ message: event.reason.message, type: 'PROMISE_ERROR' });
        };
    }

    send(data) {
        fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
            body: JSON.stringify(data)
        });
    }
}