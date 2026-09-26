```js
const DuckDuckGoService = require("ddgs");

const ddg = new DuckDuckGoService();

const SEARCH_TIMEOUT = 8000;
const MAX_RESULTS = 5;

function cleanValue(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

async function searchWeb(query) {
  if (!query) {
    return [];
  }

  try {
    const searchPromise = ddg.text(query, {
      maxResults: MAX_RESULTS,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error("Web search timed out.")
        );
      }, SEARCH_TIMEOUT);
    });

    const results = await Promise.race([
      searchPromise,
      timeoutPromise,
    ]);

    return Array.isArray(results)
      ? results
      : [];
  } catch (error) {
    console.error(
      "Web search error:",
      error.message
    );

    return [];
  }
}

function formatResults(
  results,
  query,
  matchedField
) {
  return results.map((item) => ({
    source: "DuckDuckGo",

    query,

    matchedField,

    title:
      item.title ||
      item.name ||
      "Untitled result",

    url:
      item.url ||
      item.link ||
      "",

    snippet:
      item.description ||
      item.snippet ||
      "",

    type: "web_result",

    possibleMatch: true,
  }));
}

async function searchUsername(username) {
  const value = cleanValue(username);

  if (!value) {
    return [];
  }

  const queries = [
    `"${value}"`,
    `"${value}" profile`,
    `"${value}" github`,
    `"${value}" social`,
  ];

  const results = [];

  for (const query of queries) {
    const searchResults =
      await searchWeb(query);

    results.push(
      ...formatResults(
        searchResults,
        query,
        "username"
      )
    );
  }

  return results;
}

async function searchEmail(email) {
  const value = cleanValue(email);

  if (!value) {
    return [];
  }

  const queries = [
    `"${value}"`,
    `"${value}" contact`,
    `"${value}" profile`,
  ];

  const results = [];

  for (const query of queries) {
    const searchResults =
      await searchWeb(query);

    results.push(
      ...formatResults(
        searchResults,
        query,
        "email"
      )
    );
  }

  return results;
}

async function searchPhone(phone) {
  const value = cleanValue(phone);

  if (!value) {
    return [];
  }

  const digits =
    normalizePhone(value);

  if (digits.length < 7) {
    return [];
  }

  const queries = [
    `"${value}"`,
    `"${digits}"`,
  ];

  const results = [];

  for (const query of queries) {
    const searchResults =
      await searchWeb(query);

    results.push(
      ...formatResults(
        searchResults,
        query,
        "phone"
      )
    );
  }

  return results;
}

async function searchFullName(fullName) {
  const value = cleanValue(fullName);

  if (!value) {
    return [];
  }

  const queries = [
    `"${value}"`,
    `"${value}" profile`,
    `"${value}" contact`,
    `"${value}" student`,
  ];

  const results = [];

  for (const query of queries) {
    const searchResults =
      await searchWeb(query);

    results.push(
      ...formatResults(
        searchResults,
        query,
        "fullName"
      )
    );
  }

  return results;
}

function removeDuplicates(results) {
  const seen = new Set();

  return results.filter((item) => {
    if (!item.url) {
      return false;
    }

    const key =
      item.url.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

async function scanWeb({
  username = "",
  email = "",
  fullName = "",
  phone = "",
}) {
  const searches = [];

  if (username.trim()) {
    searches.push(
      searchUsername(username)
    );
  }

  if (email.trim()) {
    searches.push(
      searchEmail(email)
    );
  }

  if (fullName.trim()) {
    searches.push(
      searchFullName(fullName)
    );
  }

  if (phone.trim()) {
    searches.push(
      searchPhone(phone)
    );
  }

  const resultGroups =
    await Promise.all(searches);

  const results =
    removeDuplicates(
      resultGroups.flat()
    );

  return {
    success: true,

    totalResults: results.length,

    results,
  };
}

module.exports = {
  scanWeb,
  searchUsername,
  searchEmail,
  searchFullName,
  searchPhone,
};
```
