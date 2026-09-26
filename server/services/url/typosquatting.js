/**
 * CyberShield - Typosquatting Analyzer
 *
 * Checks whether a domain looks like a typo/variation
 * of a commonly targeted legitimate domain.
 */

const COMMON_DOMAINS = [
    "google.com",
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "amazon.com",
    "microsoft.com",
    "apple.com",
    "paypal.com",
    "netflix.com",
    "linkedin.com",
    "github.com",
    "twitter.com",
    "x.com",
    "whatsapp.com",
    "gmail.com"
];

/**
 * Calculate simple Levenshtein distance between two strings.
 */
function levenshteinDistance(a, b) {
    const matrix = Array.from(
        { length: b.length + 1 },
        () => Array(a.length + 1).fill(0)
    );

    for (let i = 0; i <= b.length; i++) {
        matrix[i][0] = i;
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] =
                    matrix[i - 1][j - 1];
            } else {
                matrix[i][j] =
                    Math.min(
                        matrix[i - 1][j] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j - 1] + 1
                    );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Extract the main domain name.
 *
 * Example:
 * www.google.com -> google.com
 */
function normalizeDomain(hostname) {
    return hostname
        .toLowerCase()
        .replace(/^www\./, "")
        .trim();
}

/**
 * Analyze a hostname for possible typosquatting.
 */
function analyzeTyposquatting(hostname) {
    const domain = normalizeDomain(hostname);

    const matches = [];

    for (const legitimateDomain of COMMON_DOMAINS) {
        const distance =
            levenshteinDistance(
                domain,
                legitimateDomain
            );

        /*
         * Ignore exact matches.
         */
        if (domain === legitimateDomain) {
            continue;
        }

        /*
         * A small edit distance can indicate
         * a possible typo/impersonation.
         */
        if (distance <= 2) {
            matches.push({
                domain: legitimateDomain,
                distance,
                reason:
                    `Domain is very similar to ${legitimateDomain}`
            });
        }

        /*
         * Also check whether the legitimate
         * domain appears inside a larger domain.
         *
         * Example:
         * secure-google.com
         * paypal-login.com
         */
        const domainName =
            legitimateDomain.split(".")[0];

        if (
            domain.includes(domainName) &&
            domain !== legitimateDomain &&
            !matches.some(
                (match) =>
                    match.domain === legitimateDomain
            )
        ) {
            matches.push({
                domain: legitimateDomain,
                distance,
                reason:
                    `Domain contains the name of ${legitimateDomain}`
            });
        }
    }

    return {
        detected: matches.length > 0,
        matches,
        findings: matches.map((match) => ({
            type: "possible-typosquatting",
            title: "Possible lookalike domain",
            description: match.reason,
            points: 35,
            details: {
                submittedDomain: domain,
                similarDomain: match.domain
            }
        }))
    };
}

module.exports = analyzeTyposquatting;