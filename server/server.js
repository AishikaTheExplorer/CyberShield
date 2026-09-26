/* =====================================================
   CYBERSHIELD BACKEND
   Node.js + Express
===================================================== */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const analyzeURL = require("./services/url/urlAnalyzer");
const analyzeFootprint = require("./services/digitalFootprint/footprintAnalyzer");
const analyzeFileContent = require("./services/file/contentAnalyzer");

dotenv.config();

const app = express();

/* =====================================================
   CONFIGURATION
===================================================== */

const PORT = process.env.PORT || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://cyber-shield-8uj6u57aq-aishikatheexplorer.vercel.app";

/* =====================================================
   CORS
===================================================== */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",

  // Current Vercel frontend
  "https://cyber-shield-8uj6u57aq-aishikatheexplorer.vercel.app",

  // Other Vercel deployments
  "https://cyber-shield-woad.vercel.app",
  "https://cyber-shield-lpcgrv546-aishikatheexplorer.vercel.app",

  FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman, curl, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS blocked:", origin);

      return callback(new Error("Not allowed by CORS"));
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/* =====================================================
   BODY PARSER
===================================================== */

app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =====================================================
   FILE UPLOAD
===================================================== */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

/* =====================================================
   HOME / SERVER TEST
===================================================== */

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",

    message:
      "CyberShield Backend is running!",

    service:
      "CyberShield API",

    timestamp:
      new Date().toISOString(),
  });
});

/* =====================================================
   SIMPLE BACKEND CONNECTION TEST
===================================================== */

app.get("/api/test", (req, res) => {
  res.status(200).json({
    status: "success",

    success: true,

    message:
      "CyberShield backend connection successful.",

    timestamp:
      new Date().toISOString(),
  });
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",

    success: true,

    message:
      "CyberShield backend is connected",

    environment:
      process.env.NODE_ENV ||
      "production",

    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "not connected",

    timestamp:
      new Date().toISOString(),
  });
});

/* =====================================================
   URL SAFETY CHECKER
===================================================== */

