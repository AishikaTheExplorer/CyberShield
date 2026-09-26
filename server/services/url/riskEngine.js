function getAffectedPart(type) {
    switch (type) {
        case "no-https":
            return "URL protocol";
        case "ip-address":
        case "punycode":
        case "unicode-domain":
        case "many-subdomains":
        case "many-hyphens":
        case "numeric-heavy-domain":
        case "possible-typosquatting":
            return "Domain name";
        case "very-new-domain":
        case "new-domain":
        case "young-domain":
            return "Domain registration age";
        case "suspicious-tld":
            return "Domain ending";
        case "suspicious-port":
        case "non-standard-port":
            return "URL port";
        case "suspicious-path":
            return "URL path";
        case "many-parameters":
            return "URL query parameters";
        case "large-fragment":
            return "URL fragment";
        case "unsafe-redirect-target":
        case "redirect-loop":
            return "Redirect destination";
        case "embedded-credentials":
            return "URL credentials";
        case "suspicious-keywords":
        case "single-suspicious-keyword":
            return "URL text";
        default:
            return "Full URL";
    }
}

function calculateRisk({
    patternResult,
    domainResult,
    typosquattingResult,
    redirectResult
}) {
    const findings = [];
    const riskAdjustments = [];

    const addFindings = (result, source) => {
        if (result && Array.isArray(result.findings)) {
            findings.push(
                ...result.findings.map((finding) => ({
                    ...finding,
                    source,
                    affectedPart:
                        finding.affectedPart ||
                        getAffectedPart(finding.type)
                }))
            );
        }
    };

    /*
     * Collect findings
     */
    addFindings(patternResult, "URL pattern checks");
    addFindings(domainResult, "Domain registration check");
    addFindings(typosquattingResult, "Lookalike domain check");
    addFindings(redirectResult, "Redirect check");

    const uniqueFindings =
        findings.filter(
            (finding, index, array) =>
                index ===
                array.findIndex(
                    (item) =>
                        item.type === finding.type &&
                        item.title === finding.title &&
                        item.description === finding.description
                )
        );

    /*
     * Calculate score
     */
    let score = uniqueFindings.reduce(
        (total, finding) =>
            total + Number(finding.points || 0),
        0
    );

    /*
     * Important high-confidence signals
     *
     * These don't automatically make the URL
     * malicious, but they increase the score.
     */

    const hasTyposquatting =
        uniqueFindings.some(
            (item) =>
                item.type === "possible-typosquatting"
        );

    const hasEmbeddedCredentials =
        uniqueFindings.some(
            (item) =>
                item.type === "embedded-credentials"
        );

    const hasIP =
        uniqueFindings.some(
            (item) =>
                item.type === "ip-address"
        );

    /*
     * Combination rules
     */

    if (
        hasTyposquatting &&
        hasEmbeddedCredentials
    ) {
        score += 15;
        riskAdjustments.push({
            reason: "Lookalike domain combined with credentials in the URL",
            points: 15
        });
    }

    if (
        hasTyposquatting &&
        hasIP
    ) {
        score += 15;
        riskAdjustments.push({
            reason: "Lookalike domain combined with an IP address",
            points: 15
        });
    }

    /*
     * Cap
     */

    const uncappedScore = score;
    score = Math.min(
        Math.max(score, 0),
        100
    );

    /*
     * Level
     */

    let level;

    if (score >= 60) {
        level = "HIGH";
    } else if (score >= 30) {
        level = "MEDIUM";
    } else {
        level = "LOW";
    }

    /*
     * Recommendation
     */

    let recommendation;

    if (level === "HIGH") {
        recommendation =
            "Avoid entering passwords, financial information, or other sensitive data on this website.";
    } else if (level === "MEDIUM") {
        recommendation =
            "Proceed carefully and verify the website domain before entering sensitive information.";
    } else {
        recommendation =
            "No major risk indicators were detected by CyberShield's current checks. Continue to use normal security precautions.";
    }

    /*
     * Sort findings by risk points
     */

    const sortedFindings =
        [...uniqueFindings].sort(
            (a, b) =>
                Number(b.points || 0) -
                Number(a.points || 0)
        );

    return {
        score,
        level,
        recommendation,
        findings: sortedFindings,
        riskAdjustments,
        scoreCapped: uncappedScore > 100
    };
}

module.exports = calculateRisk;