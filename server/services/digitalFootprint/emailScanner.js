function analyzeEmail(email) {
  const result = {
    email,
    valid: false,
    provider: null,
    type: null,
    warnings: [],
  };

  if (!email || typeof email !== "string") {
    result.warnings.push("Email address was not provided.");
    return result;
  }

  const cleanEmail = email.trim().toLowerCase();

  // Basic email format check
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(cleanEmail)) {
  result.warnings.push("Invalid email format.");
  return result;
}
  result.valid = true;

  const domain = cleanEmail.split("@")[1];

  const publicProviders = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
  ];

  if (publicProviders.includes(domain)) {
    result.provider = domain;
    result.type = "public";
  } else {
    result.provider = domain;
    result.type = "custom";
    result.warnings.push(
      "This email uses a custom or organization domain."
    );
  }

  // Check for many digits in the email username
  const localPart = cleanEmail.split("@")[0];
  const digitCount = (localPart.match(/\d/g) || []).length;

  if (digitCount >= 4) {
    result.warnings.push(
      "The email username contains several numbers."
    );
  }

  return result;
}

module.exports = analyzeEmail;