app.post("/api/url-check", async (req, res) => {
  try {
    const { url } = req.body;

    /* ---------------------------------------------
       1. Validate URL input
    --------------------------------------------- */

    if (
      !url ||
      typeof url !== "string" ||
      !url.trim()
    ) {
      return res.status(400).json({
        status: "error",

        message:
          "Please enter a URL.",
      });
    }

    const cleanURL = url.trim();

    /* ---------------------------------------------
       2. Run CyberShield URL analysis
    --------------------------------------------- */

    const result = await analyzeURL(cleanURL);

    if (
      !result ||
      result.success === false
    ) {
      return res.status(400).json({
        status: "error",

        message:
          result?.message ||
          "Unable to analyze the URL.",
      });
    }

    /* ---------------------------------------------
       3. Get analysis information
    --------------------------------------------- */

    const analysis =
      result.analysis || {};

    const domain =
      result.domain || {};

    const redirects =
      result.redirects || {};

    const findings =
      Array.isArray(result.findings)
        ? result.findings
        : [];

    /* ---------------------------------------------
       4. Determine information quality
    --------------------------------------------- */

    let informationScore = 0;

    if (
      domain.rdapAvailable === true
    ) {
      informationScore += 2;
    }

    if (
      domain.ageDays !== null &&
      domain.ageDays !== undefined
    ) {
      informationScore += 2;
    }

    if (
      redirects.success === true
    ) {
      informationScore += 2;
    }

    if (findings.length > 0) {
      informationScore += 2;
    }

    if (
      Array.isArray(
        result.positiveChecks
      ) &&
      result.positiveChecks.length > 0
    ) {
      informationScore += 1;
    }

    if (analysis.hostname) {
      informationScore += 1;
    }

    const enoughInformation =
      informationScore >= 6;

    /* ---------------------------------------------
       5. Decide whether VirusTotal is needed
    --------------------------------------------- */

    let needsVirusTotal =
      !enoughInformation;

    const highRiskIndicators =
      findings.filter((finding) => {
        return (
          Number(
            finding.points || 0
          ) >= 25
        );
      });

    if (
      highRiskIndicators.length > 0 &&
      !enoughInformation
    ) {
      needsVirusTotal = true;
    }

    /* ---------------------------------------------
       6. Default threat intelligence
    --------------------------------------------- */

    let threatIntel = {
      used: false,

      available: false,

      reportFound: false,

      reason:
        enoughInformation
          ? "CyberShield had enough information to complete the initial assessment."
          : "CyberShield did not have enough information for a confident assessment.",
    };

    /* ---------------------------------------------
       7. VirusTotal API
    --------------------------------------------- */

    const apiKey =
      process.env.VIRUSTOTAL_API_KEY;

    if (
      needsVirusTotal &&
      apiKey
    ) {
      try {
        let parsedURL;

        try {
          parsedURL =
            new URL(result.url);
        } catch {
          parsedURL = null;
        }

        if (parsedURL) {
          /* -------------------------------------
             Create VirusTotal URL ID
          ------------------------------------- */

          const urlId =
            Buffer
              .from(parsedURL.href)
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");

          /* -------------------------------------
             Ask VirusTotal for existing report
          ------------------------------------- */

          const virusTotalResponse =
            await fetch(
              `https://www.virustotal.com/api/v3/urls/${urlId}`,
              {
                method: "GET",

                headers: {
                  "x-apikey": apiKey,

                  Accept:
                    "application/json",
                },
              }
            );

          /* =====================================
             VIRUSTOTAL REPORT FOUND
          ===================================== */

          if (
            virusTotalResponse.ok
          ) {
            const virusTotalData =
              await virusTotalResponse.json();

            const attributes =
              virusTotalData
                .data
                ?.attributes || {};

            const stats =
              attributes
                .last_analysis_stats || {};

            const malicious =
              stats.malicious || 0;

            const suspicious =
              stats.suspicious || 0;

            const harmless =
              stats.harmless || 0;

            const undetected =
              stats.undetected || 0;

            let finalRiskScore =
              Number(
                result.score || 0
              );

            if (malicious > 0) {
              finalRiskScore =
                Math.max(
                  finalRiskScore,
                  80
                );
            } else if (
              suspicious > 0
            ) {
              finalRiskScore =
                Math.max(
                  finalRiskScore,
                  60
                );
            }

            finalRiskScore =
              Math.min(
                finalRiskScore,
                100
              );

            let finalRiskLevel =
              "LOW";

            if (
              finalRiskScore >= 60
            ) {
              finalRiskLevel =
                "HIGH";
            } else if (
              finalRiskScore >= 30
            ) {
              finalRiskLevel =
                "MEDIUM";
            }

            threatIntel = {
              used: true,

              available: true,

              reportFound: true,

              source:
                "VirusTotal",

              malicious,

              suspicious,

              harmless,

              undetected,

              message:
                malicious > 0
                  ? "VirusTotal reported malicious detections."
                  : suspicious > 0
                  ? "VirusTotal reported suspicious detections."
                  : "No malicious or suspicious detections were reported in the available VirusTotal analysis.",
            };

            return res.json({
              status: "success",

              success: true,

              url:
                result.url,

              riskScore:
                finalRiskScore,

              riskLevel:
                finalRiskLevel,

              warnings:
                result.warnings || [],

              positiveChecks:
                result.positiveChecks || [],

              findings:
                result.findings || [],

              riskAdjustments: [
                ...(result.riskAdjustments || []),
                ...(finalRiskScore > result.score
                  ? [{
                    reason:
                      malicious > 0
                        ? "VirusTotal reported malicious detections"
                        : "VirusTotal reported suspicious detections",
                    points:
                      finalRiskScore - result.score,
                  }]
                  : []),
              ],

              scoreCapped:
                result.scoreCapped || false,

              analysis:
                result.analysis || {},

              domain:
                result.domain || {},

              typosquatting:
                result.typosquatting || {},

              redirects:
                result.redirects || {},

              informationQuality: {
                score:
                  informationScore,

                enoughInformation,

                virusTotalUsed:
                  true,
              },

              threatIntel,

              message:
                finalRiskLevel ===
                "HIGH"
                  ? "The URL has significant risk indicators."
                  : finalRiskLevel ===
                    "MEDIUM"
                  ? "The URL has some suspicious indicators."
                  : "No major suspicious indicators were detected.",
            });
          }

          /* =====================================
             VIRUSTOTAL STATUS HANDLING
          ===================================== */

          if (
            virusTotalResponse.status ===
            404
          ) {
            threatIntel = {
              used: true,

              available: true,

              reportFound: false,

              source:
                "VirusTotal",

              message:
                "No existing VirusTotal report was found for this URL.",
            };
          } else if (
            virusTotalResponse.status ===
            429
          ) {
            threatIntel = {
              used: true,

              available: false,

              reportFound: false,

              source:
                "VirusTotal",

              message:
                "VirusTotal rate limit was reached. CyberShield's own analysis was still completed.",
            };
          } else if (
            virusTotalResponse.status ===
              401 ||
            virusTotalResponse.status ===
              403
          ) {
            threatIntel = {
              used: true,

              available: false,

              reportFound: false,

              source:
                "VirusTotal",

              message:
                "VirusTotal authentication failed. Check your API key.",
            };
          } else {
            threatIntel = {
              used: true,

              available: false,

              reportFound: false,

              source:
                "VirusTotal",

              message:
                `VirusTotal returned HTTP ${virusTotalResponse.status}.`,
            };
          }
        }
      } catch (error) {
        console.error(
          "VirusTotal URL error:",
          error.message
        );

        threatIntel = {
          used: true,

          available: false,

          reportFound: false,

          source:
            "VirusTotal",

          message:
            "VirusTotal connection failed. CyberShield's own analysis was still completed.",
        };
      }
    } else if (
      needsVirusTotal &&
      !apiKey
    ) {
      threatIntel = {
        used: false,

        available: false,

        reportFound: false,

        reason:
          "CyberShield did not have enough information for a confident assessment, but VirusTotal verification is not configured.",
      };
    }

    /* ---------------------------------------------
       8. Return CyberShield result
    --------------------------------------------- */

    return res.json({
      status: "success",

      success: true,

      url:
        result.url,

      riskScore:
        result.score,

      riskLevel:
        result.level,

      warnings:
        result.warnings || [],

      positiveChecks:
        result.positiveChecks || [],

      findings:
        result.findings || [],

      riskAdjustments:
        result.riskAdjustments || [],

      scoreCapped:
        result.scoreCapped || false,

      analysis:
        result.analysis || {},

      domain:
        result.domain || {},

      typosquatting:
        result.typosquatting || {},

      redirects:
        result.redirects || {},

      informationQuality: {
        score:
          informationScore,

        enoughInformation,

        virusTotalUsed:
          threatIntel.used,
      },

      threatIntel,

      message:
        result.recommendation ||
        "URL analysis completed.",

      disclaimer:
        result.disclaimer ||
        "This is a preliminary risk assessment and does not guarantee that a website is completely safe.",
    });
  } catch (error) {
    console.error(
      "URL CHECK ERROR:",
      error
    );

    return res.status(500).json({
      status: "error",

      message:
        "An error occurred while analyzing the URL.",
    });
  }
});

