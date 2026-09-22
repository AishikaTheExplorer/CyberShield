const analyzePatterns =
    require("./patternAnalyzer");

const analyzeDomain =
    require("./domainAnalyzer");

const analyzeTyposquatting =
    require("./typosquatting");

const analyzeRedirects =
    require("./redirectAnalyzer");

const calculateRisk =
    require("./riskEngine");

async function analyzeURL(input) {
    /*
     * Normalize input
     */
    let normalizedURL =
        String(input || "").trim();

    /*
     * If user enters:
     *
     * google.com
     *
     * convert it to:
     *
     * https://google.com
     */
    if (
        normalizedURL &&
        !/^https?:\/\//i.test(normalizedURL)
    ) {
        normalizedURL =
            `https://${normalizedURL}`;
    }

    /*
     * Basic pattern analysis
     */
    const patternResult =
        analyzePatterns(normalizedURL);

    if (!patternResult.valid) {
        const risk =
            calculateRisk({
                patternResult,
                domainResult: null,
                typosquattingResult: null,
                redirectResult: null
            });

        return {
            success: true,
            url: normalizedURL,
            score: risk.score,
            level: risk.level,
            recommendation: risk.recommendation,
            warnings: risk.findings.map(
                (item) => item.description
            ),
            findings: risk.findings,
            positiveChecks: [],
            domain: null,
            typosquatting: null,
            redirects: null
        };
    }

    /*
     * Parse URL
     */
    let parsedURL;

    try {
        parsedURL =
            new URL(normalizedURL);
    } catch {
        return {
            success: false,
            message: "Invalid URL"
        };
    }

    const hostname =
        parsedURL.hostname;

    /*
     * Run independent analyses
     *
     * They can run in parallel.
     */
    const [
        domainResult,
        typosquattingResult,
        redirectResult
    ] = await Promise.all([
        analyzeDomain(hostname),
        Promise.resolve(
            analyzeTyposquatting(hostname)
        ),
        analyzeRedirects(normalizedURL)
    ]);

    /*
     * Calculate final risk
     */
    const risk =
        calculateRisk({
            patternResult,
            domainResult,
            typosquattingResult,
            redirectResult
        });

    /*
     * Positive checks
     */
    const positiveChecks = [
        ...(patternResult.positiveChecks || []),
        ...(domainResult.positiveChecks || [])
    ];

    /*
     * If redirects ended at another URL,
     * analyze the final hostname for display.
     */
    let finalHostname = null;

    if (
        redirectResult &&
        redirectResult.finalURL
    ) {
        try {
            finalHostname =
                new URL(
                    redirectResult.finalURL
                ).hostname;
        } catch {
            finalHostname = null;
        }
    }

    return {
        success: true,

        url: normalizedURL,

        score: risk.score,

        level: risk.level,

        recommendation:
            risk.recommendation,

        warnings:
            risk.findings.map(
                (item) => item.description
            ),

        findings:
            risk.findings,

        positiveChecks,

        analysis: {
            protocol:
                parsedURL.protocol,

            hostname,

            port:
                parsedURL.port ||
                (
                    parsedURL.protocol === "https:"
                        ? 443
                        : 80
                ),

            tld:
                patternResult.tld,

            ipAddress:
                patternResult.findings.some(
                    (item) =>
                        item.type === "ip-address"
                ),

            punycode:
                patternResult.findings.some(
                    (item) =>
                        item.type === "punycode"
                ),

            suspiciousKeywords:
                patternResult.findings.some(
                    (item) =>
                        item.type === "suspicious-keywords" ||
                        item.type === "single-suspicious-keyword"
                ),

            suspiciousPort:
                patternResult.findings.some(
                    (item) =>
                        item.type === "suspicious-port"
                ),

            typosquatting:
                typosquattingResult.detected,

            domainAgeDays:
                domainResult.ageDays,

            finalHostname,

            redirectCount:
                redirectResult.redirects
                    ? redirectResult.redirects.length
                    : 0
        },

        domain: {
            hostname:
                domainResult.hostname,

            ageDays:
                domainResult.ageDays,

            createdDate:
                domainResult.createdDate,

            updatedDate:
                domainResult.updatedDate,

            expirationDate:
                domainResult.expirationDate,

            registrar:
                domainResult.registrar,

            nameservers:
                domainResult.nameservers,

            rdapAvailable:
                domainResult.available
        },

        typosquatting: {
            detected:
                typosquattingResult.detected,

            matches:
                typosquattingResult.matches
        },

        redirects: {
            success:
                redirectResult.success,

            finalURL:
                redirectResult.finalURL,

            count:
                redirectResult.redirects
                    ? redirectResult.redirects.length
                    : 0,

            chain:
                redirectResult.redirects || []
        },

        disclaimer:
            "CyberShield performs heuristic security analysis. A LOW risk result does not guarantee that a website is safe."
    };
}

module.exports = analyzeURL;