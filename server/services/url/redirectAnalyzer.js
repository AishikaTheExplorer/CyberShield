const dns = require("dns").promises;
const net = require("net");

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 6000;

function isPrivateIPv4(ip) {
    const parts = ip.split(".").map(Number);

    if (parts.length !== 4) {
        return false;
    }

    const [a, b] = parts;

    if (a === 10) {
        return true;
    }

    if (a === 127) {
        return true;
    }

    if (a === 169 && b === 254) {
        return true;
    }

    if (a === 172 && b >= 16 && b <= 31) {
        return true;
    }

    if (a === 192 && b === 168) {
        return true;
    }

    return false;
}

function isPrivateIPv6(ip) {
    const normalized = ip.toLowerCase();

    return (
        normalized === "::1" ||
        normalized.startsWith("fc") ||
        normalized.startsWith("fd") ||
        normalized.startsWith("fe8") ||
        normalized.startsWith("fe9") ||
        normalized.startsWith("fea") ||
        normalized.startsWith("feb")
    );
}

function isPrivateIP(ip) {
    if (net.isIPv4(ip)) {
        return isPrivateIPv4(ip);
    }

    if (net.isIPv6(ip)) {
        return isPrivateIPv6(ip);
    }

    return false;
}

async function hostnameResolvesToPrivateIP(hostname) {
    try {
        const results = await dns.lookup(
            hostname,
            {
                all: true
            }
        );

        return results.some((result) =>
            isPrivateIP(result.address)
        );
    } catch {
        return false;
    }
}

async function isSafeDestination(urlString) {
    let url;

    try {
        url = new URL(urlString);
    } catch {
        return false;
    }

    if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
    ) {
        return false;
    }

    const hostname =
        url.hostname.toLowerCase();

    if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local")
    ) {
        return false;
    }

    if (net.isIP(hostname)) {
        return !isPrivateIP(hostname);
    }

    const privateAddress =
        await hostnameResolvesToPrivateIP(hostname);

    return !privateAddress;
}

async function analyzeRedirects(input) {
    const redirects = [];
    const visited = new Set();

    let currentURL = input;

    for (
        let i = 0;
        i < MAX_REDIRECTS;
        i++
    ) {
        if (visited.has(currentURL)) {
            return {
                success: false,
                loopDetected: true,
                redirects,
                finalURL: currentURL,
                findings: [
                    {
                        type: "redirect-loop",
                        title: "Redirect loop detected",
                        description:
                            "The URL appears to redirect back to a previously visited address.",
                        points: 20
                    }
                ]
            };
        }

        visited.add(currentURL);

        const safe =
            await isSafeDestination(currentURL);

        if (!safe) {
            return {
                success: false,
                blocked: true,
                redirects,
                finalURL: currentURL,
                findings: [
                    {
                        type: "unsafe-redirect-target",
                        title: "Redirect target blocked",
                        description:
                            "The destination could not be safely analyzed because it points to a restricted or private network address.",
                        points: 20
                    }
                ]
            };
        }

        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            TIMEOUT_MS
        );

        let response;

        try {
            response = await fetch(currentURL, {
                method: "HEAD",
                redirect: "manual",
                signal: controller.signal,
                headers: {
                    "User-Agent": "CyberShield-Security-Scanner/1.0"
                }
            });

            /*
             * Some websites don't support HEAD.
             * Try GET if necessary.
             */
            if (
                response.status === 405 ||
                response.status === 501
            ) {
                response = await fetch(
                    currentURL,
                    {
                        method: "GET",
                        redirect: "manual",
                        signal: controller.signal,
                        headers: {
                            "User-Agent":
                                "CyberShield-Security-Scanner/1.0"
                        }
                    }
                );
            }
        } catch (error) {
            return {
                success: false,
                redirects,
                finalURL: currentURL,
                findings: [
                    {
                        type: "redirect-analysis-failed",
                        title: "Redirect analysis failed",
                        description:
                            error.name === "AbortError"
                                ? "The destination took too long to respond."
                                : "The destination could not be reached.",
                        points: 5
                    }
                ]
            };
        } finally {
            clearTimeout(timeout);
        }

        const status = response.status;

        const location =
            response.headers.get("location");

        /*
         * Not a redirect
         */
        if (
            status < 300 ||
            status >= 400 ||
            !location
        ) {
            const findings = [];

            if (redirects.length >= 4) {
                findings.push({
                    type: "many-redirects",
                    title: "Multiple redirects detected",
                    description:
                        `The URL passed through ${redirects.length} redirects.`,
                    points: 15
                });
            } else if (redirects.length >= 2) {
                findings.push({
                    type: "multiple-redirects",
                    title: "Multiple redirects detected",
                    description:
                        `The URL passed through ${redirects.length} redirects.`,
                    points: 8
                });
            }

            return {
                success: true,
                redirects,
                finalURL: currentURL,
                status,
                findings
            };
        }

        let nextURL;

        try {
            nextURL =
                new URL(
                    location,
                    currentURL
                ).toString();
        } catch {
            return {
                success: false,
                redirects,
                finalURL: currentURL,
                findings: [
                    {
                        type: "invalid-redirect",
                        title: "Invalid redirect destination",
                        description:
                            "The server returned an invalid redirect location.",
                        points: 15
                    }
                ]
            };
        }

        redirects.push({
            from: currentURL,
            to: nextURL,
            status
        });

        currentURL = nextURL;
    }

    return {
        success: false,
        tooManyRedirects: true,
        redirects,
        finalURL: currentURL,
        findings: [
            {
                type: "too-many-redirects",
                title: "Too many redirects",
                description:
                    `The URL exceeded the maximum of ${MAX_REDIRECTS} redirects.`,
                points: 20
            }
        ]
    };
}

module.exports = analyzeRedirects;