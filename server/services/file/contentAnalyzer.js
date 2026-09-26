const PDF_RISK_INDICATORS = [
  { marker: "/JavaScript", reason: "PDF JavaScript marker", points: 25 },
  { marker: "/JS", reason: "PDF script action marker", points: 25 },
  { marker: "/Launch", reason: "PDF launch action marker", points: 30 },
  { marker: "/EmbeddedFile", reason: "Embedded file in PDF", points: 10 },
  { marker: "/OpenAction", reason: "PDF automatic open action marker", points: 20 },
  { marker: "/AA", reason: "PDF additional action marker", points: 15 },
];

function analyzeFileContent(buffer, detectedType) {
  if (detectedType !== ".pdf") {
    return {
      riskBreakdown: [],
      warnings: [],
      checksPassed: [],
    };
  }

  const matchedIndicators = PDF_RISK_INDICATORS.filter(({ marker }) =>
    buffer.includes(Buffer.from(marker, "ascii"))
  );

  return {
    riskBreakdown: matchedIndicators.map(({ reason, points }) => ({
      reason,
      points,
    })),
    warnings: matchedIndicators.map(
      ({ marker }) => `Possible active-content marker found: ${marker}`
    ),
    checksPassed: matchedIndicators.length === 0
      ? ["PDF content checked for common active-content markers"]
      : [],
  };
}

module.exports = analyzeFileContent;