/* =====================================================
   FILE ANALYSIS
===================================================== */

const suspiciousExtensions = [
  ".exe",
  ".scr",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".dll",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".wsf",
  ".wsh",
  ".ps1",
  ".psm1",
  ".hta",
  ".jar",
  ".reg",
];

const commonSafeExtensions = [
  ".txt",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".mp3",
  ".wav",
  ".mp4",
  ".avi",
  ".mov",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

function analyzeFile(file) {
  let riskScore = 0;
  const riskBreakdown = [];
 
 const warnings = [];

  const checksPassed = [];

  const originalName =
    file.originalname;

  const lowerName =
    originalName.toLowerCase();

  const extension =
    path.extname(lowerName);

      /* ACTUAL FILE SIGNATURE */

  function detectFileType(buffer) {
    if (
      buffer.length >= 4 &&
      buffer.slice(0, 4).toString() === "%PDF"
    ) {
      return ".pdf";
    }

    if (
      buffer.length >= 8 &&
      buffer
        .slice(0, 8)
        .equals(
          Buffer.from([
            0x89, 0x50, 0x4e, 0x47,
            0x0d, 0x0a, 0x1a, 0x0a,
          ])
        )
    ) {
      return ".png";
    }

    if (
      buffer.length >= 3 &&
      buffer
        .slice(0, 3)
        .equals(
          Buffer.from([
            0xff, 0xd8, 0xff,
          ])
        )
    ) {
      return ".jpg";
    }

    if (
      buffer.length >= 6 &&
      (
        buffer.slice(0, 6).toString() === "GIF87a" ||
        buffer.slice(0, 6).toString() === "GIF89a"
      )
    ) {
      return ".gif";
    }

    if (
      buffer.length >= 4 &&
      buffer
        .slice(0, 4)
        .equals(
          Buffer.from([
            0x50, 0x4b, 0x03, 0x04,
          ])
        )
    ) {
      return "ZIP-based container";
    }

    if (
      buffer.length >= 2 &&
      buffer.slice(0, 2).toString() === "MZ"
    ) {
      return ".exe";
    }

    if (
      buffer.length >= 4 &&
      buffer
        .slice(0, 4)
        .equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))
    ) {
      return "ELF executable";
    }

    if (
      buffer.length >= 4 &&
      ["feedface", "cefaedfe", "feedfacf", "cffaedfe", "cafebabe"].includes(
        buffer.slice(0, 4).toString("hex")
      )
    ) {
      return "Mach-O executable";
    }

    return null;
  }

  const detectedType =
    detectFileType(file.buffer);

  const contentAnalysis =
    analyzeFileContent(file.buffer, detectedType);

  riskScore += contentAnalysis.riskBreakdown.reduce(
    (total, finding) => total + finding.points,
    0
  );
  riskBreakdown.push(...contentAnalysis.riskBreakdown);
  warnings.push(...contentAnalysis.warnings);
  checksPassed.push(...contentAnalysis.checksPassed);

  /* FILE NAME */

  checksPassed.push(
    "File name successfully analyzed"
  );

  /* FILE SIZE */

  const sizeInMB =
    file.size /
    (1024 * 1024);

  if (sizeInMB > 25) {
    riskScore += 10;
    riskBreakdown.push({
      reason: "File is larger than 25 MB",
      points: 10
    });

    warnings.push(
      "File is larger than 25 MB"
    );
  } else {
    checksPassed.push(
      "File size is within the normal range"
    );
  }

  /* FILE EXTENSION */

  if (
    suspiciousExtensions.includes(
      extension
    )
  ) {
    riskScore += 40;

    riskBreakdown.push({
  reason: "Suspicious file extension",
  points: 40
});

    warnings.push(
      `Potentially dangerous file extension detected: ${extension}`
    );
  } else if (
    commonSafeExtensions.includes(
      extension
    )
  ) {
    checksPassed.push(
      `Common file extension detected: ${extension}`
    );
  } else {
    riskScore += 10;
    riskBreakdown.push({
      reason: "Unrecognized file extension",
      points: 10
    });

    warnings.push(
      `Unrecognized file extension: ${
        extension || "none"
      }`
    );
  }

  /* DOUBLE EXTENSION */

  const doubleExtensionPattern =
    /\.(pdf|doc|docx|jpg|jpeg|png|txt|xls|xlsx)\.(exe|scr|bat|cmd|js|vbs|msi)$/i;

  if (
    doubleExtensionPattern.test(
      lowerName
    )
  ) {
    riskScore += 35;
    riskBreakdown.push({
  reason: "Double extension detected",
  points: 35
});

    warnings.push(
      "Suspicious double file extension detected"
    );
  }
  /* FILE TYPE / EXTENSION MATCH */

