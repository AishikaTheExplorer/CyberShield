const net = require("net");

const suspiciousKeywords = [
    "login",
    "signin",
    "sign-in",
    "verify",
    "verification",
    "password",
    "passwd",
    "account",
    "secure",
    "security",
    "update",
    "confirm",
    "confirmation",
    "bank",
    "banking",
    "payment",
    "wallet",
    "invoice",
    "billing",
    "credential",
    "unlock",
    "suspended",
    "recover",
    "recovery"
];

const suspiciousTLDs = [
    "zip",
    "mov",
    "click",
    "top",
    "xyz",
    "tk",
    "ml",
    "ga",
    "cf",
    "gq",
    "work",
    "support",
    "country",
    "download",
    "stream",
    "fit",
    "cam"
];

const suspiciousPorts = [
    21,
    22,
    23,
    25,
    110,
    135,
    139,
    143,
    445,
    3389,
    5900,
    8080,
    8443
];

function analyzePatterns(input) {
    const findings = [];
    const positiveChecks = [];

    let url;

    try {
        url = new URL(input);
    } catch {
        return {
            valid: false,
            findings: [
                {
                    type: "invalid-url",
                    title: "Invalid URL",
                    description: "The supplied value is not a valid URL.",
                    points: 100
                }
            ],
            positiveChecks: []
        };
    }

    /*
     * --------------------------------------------------
     * Protocol
     * --------------------------------------------------
     */

    if (url.protocol === "https:") {
        positiveChecks.push("HTTPS is enabled");
    } else {
        findings.push({
            type: "no-https",
            title: "HTTPS is not enabled",
            description: "The URL uses HTTP instead of HTTPS.",
            points: 15
        });
    }

    /*
     * --------------------------------------------------
     * IP address
     * --------------------------------------------------
     */

    const ipVersion = net.isIP(url.hostname);

    if (ipVersion) {
        findings.push({
            type: "ip-address",
            title: "IP address used instead of domain",
            description: `The URL directly uses an IPv${ipVersion} address.`,
            points: 25
        });
    } else {
        positiveChecks.push("Uses a domain name");
    }

    /*
     * --------------------------------------------------
     * URL length
     * --------------------------------------------------
     */

    if (input.length > 200) {
        findings.push({
            type: "very-long-url",
            title: "Very long URL",
            description: "The URL is unusually long and may contain hidden parameters.",
            points: 15
        });
    } else if (input.length > 150) {
        findings.push({
            type: "long-url",
            title: "Long URL",
            description: "The URL is longer than normally expected.",
            points: 10
        });
    } else {
        positiveChecks.push("URL length is within a normal range");
    }

    /*
     * --------------------------------------------------
     * @ symbol
     * --------------------------------------------------
     */

    if (input.includes("@")) {
        findings.push({
            type: "at-symbol",
            title: "Contains @ symbol",
            description:
                "The URL contains an @ symbol, which can sometimes be used to hide the real destination.",
            points: 20
        });
    }

    /*
     * --------------------------------------------------
     * Username/password in URL
     * --------------------------------------------------
     */

    if (url.username || url.password) {
        findings.push({
            type: "embedded-credentials",
            title: "Credentials embedded in URL",
            description:
                "The URL contains a username or password component.",
            points: 25
        });
    }

    /*
     * --------------------------------------------------
     * Punycode
     * --------------------------------------------------
     */

    if (url.hostname.toLowerCase().includes("xn--")) {
        findings.push({
            type: "punycode",
            title: "Punycode detected",
            description:
                "The domain contains Punycode. This can be legitimate, but it can also be used in homograph attacks.",
            points: 20
        });
    }

    /*
     * --------------------------------------------------
     * Unicode hostname
     * --------------------------------------------------
     */

    if (/[^\x00-\x7F]/.test(url.hostname)) {
        findings.push({
            type: "unicode-domain",
            title: "Unicode characters detected in domain",
            description:
                "The domain contains non-ASCII characters that may visually resemble other characters.",
            points: 15
        });
    }

    /*
     * --------------------------------------------------
     * Subdomains
     * --------------------------------------------------
     */

    const hostnameParts = url.hostname.split(".").filter(Boolean);

    if (hostnameParts.length >= 6) {
        findings.push({
            type: "many-subdomains",
            title: "Large number of subdomains",
            description:
                "The domain contains an unusually large number of subdomain levels.",
            points: 15
        });
    } else if (hostnameParts.length >= 5) {
        findings.push({
            type: "many-subdomains",
            title: "Many subdomains",
            description:
                "The domain contains more subdomain levels than normally expected.",
            points: 10
        });
    } else {
        positiveChecks.push("Subdomain structure appears normal");
    }

    /*
     * --------------------------------------------------
     * Suspicious keywords
     * --------------------------------------------------
     */

    const lowerURL = input.toLowerCase();

    const matchedKeywords = suspiciousKeywords.filter((keyword) =>
        lowerURL.includes(keyword)
    );

    if (matchedKeywords.length >= 4) {
        findings.push({
            type: "suspicious-keywords",
            title: "Multiple suspicious keywords",
            description:
                `Detected keywords: ${matchedKeywords.join(", ")}`,
            points: 20,
            details: {
                keywords: matchedKeywords
            }
        });
    } else if (matchedKeywords.length >= 2) {
        findings.push({
            type: "suspicious-keywords",
            title: "Suspicious keywords detected",
            description:
                `Detected keywords: ${matchedKeywords.join(", ")}`,
            points: 10,
            details: {
                keywords: matchedKeywords
            }
        });
    } else if (matchedKeywords.length === 1) {
        findings.push({
            type: "single-suspicious-keyword",
            title: "Potentially sensitive keyword detected",
            description:
                `Detected keyword: ${matchedKeywords[0]}`,
            points: 5,
            details: {
                keywords: matchedKeywords
            }
        });
    }

    /*
     * --------------------------------------------------
     * Suspicious TLD
     * --------------------------------------------------
     */

    const tld = hostnameParts.length > 1
        ? hostnameParts[hostnameParts.length - 1].toLowerCase()
        : "";

    if (suspiciousTLDs.includes(tld)) {
        findings.push({
            type: "suspicious-tld",
            title: "Potentially risky TLD",
            description:
                `The domain uses the .${tld} top-level domain.`,
            points: 10
        });
    }

    /*
     * --------------------------------------------------
     * Port
     * --------------------------------------------------
     */

    const port = url.port
        ? Number(url.port)
        : url.protocol === "https:"
            ? 443
            : 80;

    if (url.port && suspiciousPorts.includes(port)) {
        findings.push({
            type: "suspicious-port",
            title: "Unusual or sensitive port",
            description:
                `The URL uses port ${port}.`,
            points: 15
        });
    } else if (
        url.port &&
        ![80, 443].includes(port)
    ) {
        findings.push({
            type: "non-standard-port",
            title: "Non-standard port",
            description:
                `The URL uses port ${port} instead of the usual web ports.`,
            points: 5
        });
    }

    /*
     * --------------------------------------------------
     * URL encoding
     * --------------------------------------------------
     */

    const encodedParts = input.match(/%[0-9A-Fa-f]{2}/g) || [];

    if (encodedParts.length >= 8) {
        findings.push({
            type: "heavy-encoding",
            title: "Heavy URL encoding",
            description:
                "The URL contains a large number of encoded characters.",
            points: 15
        });
    } else if (encodedParts.length >= 4) {
        findings.push({
            type: "url-encoding",
            title: "Encoded URL characters detected",
            description:
                "The URL contains several percent-encoded characters.",
            points: 8
        });
    }

    /*
     * --------------------------------------------------
     * Double encoding
     * --------------------------------------------------
     */

    if (
        /%25[0-9A-Fa-f]{2}/i.test(input) ||
        /%252f/i.test(input) ||
        /%255c/i.test(input)
    ) {
        findings.push({
            type: "double-encoding",
            title: "Possible double URL encoding",
            description:
                "The URL appears to contain multiple layers of URL encoding.",
            points: 15
        });
    }

    /*
     * --------------------------------------------------
     * Suspicious path patterns
     * --------------------------------------------------
     */

    const suspiciousPathPatterns = [
        "/../",
        "/..\\",
        "\\..\\",
        "//",
        "/login.php",
        "/verify.php",
        "/signin.php",
        "/account.php"
    ];

    const matchedPathPatterns = suspiciousPathPatterns.filter(
        (pattern) =>
            url.pathname.toLowerCase().includes(pattern.toLowerCase())
    );

    if (matchedPathPatterns.length > 0) {
        findings.push({
            type: "suspicious-path",
            title: "Suspicious URL path pattern",
            description:
                "The URL path contains patterns commonly associated with redirects, login pages, or unusual path traversal.",
            points: 10
        });
    }

    /*
     * --------------------------------------------------
     * Query parameters
     * --------------------------------------------------
     */

    const queryParameters = [...url.searchParams.keys()];

    if (queryParameters.length >= 10) {
        findings.push({
            type: "many-parameters",
            title: "Large number of query parameters",
            description:
                "The URL contains many query parameters.",
            points: 10
        });
    }

    /*
     * --------------------------------------------------
     * Fragment
     * --------------------------------------------------
     */

    if (url.hash && url.hash.length > 80) {
        findings.push({
            type: "large-fragment",
            title: "Large URL fragment",
            description:
                "The URL contains an unusually large fragment.",
            points: 5
        });
    }

    /*
     * --------------------------------------------------
     * Hostname hyphens
     * --------------------------------------------------
     */

    const hyphenCount =
        (url.hostname.match(/-/g) || []).length;

    if (hyphenCount >= 4) {
        findings.push({
            type: "many-hyphens",
            title: "Many hyphens in domain",
            description:
                "The domain contains an unusually high number of hyphens.",
            points: 8
        });
    }

    /*
     * --------------------------------------------------
     * Numeric-heavy hostname
     * --------------------------------------------------
     */

    const numericCount =
        (url.hostname.match(/[0-9]/g) || []).length;

    if (
        numericCount >= 5 &&
        !net.isIP(url.hostname)
    ) {
        findings.push({
            type: "numeric-heavy-domain",
            title: "Numeric-heavy domain",
            description:
                "The domain contains an unusually high number of digits.",
            points: 8
        });
    }

    return {
        valid: true,
        hostname: url.hostname,
        protocol: url.protocol,
        port,
        tld,
        findings,
        positiveChecks
    };
}

module.exports = analyzePatterns;