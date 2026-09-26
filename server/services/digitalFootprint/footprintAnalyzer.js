```js
const { scanUsername } = require("./usernameScanner");
const analyzeEmail = require("./emailScanner");

async function analyzeFootprint({
  username = "",
  email = "",
  fullName = "",
  phone = "",
}) {
  const result = {
    input: {
      username,
      email,
      fullName,
      phone,
    },

    usernameResults: [],
    usernameStatistics: null,
    emailResult: null,

    riskScore: 0,
    riskLevel: "LOW",
    warnings: [],
  };

  // Username analysis
  if (username.trim()) {
    const cleanUsername = username
      .trim()
      .replace(/^@/, "");

    if (cleanUsername.length < 4) {
      result.riskScore += 15;

      result.warnings.push(
        "Short usernames can be easier to guess or reuse."
      );
    }

    try {
      const usernameResult =
        await scanUsername(cleanUsername);

      result.usernameResults =
        usernameResult.profiles;

      result.usernameStatistics =
        usernameResult.statistics;

      const foundProfiles =
        result.usernameResults.filter(
          (item) =>
            item.statusType === "FOUND"
        );

      if (foundProfiles.length > 0) {
        result.riskScore += Math.min(
          foundProfiles.length * 5,
          25
        );

        result.warnings.push(
          `${foundProfiles.length} possible public profile(s) were found.`
        );
      }

      if (
        usernameResult.statistics.blocked > 0
      ) {
        result.warnings.push(
          `${usernameResult.statistics.blocked} platform(s) blocked automated verification.`
        );
      }

      if (
        usernameResult.statistics.unknown > 0
      ) {
        result.warnings.push(
          `${usernameResult.statistics.unknown} platform(s) could not be reliably verified.`
        );
      }

    } catch (error) {
      console.error(
        "Username scanner error:",
        error.message
      );

      result.warnings.push(
        "Some username platforms could not be checked."
      );

      result.usernameResults = [];
      result.usernameStatistics = null;
    }
  }

  // Email analysis
  if (email.trim()) {
    result.emailResult =
      analyzeEmail(email.trim());

    if (!result.emailResult.valid) {
      result.riskScore += 20;

      result.warnings.push(
        "The email address format appears invalid."
      );
    }

    if (
      result.emailResult.type === "custom"
    ) {
      result.riskScore += 5;
    }

    if (
      result.emailResult.warnings?.length > 0
    ) {
      result.warnings.push(
        ...result.emailResult.warnings
      );
    }
  }

  // Full name analysis
  if (fullName.trim()) {
    const nameParts =
      fullName.trim().split(/\s+/);

    if (nameParts.length >= 2) {
      result.riskScore += 5;

      result.warnings.push(
        "A complete name was provided."
      );
    }
  }

  // Phone analysis
  if (phone.trim()) {
    const phoneDigits =
      phone.replace(/\D/g, "");

    if (phoneDigits.length < 7) {
      result.riskScore += 20;

      result.warnings.push(
        "The phone number appears too short."
      );
    } else {
      result.riskScore += 10;

      result.warnings.push(
        "A phone number was provided. Avoid exposing phone numbers publicly."
      );
    }
  }

  // Multiple information types
  const fieldsProvided = [
    username,
    email,
    fullName,
    phone,
  ].filter(
    (value) =>
      typeof value === "string" &&
      value.trim()
  ).length;

  if (fieldsProvided >= 3) {
    result.riskScore += 15;

    result.warnings.push(
      "Multiple personal information fields were provided."
    );
  }

  // Limit score
  result.riskScore =
    Math.min(result.riskScore, 100);

  // Risk level
  if (result.riskScore >= 60) {
    result.riskLevel = "HIGH";
  } else if (result.riskScore >= 30) {
    result.riskLevel = "MEDIUM";
  } else {
    result.riskLevel = "LOW";
  }

  return result;
}

module.exports = analyzeFootprint;
```