if (detectedType) {
  if (
    extension === detectedType ||
    (detectedType === ".jpg" && extension === ".jpeg")
  ) {
    checksPassed.push(
      `File signature matches extension: ${detectedType}`
    );
  } else if (
    detectedType === "ZIP-based container" &&
    [".zip", ".docx", ".xlsx", ".pptx"].includes(extension)
  ) {
    checksPassed.push(
      "File signature matches a ZIP-based container"
    );
  } else {
    riskScore += 25;
    riskBreakdown.push({
  reason: "File signature does not match extension",
  points: 25
});

    warnings.push(
      `File content appears to be ${detectedType}, but the filename uses ${
        extension || "no extension"
      } extension.`
    );
  }
} else {
  warnings.push(
    "The file type could not be identified from its signature."
  );
}

  /* HIDDEN FILE */

  if (
    lowerName.startsWith(".")
  ) {
    riskScore += 10;
    riskBreakdown.push({
      reason: "Hidden file name",
      points: 10
    });

    warnings.push(
      "File name begins with a dot"
    );
  }

  riskScore =
    Math.min(
      riskScore,
      100
    );

  let riskLevel = "LOW";

  if (riskScore >= 60) {
    riskLevel = "HIGH";
  } else if (
    riskScore >= 30
  ) {
    riskLevel = "MEDIUM";
  }

  /* SHA-256 */

  const sha256 =
    crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

  return {
    fileName:
      originalName,

    fileSize:
      file.size,

    fileSizeMB:
      Number(
        sizeInMB.toFixed(2)
      ),

    extension:
      extension ||
      "No extension",

      detectedType:
  detectedType ||
  "Unknown",

    sha256,

    riskScore,

    riskBreakdown,

    riskLevel,

    warnings,

    checksPassed,
  };
}

