```js
const footprintSources = require("./footprintSources");

const REQUEST_TIMEOUT = 3000;
const HARD_TIMEOUT = 4000;

/**
 * Check one platform for a username.
 *
 * Important:
 * HTTP 200 does NOT always guarantee that the profile belongs
 * to the supplied username. Therefore we report the result as
 * FOUND/NOT_FOUND/BLOCKED/UNKNOWN rather than claiming ownership.
 */
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

        /*
         * 2xx:
         * The page was accessible.
         *
         * We call this FOUND for now, but the confidence is
         * intentionally below 100 because HTTP 200 alone does
         * not prove that a real profile exists.
         */
        if (
          response.status >= 200 &&
          response.status < 300
        ) {
          statusType = "FOUND";
          found = true;
          confidence = 0.70;
        }

        /*
         * 404:
         * The platform explicitly says that the resource
         * does not exist.
         */
        else if (response.status === 404) {
          statusType = "NOT_FOUND";
          found = false;
          confidence = 0.85;
        }

        /*
         * These usually mean that automated verification
         * is not allowed or the platform is rate limiting us.
         */
        else if (
          response.status === 401 ||
          response.status === 403 ||
          response.status === 429
        ) {
          statusType = "BLOCKED";
          found = false;
          confidence = 0;
        }

        /*
         * Other responses cannot safely tell us whether
         * the username exists.
         */
        else {
          statusType = "UNKNOWN";
          found = false;
          confidence = 0;
        }

        return {
          ...baseResult,

          status: response.status,
          statusType,
          found,

          /*
           * This is NOT identity confidence.
           * It is only confidence in the platform check.
           */
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

      /*
       * Hard safety timeout.
       * This protects the server even if fetch/AbortController
       * behaves unexpectedly.
       */
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

            message:
              "Platform check timed out.",
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


/**
 * Scan all enabled platforms for a username.
 *
 * All platforms are checked concurrently using Promise.all().
 */
async function scanUsername(username) {

  /*
   * Validate input.
   */
  if (
    typeof username !== "string" ||
    username.trim().length < 2
  ) {
    return {
      success: false,

      error:
        "Username must contain at least 2 characters.",

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


  /*
   * Clean the username before searching.
   */
  const cleanUsername = username
    .trim()
    .replace(/^@/, "");


  /*
   * Only scan sources that are explicitly enabled.
   *
   * If a source does not have an 'enabled' property,
   * we treat it as enabled for backwards compatibility.
   */
  const sources = footprintSources.filter(
    (source) =>
      source &&
      (
        source.enabled === undefined ||
        source.enabled === true
      )
  );


  /*
   * Check all platforms simultaneously.
   *
   * This is considerably faster than:
   *
   * for (...) {
   *   await checkSinglePlatform(...)
   * }
   */
  const results = await Promise.all(
    sources.map((source) =>
      checkSinglePlatform(
        source,
        cleanUsername
      )
    )
  );


  /*
   * Calculate statistics from the actual status
   * instead of relying only on the 'found' boolean.
   */
  const statistics = {
    checked: results.length,

    found: results.filter(
      (result) =>
        result.statusType === "FOUND"
    ).length,

    notFound: results.filter(
      (result) =>
        result.statusType === "NOT_FOUND"
    ).length,

    blocked: results.filter(
      (result) =>
        result.statusType === "BLOCKED"
    ).length,

    unknown: results.filter(
      (result) =>
        result.statusType === "UNKNOWN"
    ).length,
  };


  /*
   * Calculate how many platforms actually gave us
   * a definitive answer.
   */
  const verified =
    statistics.found +
    statistics.notFound;

  const verificationRate =
    statistics.checked > 0
      ? Number(
          (
            (verified / statistics.checked) *
            100
          ).toFixed(1)
        )
      : 0;


  /*
   * Return a structured result that can later be
   * consumed by footprintAnalyzer.js.
   */
  return {
    success: true,

    username: cleanUsername,

    profiles: results,

    statistics: {
      ...statistics,

      verificationRate,
    },

    /*
     * This is intentionally informational.
     * It does NOT mean the username belongs to
     * the person being investigated.
     */
    note:
      "A FOUND result means the profile URL was accessible. " +
      "It does not independently verify ownership of the account.",
  };
}


/*
 * Export the new function.
 */
module.exports = {
  scanUsername,

  /*
   * Exporting this too is useful for testing individual
   * platforms from your backend.
   */
  checkSinglePlatform,
};
```
