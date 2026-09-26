
function normalizeText(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value) {
  return value
    .replace(/\D/g, "");
}

function maskEmail(email) {
  const parts = email.split("@");

  if (parts.length !== 2) {
    return email;
  }

  const name = parts[0];

  if (name.length <= 2) {
    return "*".repeat(name.length) +
      "@" +
      parts[1];
  }

  return (
    name[0] +
    "*".repeat(
      Math.max(name.length - 2, 1)
    ) +
    name[name.length - 1] +
    "@" +
    parts[1]
  );
}

function containsEmail(text, email) {
  if (!email) {
    return false;
  }

  return normalizeText(text).includes(
    normalizeText(email)
  );
}

function containsUsername(
  text,
  username
) {
  if (!username) {
    return false;
  }

  const normalizedText =
    normalizeText(text);

  const normalizedUsername =
    normalizeText(username);

  return normalizedText.includes(
    normalizedUsername
  );
}

function containsPhone(
  text,
  phone
) {
  if (!phone) {
    return false;
  }

  const textDigits =
    normalizePhone(text);

  const phoneDigits =
    normalizePhone(phone);

  if (phoneDigits.length < 7) {
    return false;
  }

  return textDigits.includes(
    phoneDigits
  );
}

function containsName(
  text,
  fullName
) {
  if (!fullName) {
    return false;
  }

  const normalizedText =
    normalizeText(text);

  const normalizedName =
    normalizeText(fullName);

  return normalizedText.includes(
    normalizedName
  );
}

function extractEvidence(
  result,
  input
) {
  const title =
    result.title || "";

  const snippet =
    result.snippet || "";

  const url =
    result.url || "";

  const searchableText =
    `${title} ${snippet} ${url}`;

  const evidence = [];

  if (
    containsUsername(
      searchableText,
      input.username
    )
  ) {
    evidence.push("username");
  }

  if (
    containsEmail(
      searchableText,
      input.email
    )
  ) {
    evidence.push("email");
  }

  if (
    containsPhone(
      searchableText,
      input.phone
    )
  ) {
    evidence.push("phone");
  }

  if (
    containsName(
      searchableText,
      input.fullName
    )
  ) {
    evidence.push("fullName");
  }

  return {
    ...result,

    evidence,

    matched:
      evidence.length > 0,

    matchCount:
      evidence.length,

    matchedData: {
      username:
        evidence.includes(
          "username"
        ),

      email:
        evidence.includes(
          "email"
        ),

      phone:
        evidence.includes(
          "phone"
        ),

      fullName:
        evidence.includes(
          "fullName"
        ),
    },

    privacyImpact:
      evidence.length > 0
        ? getPrivacyImpact(
            evidence
          )
        : "NONE",
  };
}

function getPrivacyImpact(
  evidence
) {
  if (
    evidence.includes("email") &&
    evidence.includes("phone")
  ) {
    return "HIGH";
  }

  if (
    evidence.includes("email") ||
    evidence.includes("phone")
  ) {
    return "MEDIUM";
  }

  if (
    evidence.includes("fullName") &&
    evidence.includes("username")
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function extractAllEvidence(
  results,
  input
) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((result) =>
      extractEvidence(
        result,
        input
      )
    )
    .filter(
      (result) =>
        result.matched
    );
}

function summarizeEvidence(
  evidence
) {
  const summary = {
    totalSources:
      evidence.length,

    usernameMentions: 0,

    emailMentions: 0,

    phoneMentions: 0,

    nameMentions: 0,

    highImpact: 0,

    mediumImpact: 0,

    lowImpact: 0,
  };

  for (const item of evidence) {
    if (
      item.matchedData.username
    ) {
      summary.usernameMentions++;
    }

    if (
      item.matchedData.email
    ) {
      summary.emailMentions++;
    }

    if (
      item.matchedData.phone
    ) {
      summary.phoneMentions++;
    }

    if (
      item.matchedData.fullName
    ) {
      summary.nameMentions++;
    }

    if (
      item.privacyImpact === "HIGH"
    ) {
      summary.highImpact++;
    } else if (
      item.privacyImpact === "MEDIUM"
    ) {
      summary.mediumImpact++;
    } else if (
      item.privacyImpact === "LOW"
    ) {
      summary.lowImpact++;
    }
  }

  return summary;
}

module.exports = {
  extractEvidence,
  extractAllEvidence,
  summarizeEvidence,
  maskEmail,
};