/* =====================================================
   FILE CHECK API
===================================================== */

app.post(
  "/api/file-check",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",

          message:
            "Please select a file to analyze.",
        });
      }

      console.log(
        "File received:",
        req.file.originalname
      );

      /* LOCAL ANALYSIS */

      const analysis =
        analyzeFile(req.file);

      /* ---------------------------------------------
         VirusTotal file hash lookup
      --------------------------------------------- */

      const apiKey =
        process.env.VIRUSTOTAL_API_KEY;

      let threatIntel = {
        available: false,

        reportFound: false,

        message:
          "VirusTotal API key is not configured.",
      };

      if (apiKey) {
        try {
          const virusTotalResponse =
            await fetch(
              `https://www.virustotal.com/api/v3/files/${analysis.sha256}`,
              {
                method: "GET",

                headers: {
                  "x-apikey":
                    apiKey,

                  Accept:
                    "application/json",
                },
              }
            );

          /* REPORT FOUND */

          if (
            virusTotalResponse.ok
          ) {
            const virusTotalData =
              await virusTotalResponse.json();

            const attributes =
              virusTotalData
                .data
                ?.attributes || {};

            const stats =
              attributes
                .last_analysis_stats ||
              {};

            const malicious =
              stats.malicious || 0;

            const suspicious =
              stats.suspicious || 0;

            const harmless =
              stats.harmless || 0;

            const undetected =
              stats.undetected || 0;

            let finalRiskScore =
              analysis.riskScore;

            if (
              malicious > 0
            ) {
              finalRiskScore =
                Math.max(
                  finalRiskScore,
                  80
                );
            } else if (
              suspicious > 0
            ) {
              finalRiskScore =
                Math.max(
                  finalRiskScore,
                  60
                );
            }

            finalRiskScore =
              Math.min(
                finalRiskScore,
                100
              );

            let finalRiskLevel =
              "LOW";

            if (
              finalRiskScore >= 60
            ) {
              finalRiskLevel =
                "HIGH";
            } else if (
              finalRiskScore >= 30
            ) {
              finalRiskLevel =
                "MEDIUM";
            }

            let message;

            if (
              malicious > 0
            ) {
              message =
                "VirusTotal reported malicious detections for this file hash.";
            } else if (
              suspicious > 0
            ) {
              message =
                "VirusTotal reported suspicious detections for this file hash.";
            } else {
              message =
                "No malicious or suspicious detections were reported in the available VirusTotal analysis.";
            }

            threatIntel = {
              available: true,

              reportFound: true,

              malicious,

              suspicious,

              harmless,

              undetected,

              message,
            };

            return res.json({
              status: "success",

              success: true,

              message:
                "File analysis completed.",

              analysis: {
                ...analysis,

                riskScore:
                  finalRiskScore,

                riskLevel:
                  finalRiskLevel,
              },

              threatIntel,

              disclaimer:
                "This is a preliminary file risk assessment. A VirusTotal result reflects the available report for this hash and does not guarantee that a file is completely safe.",
            });
          }

          /* NO REPORT */

          if (
            virusTotalResponse.status ===
            404
          ) {
            threatIntel = {
              available: true,

              reportFound: false,

              message:
                "No existing VirusTotal report was found for this file hash.",
            };
          } else if (
            virusTotalResponse.status ===
            429
          ) {
            threatIntel = {
              available: false,

              reportFound: false,

              message:
                "VirusTotal rate limit was reached. Local file analysis was still completed.",
            };
          } else if (
            virusTotalResponse.status ===
              401 ||
            virusTotalResponse.status ===
              403
          ) {
            threatIntel = {
              available: false,

              reportFound: false,

              message:
                "VirusTotal API authentication failed. Check your VIRUSTOTAL_API_KEY.",
            };
          } else {
            threatIntel = {
              available: false,

              reportFound: false,

              message:
                `VirusTotal returned HTTP ${virusTotalResponse.status}.`,
            };
          }
        } catch (error) {
          console.error(
            "VirusTotal file lookup error:",
            error.message
          );

          threatIntel = {
            available: false,

            reportFound: false,

            message:
              "VirusTotal could not be reached. Local file analysis was still completed.",
          };
        }
      }

      /* ---------------------------------------------
         Return local analysis
      --------------------------------------------- */

      return res.json({
        status: "success",

        success: true,

        message:
          "File analysis completed.",

        analysis,

        threatIntel,

        disclaimer:
          "This is a preliminary file risk assessment. It does not guarantee that a file is completely safe.",
      });
    } catch (error) {
      console.error(
        "FILE CHECK ERROR:",
        error
      );

      return res.status(500).json({
        status: "error",

        message:
          "Something went wrong while analyzing the file.",
      });
    }
  }
);

