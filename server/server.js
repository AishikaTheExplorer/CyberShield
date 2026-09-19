const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;


/* =====================================================
   FILE UPLOAD
===================================================== */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024
  }
});


/* =====================================================
   HOME
===================================================== */

app.get("/", (req, res) => {
  res.json({
    message: "CyberShield Backend is running!"
  });
});


/* =====================================================
   URL ANALYSIS
===================================================== */

function performBasicURLAnalysis(url) {

  let riskScore = 0;

  const warnings = [];
  const positiveChecks = [];

  let parsedURL;

  try {
    parsedURL = new URL(url.trim());
  } catch (error) {
    return {
      riskScore: 100,
      riskLevel: "HIGH",
      warnings: ["Invalid URL format"],
      positiveChecks: []
    };
  }


  /* HTTPS */

  if (parsedURL.protocol === "https:") {

    positiveChecks.push(
      "HTTPS connection detected"
    );

  } else {

    riskScore += 20;

    warnings.push(
      "Website is not using HTTPS"
    );
  }


  /* IP ADDRESS */

  const ipPattern =
    /^(?:\d{1,3}\.){3}\d{1,3}$/;

  if (ipPattern.test(parsedURL.hostname)) {

    riskScore += 25;

    warnings.push(
      "URL uses an IP address instead of a normal domain name"
    );

  } else {

    positiveChecks.push(
      "Normal domain structure detected"
    );
  }


  /* URL LENGTH */

  if (url.length > 150) {

    riskScore += 15;

    warnings.push(
      "URL is unusually long"
    );
  }


  /* @ SYMBOL */

  if (url.includes("@")) {

    riskScore += 20;

    warnings.push(
      "URL contains an @ symbol"
    );
  }


  /* SUSPICIOUS KEYWORDS */

  const suspiciousKeywords = [
    "login",
    "verify",
    "verification",
    "password",
    "account",
    "secure",
    "update",
    "bank",
    "payment",
    "signin"
  ];

  const foundKeywords =
    suspiciousKeywords.filter((keyword) =>
      url.toLowerCase().includes(keyword)
    );

  if (foundKeywords.length >= 2) {

    riskScore += 20;

    warnings.push(
      `URL contains suspicious keywords: ${foundKeywords.join(", ")}`
    );
  }


  /* MANY SUBDOMAINS */

  const hostnameParts =
    parsedURL.hostname.split(".");

  if (hostnameParts.length > 4) {

    riskScore += 15;

    warnings.push(
      "Domain contains an unusually large number of subdomains"
    );
  }


  riskScore =
    Math.min(riskScore, 100);


  let riskLevel = "LOW";

  if (riskScore > 60) {

    riskLevel = "HIGH";

  } else if (riskScore > 30) {

    riskLevel = "MEDIUM";
  }


  return {
    riskScore,
    riskLevel,
    warnings,
    positiveChecks
  };
}


/* =====================================================
   URL SAFETY CHECKER
===================================================== */

