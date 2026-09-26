```js
const API_TIMEOUT = 5000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      response,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function githubFallback(username) {
  const cleanUsername = username
    .trim()
    .replace(/^@/, "");

  if (!cleanUsername) {
    return null;
  }

  try {
    const { response, data } =
      await fetchWithTimeout(
        `https://api.github.com/users/${encodeURIComponent(
          cleanUsername
        )}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/vnd.github+json",

            "X-GitHub-Api-Version":
              "2026-03-10",

            "User-Agent":
              "CyberShield-DigitalFootprint/1.0",
          },
        }
      );

    if (response.status === 200 && data) {
      return {
        platform: "GitHub",
        type: "developer",
        username: cleanUsername,

        status: "FOUND",
        statusType: "FOUND",

        found: true,

        method: "api-fallback",

        confidence: 0.95,

        url: data.html_url,

        profile: {
          username: data.login || null,
          name: data.name || null,
          bio: data.bio || null,
          company: data.company || null,
          location: data.location || null,
          website: data.blog || null,
          publicEmail: data.email || null,

          followers:
            typeof data.followers === "number"
              ? data.followers
              : null,

          following:
            typeof data.following === "number"
              ? data.following
              : null,

          publicRepositories:
            typeof data.public_repos === "number"
              ? data.public_repos
              : null,

          publicGists:
            typeof data.public_gists === "number"
              ? data.public_gists
              : null,

          createdAt: data.created_at || null,
          updatedAt: data.updated_at || null,

          avatar: data.avatar_url || null,
        },

        message:
          "Profile verified using the official GitHub API.",
      };
    }

    if (response.status === 404) {
      return {
        platform: "GitHub",
        type: "developer",
        username: cleanUsername,

        status: "NOT_FOUND",
        statusType: "NOT_FOUND",

        found: false,

        method: "api-fallback",

        confidence: 0.90,

        url: `https://github.com/${encodeURIComponent(
          cleanUsername
        )}`,

        message:
          "GitHub API could not find this user.",
      };
    }

    if (
      response.status === 403 ||
      response.status === 429
    ) {
      return {
        platform: "GitHub",
        type: "developer",
        username: cleanUsername,

        status: "BLOCKED",
        statusType: "BLOCKED",

        found: false,

        method: "api-fallback",

        confidence: 0,

        url: `https://github.com/${encodeURIComponent(
          cleanUsername
        )}`,

        message:
          "GitHub API rate limit or access restriction was reached.",
      };
    }

    return {
      platform: "GitHub",
      type: "developer",
      username: cleanUsername,

      status: "UNKNOWN",
      statusType: "UNKNOWN",

      found: false,

      method: "api-fallback",

      confidence: 0,

      url: `https://github.com/${encodeURIComponent(
        cleanUsername
      )}`,

      message:
        "GitHub API returned an unexpected response.",
    };
  } catch (error) {
    return {
      platform: "GitHub",
      type: "developer",
      username: cleanUsername,

      status: "UNKNOWN",
      statusType: "UNKNOWN",

      found: false,

      method: "api-fallback",

      confidence: 0,

      url: `https://github.com/${encodeURIComponent(
        cleanUsername
      )}`,

      message:
        error?.name === "AbortError"
          ? "GitHub API request timed out."
          : "GitHub API could not be reached.",
    };
  }
}

const fallbackProviders = {
  GitHub: githubFallback,
};

async function runFallback(
  platform,
  username
) {
  const provider =
    fallbackProviders[platform];

  if (!provider) {
    return null;
  }

  return provider(username);
}

module.exports = {
  githubFallback,
  runFallback,
};
```