/* =====================================================
   DIGITAL FOOTPRINT ANALYSIS
===================================================== */

function analyzeDigitalFootprint({
  username,
  email,
  fullName,
  phone,
}) {
  let riskScore = 0;

  const warnings = [];

  const checksPassed = [];

  /* ---------------------------------------------
     USERNAME
  --------------------------------------------- */

  if (username) {
    const cleanUsername =
      username.trim();

    checksPassed.push(
      "Username format analyzed"
    );

    if (
      cleanUsername.length < 4
    ) {
      riskScore += 15;

      warnings.push(
        "Username is very short and may be easy to associate with other accounts."
      );
    }

    if (
      /\d{2,}/.test(
        cleanUsername
      )
    ) {
      riskScore += 5;

      warnings.push(
        "Username contains multiple numbers."
      );
    }

    if (
      /admin|administrator|root|official|support/i.test(
        cleanUsername
      )
    ) {
      riskScore += 10;

      warnings.push(
        "Username contains a privileged or official-looking term."
      );
    }
  } else {
    checksPassed.push(
      "No username was provided."
    );
  }

  /* ---------------------------------------------
     EMAIL
  --------------------------------------------- */

  if (email) {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      riskScore += 20;

      warnings.push(
        "The email address format appears invalid."
      );
    } else {
      checksPassed.push(
        "Email format is valid"
      );

      const emailParts =
        cleanEmail.split("@");

      const localPart =
        emailParts[0];

      const domain =
        emailParts[1];

      if (
        /\d{4}/.test(
          localPart
        )
      ) {
        riskScore += 5;

        warnings.push(
          "Email username contains a four-digit number that may represent personal information."
        );
      }

      const commonProviders = [
        "gmail.com",
        "outlook.com",
        "hotmail.com",
        "yahoo.com",
        "icloud.com",
        "proton.me",
        "protonmail.com",
      ];

      if (
        commonProviders.includes(
          domain
        )
      ) {
        checksPassed.push(
          "Email uses a common public email provider"
        );
      } else {
        riskScore += 5;

        warnings.push(
          "Email uses a custom or less common domain."
        );
      }
    }
  } else {
    checksPassed.push(
      "No email address was provided."
    );
  }

  /* ---------------------------------------------
     FULL NAME
  --------------------------------------------- */

  if (fullName) {
    const cleanName =
      fullName.trim();

    checksPassed.push(
      "Name information analyzed"
    );

    const nameParts =
      cleanName.split(
        /\s+/
      );

    if (
      nameParts.length >= 2
    ) {
      riskScore += 5;

      warnings.push(
        "A full name was provided. Combining a full name with other public information can increase digital exposure."
      );
    }
  } else {
    checksPassed.push(
      "No full name was provided."
    );
  }

  /* ---------------------------------------------
     PHONE
  --------------------------------------------- */

  if (phone) {
    const cleanPhone =
      phone.replace(
        /\D/g,
        ""
      );

    if (
      cleanPhone.length < 7
    ) {
      riskScore += 20;

      warnings.push(
        "The phone number appears too short."
      );
    } else {
      riskScore += 10;

      warnings.push(
        "A phone number was provided. Phone numbers can be sensitive personal information."
      );

      checksPassed.push(
        "Phone number format analyzed"
      );
    }
  } else {
    checksPassed.push(
      "No phone number was provided."
    );
  }

  /* ---------------------------------------------
     COMBINATION OF IDENTIFIERS
  --------------------------------------------- */

  const suppliedFields = [
    username,
    email,
    fullName,
    phone,
  ].filter(Boolean).length;

  if (
    suppliedFields >= 3
  ) {
    riskScore += 15;

    warnings.push(
      "Multiple personal identifiers were provided together, which can increase privacy exposure."
    );
  }

  riskScore =
    Math.min(
      riskScore,
      100
    );

  let riskLevel =
    "LOW";

  if (
    riskScore >= 60
  ) {
    riskLevel =
      "HIGH";
  } else if (
    riskScore >= 30
  ) {
    riskLevel =
      "MEDIUM";
  }

  let assessment;

  if (
    riskLevel === "HIGH"
  ) {
    assessment =
      "The information provided contains several privacy exposure indicators. Consider reducing the amount of personal information publicly associated with your online accounts.";
  } else if (
    riskLevel === "MEDIUM"
  ) {
    assessment =
      "Some privacy exposure indicators were detected. Review what personal information is publicly associated with your online accounts.";
  } else {
    assessment =
      "No major privacy exposure indicators were detected by the current checks.";
  }

  return {
    riskScore,

    riskLevel,

    warnings,

    checksPassed,

    assessment,

    fieldsAnalyzed: {
      username:
        Boolean(username),

      email:
        Boolean(email),

      fullName:
        Boolean(fullName),

      phone:
        Boolean(phone),
    },
  };
}

