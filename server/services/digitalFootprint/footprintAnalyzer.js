const checkUsername = require("./usernameScanner");
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
    emailResult: null,

    riskScore: 0,
    riskLevel: "LOW",
    warnings: [],
  };

  // ==============================
  // USERNAME ANALYSIS
  // ==============================

  if (username.trim()) {
    const cleanUsername = username.trim();

    if (cleanUsername.length < 4) {
      result.riskScore += 15;

      result.warnings.push(
        "Short usernames can be easier to guess or reuse."
      );
    }

    try {
      result.usernameResults =
        await checkUsername(cleanUsername);

      const foundProfiles =
        result.usernameResults.filter(
          (item) => item.found
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
    } catch (error) {
      console.error(
        "Username scanner error:",
        error.message
      );

      result.warnings.push(
        "Some username platforms could not be checked."
      );

      result.usernameResults = [];
    }
  }

  // ==============================
  // EMAIL ANALYSIS
  // ==============================

  if (email.trim()) {
    result.emailResult = analyzeEmail(email);

    if (!result.emailResult.valid) {
      result.riskScore += 20;

      result.warnings.push(
        "The email address format appears invalid."
      );
    }

    if (result.emailResult.type === "custom") {
      result.riskScore += 5;
    }

    if (result.emailResult.warnings.length > 0) {
      result.warnings.push(
        ...result.emailResult.warnings
      );
    }
  }

  // ==============================
  // FULL NAME ANALYSIS
  // ==============================

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

  // ==============================
  // PHONE ANALYSIS
  // ==============================

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

  // ==============================
  // MULTIPLE INFORMATION TYPES
  // ==============================

  const fieldsProvided = [
    username,
    email,
    fullName,
    phone,
  ].filter(
    (value) => value.trim()
  ).length;

  if (fieldsProvided >= 3) {
    result.riskScore += 15;

    result.warnings.push(
      "Multiple personal information fields were provided."
    );
  }

  // ==============================
  // LIMIT SCORE
  // ==============================

  result.riskScore =
    Math.min(result.riskScore, 100);

  // ==============================
  // RISK LEVEL
  // ==============================

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