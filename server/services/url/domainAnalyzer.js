const net = require("net");

function extractDate(rdapData, eventAction) {
    if (!rdapData || !Array.isArray(rdapData.events)) {
        return null;
    }

    const event = rdapData.events.find(
        (item) => item.eventAction === eventAction
    );

    return event ? event.eventDate : null;
}

function calculateDomainAge(createdDate) {
    if (!createdDate) {
        return null;
    }

    const created = new Date(createdDate);

    if (Number.isNaN(created.getTime())) {
        return null;
    }

    const now = new Date();

    const difference =
        now.getTime() - created.getTime();

    const days =
        Math.floor(
            difference / (1000 * 60 * 60 * 24)
        );

    return Math.max(days, 0);
}

async function fetchRDAP(domain) {
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        7000
    );

    try {
        const response = await fetch(
            `https://rdap.org/domain/${encodeURIComponent(domain)}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/rdap+json, application/json"
                },
                signal: controller.signal
            }
        );

        if (!response.ok) {
            return {
                available: false,
                status: response.status
            };
        }

        const data = await response.json();

        return {
            available: true,
            data
        };
    } catch (error) {
        return {
            available: false,
            error: error.name === "AbortError"
                ? "RDAP request timed out"
                : error.message
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function analyzeDomain(hostname) {
    const result = {
        hostname,
        available: false,
        createdDate: null,
        updatedDate: null,
        expirationDate: null,
        ageDays: null,
        registrar: null,
        nameservers: [],
        findings: [],
        positiveChecks: []
    };

    if (!hostname || net.isIP(hostname)) {
        return result;
    }

    const rdap = await fetchRDAP(hostname);

    if (!rdap.available) {
        result.error =
            rdap.error ||
            `RDAP returned status ${rdap.status}`;

        return result;
    }

    result.available = true;

    const data = rdap.data;

    result.createdDate =
        extractDate(data, "registration");

    result.updatedDate =
        extractDate(data, "last changed") ||
        extractDate(data, "last update of RDAP database");

    result.expirationDate =
        extractDate(data, "expiration");

    result.ageDays =
        calculateDomainAge(result.createdDate);

    /*
     * Registrar
     */
    if (Array.isArray(data.entities)) {
        const registrar = data.entities.find(
            (entity) =>
                Array.isArray(entity.roles) &&
                entity.roles.includes("registrar")
        );

        if (
            registrar &&
            Array.isArray(registrar.vcardArray)
        ) {
            const vcard = registrar.vcardArray[1];

            if (Array.isArray(vcard)) {
                const fn = vcard.find(
                    (item) => item[0] === "fn"
                );

                if (fn) {
                    result.registrar = fn[3];
                }
            }
        }
    }

    /*
     * Nameservers
     */
    if (Array.isArray(data.nameservers)) {
        result.nameservers =
            data.nameservers
                .map((ns) => ns.ldhName || ns.unicodeName)
                .filter(Boolean);
    }

    /*
     * Domain age scoring
     */
    if (result.ageDays !== null) {
        if (result.ageDays < 7) {
            result.findings.push({
                type: "very-new-domain",
                title: "Very recently registered domain",
                description:
                    "The domain appears to have been registered within the last 7 days.",
                points: 25
            });
        } else if (result.ageDays < 30) {
            result.findings.push({
                type: "new-domain",
                title: "Recently registered domain",
                description:
                    "The domain appears to be less than 30 days old.",
                points: 20
            });
        } else if (result.ageDays < 90) {
            result.findings.push({
                type: "young-domain",
                title: "Relatively new domain",
                description:
                    "The domain appears to be less than 90 days old.",
                points: 10
            });
        } else {
            result.positiveChecks.push(
                "Domain has been registered for more than 90 days"
            );
        }
    }

    return result;
}

module.exports = analyzeDomain;