```js
const footprintSources = require("./footprintSources");

const REQUEST_TIMEOUT = 3000;
const HARD_TIMEOUT = 4000;

async function checkSinglePlatform(source, username) {
  const profileUrl = `${source.url}${encodeURIComponent(username)}`;

  const controller = new AbortController();

  let requestTimeout;
  let hardTimeout;

  const baseResult = {
    platform: source.name,
    type: source.type,
    username,
    url: profileUrl,
  };

  try {
    requestTimeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);

    const result = await Promise.race([
      (async () => {
        const response = await fetch(profileUrl, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
              "AppleWebKit/537.36 (KHTML, like Gecko) " +
              "Chrome/131.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml",
          },
        });

        let statusType = "UNKNOWN";
        let found = false;
        let confidence = 0;

        if (
          response.status >= 200 &&
          response.status < 300
        ) {
          statusType = "FOUND";
          found = true;
          confidence = 0.70;
        } else if (response.status === 404) {
          statusType = "NOT_FOUND";
          confidence = 0.85;
        } else if (
          response.status === 401 ||
          response.status === 403 ||
          response.status === 429
        ) {
          statusType = "BLOCKED";
        }

        return {
          ...baseResult,
          status: response.status,
          statusType,
          found,
          confidence,
          method: "direct",
          message:
            statusType === "FOUND"
              ? "Profile URL is accessible. Ownership is not independently verified."
              : statusType === "NOT_FOUND"
              ? "Platform returned 404; profile was not found."
              : statusType === "BLOCKED"
              ? "Platform did not allow automated verification."
              : "Platform could not be reliably verified.",
        };
      })(),

      new Promise((resolve) => {
        hardTimeout = setTimeout(() => {
          controller.abort();

          resolve({
            ...baseResult,
            status: null,
            statusType: "UNKNOWN",
            found: false,
            confidence: 0,
            method: "direct",
            message: "Platform check timed out.",
          });
        }, HARD_TIMEOUT);
      }),
    ]);

    return result;
  } catch (error) {
    return {
      ...baseResult,
      status: null,
      statusType: "UNKNOWN",
      found: false,
      confidence: 0,
      method: "direct",
      message:
        error?.name === "AbortError"
          ? "Platform check timed out."
          : "Platform could not be reached from the server.",
    };
  } finally {
    clearTimeout(requestTimeout);
    clearTimeout(hardTimeout);
  }
}

async function scanUsername(username) {
  if (
    typeof username !== "string" ||
    username.trim().length < 2
  ) {
    return {
      success: false,
      error: "Username must contain at least 2 characters.",
      username: username || "",
      profiles: [],
      statistics: {
        checked: 0,
        found: 0,
        notFound: 0,
        blocked: 0,
        unknown: 0,
      },
    };
  }

  const cleanUsername = username
    .trim()
    .replace(/^@/, "");

  const sources = footprintSources.filter(
    (source) =>
      source &&
      (
        source.enabled === undefined ||
        source.enabled === true
      )
  );

  const results = await Promise.all(
    sources.map((source) =>
      checkSinglePlatform(source, cleanUsername)
    )
  );

  const statistics = {
    checked: results.length,
    found: results.filter(
      (result) => result.statusType === "FOUND"
    ).length,
    notFound: results.filter(
      (result) => result.statusType === "NOT_FOUND"
    ).length,
    blocked: results.filter(
      (result) => result.statusType === "BLOCKED"
    ).length,
    unknown: results.filter(
      (result) => result.statusType === "UNKNOWN"
    ).length,
  };

  const verified =
    statistics.found + statistics.notFound;

  const verificationRate =
    statistics.checked > 0
      ? Number(
          (
            (verified / statistics.checked) *
            100
          ).toFixed(1)
        )
      : 0;

  return {
    success: true,
    username: cleanUsername,
    profiles: results,
    statistics: {
      ...statistics,
      verificationRate,
    },
    note:
      "A FOUND result means the profile URL was accessible. " +
      "It does not independently verify account ownership.",
  };
}

module.exports = {
  scanUsername,
  checkSinglePlatform,
};
```
