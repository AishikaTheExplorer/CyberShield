function calculateRisk({
    patternResult,
    domainResult,
    typosquattingResult,
    redirectResult
}) {
    const findings = [];

    /*
     * Collect findings
     */
    if (
        patternResult &&
        Array.isArray(patternResult.findings)
    ) {
        findings.push(
            ...patternResult.findings
        );
    }

    if (
        domainResult &&
        Array.isArray(domainResult.findings)
    ) {
        findings.push(
            ...domainResult.findings
        );
    }

    if (
        typosquattingResult &&
        Array.isArray(typosquattingResult.findings)
    ) {
        findings.push(
            ...typosquattingResult.findings
        );
    }

    if (
        redirectResult &&
        Array.isArray(redirectResult.findings)
    ) {
        findings.push(
            ...redirectResult.findings
        );
    }

    /*
     * Calculate score
     */
    let score = findings.reduce(
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
        findings.some(
            (item) =>
                item.type === "possible-typosquatting"
        );

    const hasEmbeddedCredentials =
        findings.some(
            (item) =>
                item.type === "embedded-credentials"
        );

    const hasIP =
        findings.some(
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
    }

    if (
        hasTyposquatting &&
        hasIP
    ) {
        score += 15;
    }

    /*
     * Cap
     */

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
        [...findings].sort(
            (a, b) =>
                Number(b.points || 0) -
                Number(a.points || 0)
        );

    /*
     * Remove duplicate messages
     */

    const uniqueFindings =
        sortedFindings.filter(
            (finding, index, array) =>
                index ===
                array.findIndex(
                    (item) =>
                        item.title === finding.title &&
                        item.description === finding.description
                )
        );

    return {
        score,
        level,
        recommendation,
        findings: uniqueFindings
    };
}

module.exports = calculateRisk;