/* =====================================================
   DIGITAL FOOTPRINT API
===================================================== */

app.post(
  "/api/digital-footprint",
  async (req, res) => {
    try {
      const {
        username = "",
        email = "",
        fullName = "",
        phone = "",
      } = req.body;

      const hasInformation =
        username ||
        email ||
        fullName ||
        phone;

      if (!hasInformation) {
        return res.status(400).json({
          status: "error",
          message:
            "Please provide at least one piece of information to analyze.",
        });
      }

      const analysis =
        await analyzeFootprint({
          username,
          email,
          fullName,
          phone,
        });

      return res.json({
        status: "success",
        success: true,
        message:
          "Digital footprint analysis completed.",
        analysis,
        disclaimer:
          "This scan checks configured public profile URLs and basic privacy indicators. A detected profile URL does not confirm that the account belongs to the person being checked.",
      });

    } catch (error) {
      console.error(
        "DIGITAL FOOTPRINT ERROR:",
        error
      );

      return res.status(500).json({
        status: "error",
        message:
          "Something went wrong while analyzing the digital footprint.",
      });
    }
  }
);
/* =====================================================
   MONGODB CONNECTION
===================================================== */

async function connectMongoDB() {

  /*
   * Supports BOTH names:
   *
   * MONGODB_URI
   * MONGO_URI
   *
   * Recommended:
   * MONGODB_URI
   */

  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

  if (!mongoURI) {
    console.log(
      "MONGODB_URI/MONGO_URI not configured."
    );

    console.log(
      "Starting backend without MongoDB."
    );

    return;
  }

  try {
    await mongoose.connect(
      mongoURI
    );

    console.log(
      "MongoDB connected successfully."
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    console.log(
      "Backend will continue running without MongoDB."
    );
  }
}

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "GLOBAL ERROR:",
      error.message
    );

    if (
      error.message ===
      "Not allowed by CORS"
    ) {
      return res.status(403).json({
        status: "error",

        message:
          "Request blocked by CORS policy.",
      });
    }

    /* Multer file-size error */

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        status: "error",

        message:
          "File is too large. Maximum size is 50 MB.",
      });
    }

    return res.status(500).json({
      status: "error",

      message:
        "Internal server error.",
    });
  }
);

/* =====================================================
   START SERVER
===================================================== */

async function startServer() {

  /*
   * Start Express FIRST.
   *
   * Important for Render.
   */

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `CyberShield backend running on port ${PORT}`
      );

      console.log(
        `Frontend allowed: ${FRONTEND_URL}`
      );
    }
  );

  /*
   * Connect MongoDB separately.
   *
   * MongoDB failure does not stop
   * the Express server.
   */

  await connectMongoDB();
}

startServer();