app.post("/api/url-check", async (req, res) => {

  try {

    const { url } = req.body;

    if (!url || !url.trim()) {

      return res.status(400).json({
        status: "error",
        message: "Please enter a URL."
      });
    }


    let parsedURL;

    try {

      parsedURL =
        new URL(url.trim());

    } catch (error) {

      return res.status(400).json({
        status: "error",
        message: "Please enter a valid URL."
      });
    }


    const basicAnalysis =
      performBasicURLAnalysis(
        parsedURL.href
      );


    /* =================================================
       VIRUSTOTAL URL
    ================================================= */

    const apiKey =
      process.env.VIRUSTOTAL_API_KEY;

    let threatIntel = {

      available: false,

      reportFound: false,

      message:
        "VirusTotal API key is not configured."

    };


    if (apiKey) {

      try {

        const urlId =
          Buffer.from(parsedURL.href)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");


        const virusTotalResponse =
          await fetch(
            `https://www.virustotal.com/api/v3/urls/${urlId}`,
            {
              method: "GET",

              headers: {
                "x-apikey": apiKey
              }
            }
          );


        if (virusTotalResponse.ok) {

          const virusTotalData =
            await virusTotalResponse.json();

          const attributes =
            virusTotalData.data?.attributes || {};

          const stats =
            attributes.last_analysis_stats || {};


          const malicious =
            stats.malicious || 0;

          const suspicious =
            stats.suspicious || 0;

          const harmless =
            stats.harmless || 0;

          const undetected =
            stats.undetected || 0;


          let finalRiskScore =
            basicAnalysis.riskScore;


          if (malicious > 0) {

            finalRiskScore =
              Math.max(
                finalRiskScore,
                80
              );

          } else if (suspicious > 0) {

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


          if (finalRiskScore > 60) {

            finalRiskLevel =
              "HIGH";

          } else if (finalRiskScore > 30) {

            finalRiskLevel =
              "MEDIUM";
          }


          threatIntel = {

            available: true,

            reportFound: true,

            malicious,

            suspicious,

            harmless,

            undetected,

            message:
              malicious > 0
                ? "VirusTotal reported malicious detections."
                : suspicious > 0
                ? "VirusTotal reported suspicious detections."
                : "No malicious or suspicious detections were reported in the available VirusTotal analysis."
          };


          return res.json({

            status: "success",

            url: parsedURL.href,

            riskScore:
              finalRiskScore,

            riskLevel:
              finalRiskLevel,

            warnings:
              basicAnalysis.warnings,

            positiveChecks:
              basicAnalysis.positiveChecks,

            threatIntel,

            message:
              finalRiskLevel === "HIGH"
                ? "The URL has significant risk indicators."
                : finalRiskLevel === "MEDIUM"
                ? "The URL has some suspicious indicators."
                : "No major suspicious indicators were detected by the current checks.",

            disclaimer:
              "This is a preliminary risk assessment and does not guarantee that a website is completely safe."
          });
        }


        if (
          virusTotalResponse.status === 404
        ) {

          threatIntel = {

            available: true,

            reportFound: false,

            message:
              "No existing VirusTotal report was found for this URL."
          };

        } else if (
          virusTotalResponse.status === 429
        ) {

          threatIntel = {

            available: false,

            reportFound: false,

            message:
              "VirusTotal rate limit was reached. Basic URL analysis was still completed."
          };

        } else if (
          virusTotalResponse.status === 401 ||
          virusTotalResponse.status === 403
        ) {

          threatIntel = {

            available: false,

            reportFound: false,

            message:
              "VirusTotal API authentication failed. Check your API key."
          };

        } else {

          threatIntel = {

            available: false,

            reportFound: false,

            message:
              `VirusTotal returned HTTP ${virusTotalResponse.status}.`
          };
        }

      } catch (error) {

        console.log(
          "VirusTotal URL error:",
          error.message
        );

        threatIntel = {

          available: false,

          reportFound: false,

          message:
            "VirusTotal connection failed. Basic URL analysis was still performed."
        };
      }
    }


    return res.json({

      status: "success",

      url: parsedURL.href,

      riskScore:
        basicAnalysis.riskScore,

      riskLevel:
        basicAnalysis.riskLevel,

      warnings:
        basicAnalysis.warnings,

      positiveChecks:
        basicAnalysis.positiveChecks,

      threatIntel,

      message:
        basicAnalysis.riskLevel === "HIGH"
          ? "The URL has significant risk indicators."
          : basicAnalysis.riskLevel === "MEDIUM"
          ? "The URL has some suspicious indicators."
          : "No major suspicious indicators were detected by the basic checks.",

      disclaimer:
        "This is a preliminary risk assessment. It does not guarantee that a website is completely safe."
    });


  } catch (error) {

    console.error(
      "URL check error:",
      error
    );

    res.status(500).json({

      status: "error",

      message:
        "Something went wrong while checking the URL."
    });
  }
});


/* =====================================================
   SAFE DOWNLOAD CHECKER
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
  ".reg"

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
  ".pptx"

];


function analyzeFile(file) {

  let riskScore = 0;

  const warnings = [];
  const checksPassed = [];


  const originalName =
    file.originalname;

  const lowerName =
    originalName.toLowerCase();

  const extension =
    path.extname(lowerName);


  /* FILE NAME */

  checksPassed.push(
    "File name successfully analyzed"
  );


  /* FILE SIZE */

  const sizeInMB =
    file.size / (1024 * 1024);


  if (sizeInMB > 25) {

    riskScore += 10;

    warnings.push(
      "File is larger than 25 MB"
    );

  } else {

    checksPassed.push(
      "File size is within the normal range"
    );
  }


  /* EXTENSION */

  if (
    suspiciousExtensions.includes(
      extension
    )
  ) {

    riskScore += 40;

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

    warnings.push(
      `Unrecognized file extension: ${extension || "none"}`
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

    warnings.push(
      "Suspicious double file extension detected"
    );
  }


  /* HIDDEN FILE */

  if (
    lowerName.startsWith(".")
  ) {

    riskScore += 10;

    warnings.push(
      "File name begins with a dot"
    );
  }


  riskScore =
    Math.min(
      riskScore,
      100
    );


  let riskLevel =
    "LOW";


  if (riskScore > 60) {

    riskLevel =
      "HIGH";

  } else if (riskScore > 30) {

    riskLevel =
      "MEDIUM";
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
      Number(sizeInMB.toFixed(2)),

    extension:
      extension || "No extension",

    sha256,

    riskScore,

    riskLevel,

    warnings,

    checksPassed
  };
}


/* =====================================================
   FILE CHECK + VIRUSTOTAL HASH LOOKUP
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
            "Please select a file to analyze."
        });
      }


      console.log(
        "File received:",
        req.file.originalname
      );


      /* LOCAL ANALYSIS */

      const analysis =
        analyzeFile(req.file);


      /* =================================================
         VIRUSTOTAL HASH LOOKUP
      ================================================= */

      const apiKey =
        process.env.VIRUSTOTAL_API_KEY;


      let threatIntel = {

        available: false,

        reportFound: false,

        message:
          "VirusTotal API key is not configured."
      };


      if (apiKey) {

        try {

          console.log(
            "Checking VirusTotal file hash..."
          );


          const virusTotalResponse =
            await fetch(
              `https://www.virustotal.com/api/v3/files/${analysis.sha256}`,
              {
                method: "GET",

                headers: {
                  "x-apikey": apiKey
                }
              }
            );


          /* REPORT FOUND */

          if (virusTotalResponse.ok) {

            const virusTotalData =
              await virusTotalResponse.json();


            const attributes =
              virusTotalData.data?.attributes || {};


            const stats =
              attributes.last_analysis_stats || {};


            const malicious =
              stats.malicious || 0;

            const suspicious =
              stats.suspicious || 0;

            const harmless =
              stats.harmless || 0;

            const undetected =
              stats.undetected || 0;


            /* ADJUST SCORE */

            let finalRiskScore =
              analysis.riskScore;


            if (malicious > 0) {

              finalRiskScore =
                Math.max(
                  finalRiskScore,
                  80
                );

            } else if (suspicious > 0) {

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


            /* FINAL LEVEL */

            let finalRiskLevel =
              "LOW";


            if (finalRiskScore > 60) {

              finalRiskLevel =
                "HIGH";

            } else if (finalRiskScore > 30) {

              finalRiskLevel =
                "MEDIUM";
            }


            /* MESSAGE */

            let message;


            if (malicious > 0) {

              message =
                "VirusTotal reported malicious detections for this file hash.";

            } else if (suspicious > 0) {

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

              message
            };


            return res.json({

              status: "success",

              message:
                "File analysis completed.",

              analysis: {

                ...analysis,

                riskScore:
                  finalRiskScore,

                riskLevel:
                  finalRiskLevel
              },

              threatIntel,

              disclaimer:
                "This is a preliminary file risk assessment. A VirusTotal result reflects the available report for this hash and does not guarantee that a file is completely safe."
            });
          }


          /* REPORT NOT FOUND */

          if (
            virusTotalResponse.status === 404
          ) {

            threatIntel = {

              available: true,

              reportFound: false,

              message:
                "No existing VirusTotal report was found for this file hash."
            };
          }


          /* RATE LIMIT */

          else if (
            virusTotalResponse.status === 429
          ) {

            threatIntel = {

              available: false,

              reportFound: false,

              message:
                "VirusTotal rate limit was reached. Local file analysis was still completed."
            };
          }


          /* AUTH ERROR */

          else if (
            virusTotalResponse.status === 401 ||
            virusTotalResponse.status === 403
          ) {

            threatIntel = {

              available: false,

              reportFound: false,

              message:
                "VirusTotal API authentication failed. Check your VIRUSTOTAL_API_KEY."
            };
          }


          /* OTHER ERROR */

          else {

            threatIntel = {

              available: false,

              reportFound: false,

              message:
                `VirusTotal returned HTTP ${virusTotalResponse.status}.`
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
              "VirusTotal could not be reached. Local file analysis was still completed."
          };
        }
      }


      /* RETURN LOCAL RESULT */

      return res.json({

        status: "success",

        message:
          "File analysis completed.",

        analysis,

        threatIntel,

        disclaimer:
          "This is a preliminary file risk assessment. It does not guarantee that a file is completely safe."
      });


    } catch (error) {

      console.error(
        "File analysis error:",
        error
      );


      res.status(500).json({

        status: "error",

        message:
          "Something went wrong while analyzing the file."
      });
    }
  }
);


