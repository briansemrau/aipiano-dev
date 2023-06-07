/*! coi-serviceworker v0.1.6 - Guido Zuidhof, licensed under MIT */

let coepCredentialless = false

self.addEventListener("install", () => {
    console.log("Service worker installing...")
    self.skipWaiting()
    console.log("Service worker installed.")
});
self.addEventListener("activate", (event) => {
    console.log("Service worker activating...")
    event.waitUntil(self.clients.claim())
    console.log("Service worker activated.")
});

self.addEventListener("message", (ev) => {
    console.log(ev)
    if (!ev.data) {
        return;
    } else if (ev.data.type === "deregister") {
        self.registration
            .unregister()
            .then(() => {
                return self.clients.matchAll();
            })
            .then(clients => {
                clients.forEach((client) => client.navigate(client.url));
            });
    } else if (ev.data.type === "coepCredentialless") {
        coepCredentialless = ev.data.value;
    }
});

self.addEventListener("fetch", function (event) {
    console.log(event)
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
        return;
    }

    const request = (coepCredentialless && r.mode === "no-cors")
        ? new Request(r, {
            credentials: "omit",
        })
        : r;
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.status === 0) {
                    return response;
                }

                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy",
                    coepCredentialless ? "credentialless" : "require-corp"
                );
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            })
            .catch((e) => console.error(e))
    );
});
