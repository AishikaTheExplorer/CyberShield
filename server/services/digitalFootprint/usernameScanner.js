const footprintSources = require("./footprintSources");

async function checkSinglePlatform(source, username) {
  const profileUrl = `${source.url}${username}`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 4000);

  try {
    const response = await fetch(profileUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    return {
      platform: source.name,
      type: source.type,
      username,
      url: profileUrl,
      found:
        response.status >= 200 &&
        response.status < 400,
      status: response.status,
    };

  } catch (error) {

    return {
      platform: source.name,
      type: source.type,
      username,
      url: profileUrl,
      found: false,
      status: null,
      error:
        error.name === "AbortError"
          ? "Platform check timed out"
          : "Unable to check this platform",
    };

  } finally {
    clearTimeout(timeout);
  }
}


async function checkUsername(username) {

  const results = await Promise.all(
    footprintSources.map((source) =>
      checkSinglePlatform(
        source,
        username
      )
    )
  );

  return results;
}


module.exports = checkUsername;