/* =====================================================
   DIGITAL FOOTPRINT CHECKER
===================================================== */

function analyzeDigitalFootprint({
  username,
  email,
  fullName,
  phone
}) {

  let riskScore = 0;

  const warnings = [];
  const checksPassed = [];


  /* USERNAME */

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
      /\d{2,}/.test(cleanUsername)
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


  /* EMAIL */

  if (email) {

    const cleanEmail =
      email.trim().toLowerCase();


    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      !emailPattern.test(cleanEmail)
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
        /\d{4}/.test(localPart)
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
        "protonmail.com"

      ];


      if (
        commonProviders.includes(domain)
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


  /* FULL NAME */

  if (fullName) {

    const cleanName =
      fullName.trim();


    checksPassed.push(
      "Name information analyzed"
    );


    const nameParts =
      cleanName.split(/\s+/);


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


  /* PHONE */

  if (phone) {

    const cleanPhone =
      phone.replace(/\D/g, "");


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


  /* COMBINATION */

  const suppliedFields = [

    username,
    email,
    fullName,
    phone

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
    riskScore > 60
  ) {

    riskLevel =
      "HIGH";

  } else if (
    riskScore > 30
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

      username: Boolean(username),

      email: Boolean(email),

      fullName: Boolean(fullName),

      phone: Boolean(phone)
    }
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
        username,
        email,
        fullName,
        phone
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
            "Please provide at least one piece of information to analyze."
        });
      }


      const analysis =
        analyzeDigitalFootprint({

          username,
          email,
          fullName,
          phone
        });


      res.json({

        status: "success",

        message:
          "Digital footprint analysis completed.",

        analysis,

        disclaimer:
          "This analysis is based only on the information entered and basic privacy indicators. It does not confirm that the information appears on public websites or in a data breach."
      });


    } catch (error) {

      console.error(
        "Digital footprint error:",
        error
      );


      res.status(500).json({

        status: "error",

        message:
          "Something went wrong while analyzing the digital footprint."
      });
    }
  }
);


/* =====================================================
   MONGODB
===================================================== */

mongoose
  .connect(process.env.MONGO_URI)

  .then(() => {

    console.log(
      "MongoDB connected successfully"
    );


    app.listen(
       "0.0.0.0",
      PORT,
      () => {

        console.log(
          `CyberShield server running on port ${PORT}`
        );
      }
    );

  })

  .catch((error) => {

    console.error(
      "MongoDB connection failed:",
      error.message
    );

  });
