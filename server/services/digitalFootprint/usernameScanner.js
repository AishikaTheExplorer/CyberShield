const footprintSources = require("./footprintSources");

async function checkUsername(username) {
  const results = [];

  for (const source of footprintSources) {
    const profileUrl = `${source.url}${username}`;

    try {
      const response = await fetch(profileUrl, {
        method: "HEAD",
        redirect: "follow",
      });

      results.push({
        platform: source.name,
        type: source.type,
        username,
        url: profileUrl,
        found: response.status >= 200 && response.status < 400,
        status: response.status,
      });
    } catch (error) {
      results.push({
        platform: source.name,
        type: source.type,
        username,
        url: profileUrl,
        found: false,
        status: null,
        error: "Unable to check this platform",
      });
    }
  }

  return results;
}

module.exports = checkUsername;