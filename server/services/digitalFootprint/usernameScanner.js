const footprintSources = require("./footprintSources");

async function checkSinglePlatform(source, username) {
  const profileUrl = `${source.url}${encodeURIComponent(username)}`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(profileUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml",
      },
    });

    let statusType = "unknown";

    if (response.status >= 200 && response.status < 300) {
      statusType = "accessible";
    } else if (response.status === 404) {
      statusType = "not_found";
    } else if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 429
    ) {
      statusType = "blocked";
    } else {
      statusType = "unavailable";
    }

    return {
      platform: source.name,
      type: source.type,
      username,
      url: profileUrl,
      status: response.status,
      statusType,
      found: statusType === "accessible",
      message:
        statusType === "accessible"
          ? "Profile URL is accessible."
          : statusType === "not_found"
          ? "Profile was not found."
          : statusType === "blocked"
          ? "Platform did not allow automated verification."
          : "Platform could not be verified.",
    };
  } catch (error) {
    return {
      platform: source.name,
      type: source.type,
      username,
      url: profileUrl,
      status: null,
      found: false,
      statusType: "error",
      message:
        error.name === "AbortError"
          ? "Platform check timed out."
          : "Platform could not be reached from the server.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkUsername(username) {
  return Promise.all(
    footprintSources.map((source) =>
      checkSinglePlatform(source, username)
    )
  );
}

module.exports = checkUsername;