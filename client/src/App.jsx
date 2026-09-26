import { useState } from "react";
import axios from "axios";
import heroImage from "./assets/hero.png";
import "./App.css";

function App() {

  /* =================================================
     URL
  ================================================= */

  const [url, setUrl] =
    useState("https://example.com");

  const [urlResult, setUrlResult] =
    useState(null);


  /* =================================================
     FILE
  ================================================= */

  const [fileResult, setFileResult] =
    useState(null);

  const [selectedFile, setSelectedFile] =
    useState(null);


  /* =================================================
     DIGITAL FOOTPRINT
  ================================================= */

  const [footprintResult, setFootprintResult] =
    useState(null);

  const [footprintData, setFootprintData] =
    useState({
      username: "",
      email: "",
      fullName: "",
      phone: ""
    });


  /* =================================================
     BACKEND
  ================================================= */

  const [backendStatus, setBackendStatus] =
    useState("");


  /* =================================================
     URL CHECKER
  ================================================= */

  const openURLChecker = () => {

    setUrlResult({
      open: true
    });

  };


  const checkURL = async () => {

    if (!url.trim()) {

      setUrlResult({

        open: true,

        status: "error",

        message:
          "Please enter a URL."
      });

      return;
    }


    setUrlResult({

      open: true,

      loading: true
    });


    try {

      const response =
        await axios.post(
          "https://cybershield-zdsb.onrender.com/api/url-check",
          {
            url: url.trim()
          }
        );


      setUrlResult({

        open: true,

        ...response.data
      });


    } catch (error) {

      console.error(
        "URL check error:",
        error
      );


      setUrlResult({

        open: true,

        status: "error",

        message:
          error.response?.data?.message ||
          "Unable to connect to CyberShield backend."
      });

    }
  };


  const closeURLChecker = () => {

    setUrlResult(null);

  };


  /* =================================================
     FILE CHECKER
  ================================================= */

  const openFileChecker = () => {

    setFileResult({
      open: true
    });

  };


  const handleFileSelect = (event) => {

    const file =
      event.target.files[0];


    if (!file) {
      return;
    }


    setSelectedFile(file);


    setFileResult({

      open: true,

      status: "selected",

      message:
        "File selected. Click Analyze File."
    });

  };


  const checkFile = async () => {

    if (!selectedFile) {

      setFileResult({

        open: true,

        status: "error",

        message:
          "Please select a file first."
      });

      return;
    }


    setFileResult({

      open: true,

      loading: true
    });


    try {

      const formData =
        new FormData();


      formData.append(
        "file",
        selectedFile
      );


      const response =
        await axios.post(
          "https://cybershield-zdsb.onrender.com/api/file-check",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data"
            }
          }
        );


      setFileResult({

        open: true,

        ...response.data
      });


    } catch (error) {

      console.error(
        "File check error:",
        error
      );


      setFileResult({

        open: true,

        status: "error",

        message:
          error.response?.data?.message ||
          "Unable to analyze the file."
      });

    }
  };


  const closeFileChecker = () => {

    setFileResult(null);

    setSelectedFile(null);

  };


  /* =================================================
     DIGITAL FOOTPRINT
  ================================================= */

  const openFootprintChecker = () => {

    setFootprintResult({
      open: true
    });

  };


  const updateFootprintField = (
    field,
    value
  ) => {

    setFootprintData((previousData) => ({
      ...previousData,
      [field]: value
    }));

  };

  const checkFootprint = async () => {

    const hasInformation =
      Object.values(
        footprintData
      ).some(
        (value) =>
          value.trim() !== ""
      );


    if (!hasInformation) {

      setFootprintResult({

        open: true,

        status: "error",

        message:
          "Please enter at least one piece of information."
      });

      return;
    }


    setFootprintResult({

      open: true,

      loading: true
    });


    try {

      const response =
        await axios.post(
          "https://cybershield-zdsb.onrender.com/api/digital-footprint",
          footprintData,
          { timeout: 9000 }
        );


      setFootprintResult({

        open: true,

        ...response.data
      });


    } catch (error) {

      console.error(
        "Digital footprint error:",
        error
      );


      setFootprintResult({

        open: true,

        status: "error",

        message:
          (error.code === "ECONNABORTED"
            ? "Analysis took too long. Please try again."
            : error.response?.data?.message) ||
          "Unable to analyze digital footprint."
      });

    }
  };


  const closeFootprintChecker = () => {

    setFootprintResult(null);

  };


  /* =================================================
     BACKEND TEST
  ================================================= */

  const testBackend = async () => {

    try {

      const response =
        await axios.get(
          "https://cybershield-zdsb.onrender.com/api/test"
        );

      setBackendStatus(
        response.data.message
      );

    } catch (error) {

      console.error(
        "Backend connection error:",
        error
      );

      setBackendStatus(
        "Backend connection failed."
      );

    }
  };


  return (

    <div className="app-container">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="header">
        <div className="header-inner">
          <a className="brand" href="#home" aria-label="CyberShield home">
            <span className="brand-mark" aria-hidden="true">CS</span>
            <span className="brand-name">
              CyberShield
              <small>PERSONAL SECURITY</small>
            </span>
          </a>

          <nav className="header-links" aria-label="Main navigation">
            <a href="#tools">Security tools</a>
            <button type="button" onClick={openFootprintChecker}>Privacy scan</button>
          </nav>

          <div className="header-status">
            <span className="status-dot" />
            <span>Protection desk</span>
          </div>
        </div>
      </header>


      <main className="main-content" id="home">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span>01</span> YOUR PERSONAL SECURITY DESK</p>
            <h1 id="hero-title">See the signals.<br /><span>Stay one step ahead.</span></h1>
            <p className="intro-text">
              A clearer view of the links you open, files you download, and information you leave online.
            </p>
            <button className="hero-button" onClick={openFootprintChecker}>
              Start a privacy scan <span aria-hidden="true">↗</span>
            </button>
            <div className="hero-footnote">
              <span className="status-dot" />
              <span>Checks run when you ask. No background monitoring.</span>
            </div>
          </div>

          <div className="hero-visual">
            <img src={heroImage} alt="Abstract digital security landscape" />
            <div className="visual-index"><span>FIELD NOTE</span><strong>01 / 03</strong></div>
            <div className="visual-caption">
              <span className="visual-caption-mark" aria-hidden="true">+</span>
              <span>Know what is exposed.<br /><strong>Choose what happens next.</strong></span>
            </div>
          </div>
        </section>

        <section className="tool-section" id="tools" aria-labelledby="tools-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span>TOOLS</span> THREE WAYS TO CHECK</p>
              <h2 id="tools-title">Your security, at a glance.</h2>
            </div>
            <span className="tool-count">01—03</span>
          </div>


          {/* =================================================
            CARDS
        ================================================= */}

          <div className="cards-container">


            {/* FILE CARD */}

            <div className="security-card tool-file">

              <div className="card-icon">
                01
              </div>

              <p className="tool-category">FILE INSPECTION</p>

              <h3>
                Safe Download Checker
              </h3>

              <p>
                Analyze downloaded files for
                suspicious characteristics before
                opening them.
              </p>

              <button
                className="check-button"
                onClick={openFileChecker}
              >
                Check a file <span aria-hidden="true">↗</span>
              </button>

            </div>


            {/* URL CARD */}

            <div className="security-card tool-url">

              <div className="card-icon">
                02
              </div>

              <p className="tool-category">LINK INTELLIGENCE</p>

              <h3>
                URL Safety Checker
              </h3>

              <p>
                Analyze a website URL for suspicious
                patterns and security risks.
              </p>

              <button
                className="check-button"
                onClick={openURLChecker}
              >
                Inspect a link <span aria-hidden="true">↗</span>
              </button>

            </div>


            {/* FOOTPRINT CARD */}

            <div className="security-card tool-footprint">

              <div className="card-icon">
                03
              </div>

              <p className="tool-category">PRIVACY REVIEW</p>

              <h3>
                Digital Footprint Checker
              </h3>

              <p>
                Check your public digital exposure
                and identify potential privacy risks.
              </p>

              <button
                className="check-button"
                onClick={openFootprintChecker}
              >
                Review exposure <span aria-hidden="true">↗</span>
              </button>

            </div>

          </div>

        </section>


        {/* =================================================
            FILE CHECKER
        ================================================= */}

        {fileResult?.open && (

          <div className="url-checker-panel tool-workspace file-workspace" aria-labelledby="file-checker-title">

            <div className="tool-panel-heading">
              <div>
                <p className="eyebrow"><span>01</span> FILE INSPECTION</p>
                <h2 id="file-checker-title">Safe Download Checker</h2>
                <p>Select a file to review its local characteristics and available threat intelligence.</p>
              </div>
              <span className="tool-panel-code">FILE<br />REVIEW</span>
            </div>


            <div className="file-input-container">
              <label className="file-picker-label" htmlFor="file-to-check">
                <span className="file-picker-mark" aria-hidden="true">+</span>
                <span className="file-picker-copy">
                  <strong>Choose a file to inspect</strong>
                  <span>Browse files on this device</span>
                </span>
                <span className="file-picker-action">Browse</span>
              </label>
              <input
                id="file-to-check"
                className="file-picker-input"
                type="file"
                onChange={handleFileSelect}
              />
            </div>


            {selectedFile && (

              <p className="selected-file">

                <strong>
                  Selected:
                </strong>{" "}

                {selectedFile.name}

              </p>

            )}


            <div className="file-buttons">

              <button
                className="check-button"
                onClick={checkFile}
                disabled={fileResult.loading}
              >

                {fileResult.loading
                  ? "Analyzing..."
                  : "Analyze File"}

              </button>


              <button
                className="close-button"
                onClick={closeFileChecker}
              >
                Close
              </button>

            </div>


            {fileResult.loading && (

              <div className="result-box">

                <h2>File inspection in progress</h2>

                <p>
                  CyberShield is analyzing your file...
                </p>
                <div className="scan-progress" aria-hidden="true"><span /></div>

              </div>

            )}


            {fileResult.status === "error" && (

              <div className="result-box error-box">

                <h2>Error</h2>

                <p>
                  {fileResult.message}
                </p>

              </div>

            )}


            {fileResult.status === "success" && (

              <div className="result-box">

                <p className="result-kicker">INSPECTION REPORT</p>
                <h2>File security analysis</h2>


                <p>
                  <strong>
                    File Name:
                  </strong>{" "}

                  {fileResult.analysis.fileName}
                </p>


                <p>
                  <strong>
                    File Size:
                  </strong>{" "}

                  {fileResult.analysis.fileSizeMB} MB
                </p>


                <p>
                  <strong>
                    Extension:
                  </strong>{" "}

                  {fileResult.analysis.extension}
                </p>


                <p>
                  <strong>
                    SHA-256:
                  </strong>
                </p>


                <p className="hash">

                  {fileResult.analysis.sha256}

                </p>


                <p>
                  <strong>
                    Risk Score:
                  </strong>{" "}

                  {fileResult.analysis.riskScore}/100
                </p>


                <p>
                  <strong>
                    Risk Level:
                  </strong>{" "}

                  <span
                    className={
                      fileResult.analysis.riskLevel ===
                        "HIGH"
                        ? "risk-high"
                        : fileResult.analysis.riskLevel ===
                          "MEDIUM"
                          ? "risk-medium"
                          : "risk-low"
                    }
                  >

                    {fileResult.analysis.riskLevel}

                  </span>

                </p>


                {/* CHECKS */}

                {fileResult.analysis.checksPassed
                  ?.length > 0 && (

                    <div className="analysis-section">

                      <h3 className="analysis-title analysis-title-passed">Checks passed</h3>

                      <ul>

                        {fileResult.analysis.checksPassed.map(
                          (check, index) => (

                            <li key={index}>
                              {check}
                            </li>

                          )
                        )}

                      </ul>

                    </div>

                  )}


                {/* WARNINGS */}

                {fileResult.analysis.warnings
                  ?.length > 0 && (

                    <div className="analysis-section">

                      <h3 className="analysis-title analysis-title-warning">Warnings</h3>

                      <ul>

                        {fileResult.analysis.warnings.map(
                          (warning, index) => (

                            <li key={index}>
                              {warning}
                            </li>

                          )
                        )}

                      </ul>

                    </div>

                  )}


                {/* ASSESSMENT */}

                <p className="assessment">

                  <strong>
                    Assessment:
                  </strong>{" "}

                  {fileResult.analysis.riskLevel ===
                    "HIGH"
                    ? "The file contains significant risk indicators."
                    : fileResult.analysis.riskLevel ===
                      "MEDIUM"
                      ? "The file contains some characteristics that require caution."
                      : "No major suspicious characteristics were detected by the current checks."}

                </p>


                {/* =================================================
                    VIRUSTOTAL FILE INTELLIGENCE
                ================================================= */}

                {fileResult.threatIntel && (

                  <div className="threat-intel">

                    <h2>VirusTotal threat intelligence</h2>


                    {!fileResult.threatIntel.available && (

                      <p>
                        {fileResult.threatIntel.message}
                      </p>

                    )}


                    {fileResult.threatIntel.available &&
                      !fileResult.threatIntel.reportFound && (

                        <>

                          <p>
                            {fileResult.threatIntel.message}
                          </p>


                          <p className="vt-result">

                            <strong>
                              Note:
                            </strong>{" "}

                            No existing report does not mean
                            that the file is guaranteed to be safe.

                          </p>

                        </>

                      )}


                    {fileResult.threatIntel.available &&
                      fileResult.threatIntel.reportFound && (

                        <>

                          <p>

                            <strong className="vt-danger">Malicious:</strong>{" "}

                            {fileResult.threatIntel.malicious}

                          </p>


                          <p>

                            <strong className="vt-warning">Suspicious:</strong>{" "}

                            {fileResult.threatIntel.suspicious}

                          </p>


                          <p>

                            <strong className="vt-safe">Harmless:</strong>{" "}

                            {fileResult.threatIntel.harmless}

                          </p>


                          <p>

                            <strong className="vt-neutral">Undetected:</strong>{" "}

                            {fileResult.threatIntel.undetected}

                          </p>


                          <p className="vt-result">

                            <strong>
                              Result:
                            </strong>{" "}

                            {fileResult.threatIntel.message}

                          </p>

                        </>

                      )}

                  </div>

                )}


                <p className="disclaimer">

                  {fileResult.disclaimer}

                </p>

              </div>

            )}

          </div>

        )}


        {/* =================================================
            URL CHECKER
        ================================================= */}

        {urlResult?.open && (

          <div className="url-checker-panel tool-workspace url-workspace" aria-labelledby="url-checker-title">

            <div className="tool-panel-heading">
              <div>
                <p className="eyebrow"><span>02</span> LINK INTELLIGENCE</p>
                <h2 id="url-checker-title">URL Safety Checker</h2>
                <p>Inspect a web address for suspicious patterns and available threat intelligence.</p>
              </div>
              <span className="tool-panel-code">URL<br />REVIEW</span>
            </div>


            <div className="url-input-container">

              <label className="field-label" htmlFor="url-to-check">WEBSITE ADDRESS</label>

              <input
                id="url-to-check"
                type="text"
                value={url}
                onChange={(e) =>
                  setUrl(e.target.value)
                }
                placeholder="https://example.com"
              />


              <button
                className="check-button"
                onClick={checkURL}
                disabled={urlResult.loading}
              >

                {urlResult.loading
                  ? "Analyzing..."
                  : "Analyze URL"}

              </button>

            </div>


            <button
              className="close-button"
              onClick={closeURLChecker}
            >
              Close
            </button>


            {urlResult.loading && (

              <div className="result-box">

                <h2>Link inspection in progress</h2>

                <p>
                  CyberShield is analyzing the URL...
                </p>
                <div className="scan-progress" aria-hidden="true"><span /></div>

              </div>

            )}


            {urlResult.status === "error" && (

              <div className="result-box error-box">

                <h2>Error</h2>

                <p>
                  {urlResult.message}
                </p>

              </div>

            )}


            {urlResult.status === "success" &&
              !urlResult.loading && (

                <div className="result-box">

                  <p className="result-kicker">INSPECTION REPORT</p>
                  <h2>URL security analysis</h2>


                  <p>

                    <strong>
                      URL:
                    </strong>{" "}

                    {urlResult.url}

                  </p>


                  <p>

                    <strong>
                      Risk Score:
                    </strong>{" "}

                    {urlResult.riskScore}/100

                  </p>


                  <p>

                    <strong>
                      Risk Level:
                    </strong>{" "}

                    <span
                      className={
                        urlResult.riskLevel === "HIGH"
                          ? "risk-high"
                          : urlResult.riskLevel === "MEDIUM"
                            ? "risk-medium"
                            : "risk-low"
                      }
                    >

                      {urlResult.riskLevel}

                    </span>

                  </p>


                  {urlResult.positiveChecks
                    ?.length > 0 && (

                      <div className="analysis-section">

                        <h3 className="analysis-title analysis-title-passed">Checks passed</h3>

                        <ul>

                          {urlResult.positiveChecks.map(
                            (check, index) => (

                              <li key={index}>
                                {check}
                              </li>

                            )
                          )}

                        </ul>

                      </div>

                    )}


                  <div className="analysis-section score-breakdown">

                    <h3 className="analysis-title analysis-title-warning">Why this score</h3>

                    {urlResult.findings?.length > 0 ? (
                      <ul>
                        {urlResult.findings.map((finding, index) => (
                          <li className="score-finding" key={`${finding.type || finding.title}-${index}`}>
                            <div className="score-finding-heading">
                              <strong>{finding.title || "Risk indicator"}</strong>
                              <span>+{finding.points || 0} points</span>
                            </div>
                            <p>{finding.description}</p>
                            <p className="score-finding-source">
                              Checked: {finding.affectedPart || finding.source || "URL"}
                              {finding.source && finding.affectedPart
                                ? ` (${finding.source})`
                                : ""}
                            </p>
                            {finding.details?.keywords?.length > 0 && (
                              <p className="score-finding-source">
                                Matched URL text: {finding.details.keywords.join(", ")}
                              </p>
                            )}
                            {finding.details?.submittedDomain && (
                              <p className="score-finding-source">
                                Compared {finding.details.submittedDomain} with {finding.details.similarDomain}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : urlResult.warnings?.length > 0 ? (
                      <ul>
                        {urlResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No risk indicators contributed to this score.</p>
                    )}

                    {urlResult.riskAdjustments?.map((adjustment, index) => (
                      <p className="score-adjustment" key={`${adjustment.reason}-${index}`}>
                        <strong>Additional +{adjustment.points} points:</strong> {adjustment.reason}
                      </p>
                    ))}

                    {urlResult.scoreCapped && (
                      <p className="score-finding-source">The calculated score was capped at 100.</p>
                    )}

                  </div>


                  <p className="assessment">

                    <strong>
                      Assessment:
                    </strong>{" "}

                    {urlResult.message}

                  </p>


                  {/* URL VIRUSTOTAL */}

                  {urlResult.threatIntel && (

                    <div className="threat-intel">

                      <h2>VirusTotal threat intelligence</h2>


                      {urlResult.threatIntel.available &&
                        urlResult.threatIntel.reportFound && (

                          <>

                            <p>
                              <strong className="vt-danger">Malicious:</strong>{" "}

                              {
                                urlResult.threatIntel
                                  .malicious
                              }
                            </p>


                            <p>
                              <strong className="vt-warning">Suspicious:</strong>{" "}

                              {
                                urlResult.threatIntel
                                  .suspicious
                              }
                            </p>


                            <p>
                              <strong className="vt-safe">Harmless:</strong>{" "}

                              {
                                urlResult.threatIntel
                                  .harmless
                              }
                            </p>


                            <p>
                              <strong className="vt-neutral">Undetected:</strong>{" "}

                              {
                                urlResult.threatIntel
                                  .undetected
                              }
                            </p>


                            <p className="vt-result">

                              <strong>
                                Result:
                              </strong>{" "}

                              {
                                urlResult.threatIntel
                                  .message
                              }

                            </p>

                          </>

                        )}


                      {urlResult.threatIntel.available &&
                        !urlResult.threatIntel.reportFound && (

                          <p>
                            {
                              urlResult.threatIntel
                                .message
                            }
                          </p>

                        )}


                      {!urlResult.threatIntel.available && (

                        <p>
                          {
                            urlResult.threatIntel
                              .message
                          }
                        </p>

                      )}

                    </div>

                  )}


                  <p className="disclaimer">

                    {urlResult.disclaimer}

                  </p>

                </div>

              )}

          </div>

        )}


        {/* =================================================
            DIGITAL FOOTPRINT
        ================================================= */}

        {footprintResult?.open && (

          <div className="url-checker-panel footprint-panel">

            <h2>Digital Footprint Checker</h2>

            <p>
              Enter information you want CyberShield
              to analyze for basic privacy exposure indicators.
            </p>


            <div className="footprint-field">

              <label>
                Username
              </label>

              <input
                className="footprint-input"
                type="text"
                value={footprintData.username}
                onChange={(e) =>
                  updateFootprintField(
                    "username",
                    e.target.value
                  )
                }
                placeholder="e.g. testuser123"
              />

            </div>


            <div className="footprint-field">

              <label>
                Email Address
              </label>

              <input
                className="footprint-input"
                type="email"
                value={footprintData.email}
                onChange={(e) =>
                  updateFootprintField(
                    "email",
                    e.target.value
                  )
                }
                placeholder="e.g. test@example.com"
              />

            </div>


            <div className="footprint-field">

              <label>
                Full Name
              </label>

              <input
                className="footprint-input"
                type="text"
                value={footprintData.fullName}
                onChange={(e) =>
                  updateFootprintField(
                    "fullName",
                    e.target.value
                  )
                }
                placeholder="e.g. Test User"
              />

            </div>


            <div className="footprint-field">

              <label>
                Phone Number
              </label>

              <input
                className="footprint-input"
                type="text"
                value={footprintData.phone}
                onChange={(e) =>
                  updateFootprintField(
                    "phone",
                    e.target.value
                  )
                }
                placeholder="e.g. +91 9000000000"
              />

            </div>


            <div className="privacy-note">

              <strong>Privacy:</strong>{" "}
              Your information is analyzed for basic
              digital-exposure indicators. CyberShield
              does not confirm data breaches or guarantee
              that a profile belongs to you.

            </div>


            <div className="file-buttons">

              <button
                className="check-button"
                onClick={checkFootprint}
                disabled={footprintResult.loading}
              >

                {footprintResult.loading
                  ? "Analyzing..."
                  : "Analyze Footprint"}

              </button>


              <button
                className="close-button"
                onClick={closeFootprintChecker}
              >
                Close
              </button>

            </div>


            {footprintResult.loading && (

              <div className="result-box">

                <h2>Digital footprint analysis</h2>

                <p>
                  CyberShield is analyzing the
                  information...
                </p>

              </div>

            )}


            {footprintResult.status === "error" && (

              <div className="result-box error-box">

                <h2>Error</h2>

                <p>
                  {footprintResult.message}
                </p>

              </div>

            )}


            {footprintResult.status === "success" && (

              <div className="result-box">

                <h2>Digital footprint analysis</h2>


                {/* RISK SUMMARY */}

                <p>
                  <strong>
                    Risk Score:
                  </strong>{" "}
                  {footprintResult.analysis.riskScore}/100
                </p>


                <p>
                  <strong>
                    Risk Level:
                  </strong>{" "}

                  <span
                    className={
                      footprintResult.analysis.riskLevel === "HIGH"
                        ? "risk-high"
                        : footprintResult.analysis.riskLevel === "MEDIUM"
                          ? "risk-medium"
                          : "risk-low"
                    }
                  >
                    {footprintResult.analysis.riskLevel}
                  </span>
                </p>


                {/* =================================================
        USERNAME EXPOSURE
    ================================================= */}

                <div className="analysis-section">

                  <h3>Username exposure</h3>

                  {footprintData.username.trim() ? (

                    footprintResult.analysis.usernameResults?.length > 0 ? (

                      <ul>

                        {footprintResult.analysis.usernameResults.map(
                          (profile, index) => (

                            <li key={index}>

                              <strong>
                                {profile.platform}
                              </strong>

                              {" — "}

                              {profile.found ? (

                                <>
                                  Possible profile detected{" "}

                                  <a
                                    href={profile.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View
                                  </a>
                                </>

                              ) : (

                                "No accessible profile detected"

                              )}

                            </li>

                          )
                        )}

                      </ul>

                    ) : (

                      <p>
                        No configured platform results were returned.
                      </p>

                    )

                  ) : (

                    <p>
                      No username was provided.
                    </p>

                  )}

                  <p className="disclaimer">

                    Username results indicate possible public profile
                    availability only. They do not confirm that a
                    profile belongs to the person being checked.

                  </p>

                </div>


                {/* =================================================
        EMAIL ANALYSIS
    ================================================= */}

                <div className="analysis-section">

                  <h3>Email analysis</h3>

                  {footprintData.email.trim() ? (

                    footprintResult.analysis.emailResult ? (

                      <>

                        <p>

                          <strong>
                            Valid:
                          </strong>{" "}

                          {footprintResult.analysis.emailResult.valid
                            ? "Yes"
                            : "No"}

                        </p>


                        <p>

                          <strong>
                            Provider:
                          </strong>{" "}

                          {footprintResult.analysis.emailResult.provider ||
                            "Unknown"}

                        </p>


                        <p>

                          <strong>
                            Type:
                          </strong>{" "}

                          {footprintResult.analysis.emailResult.type ||
                            "Unknown"}

                        </p>


                        {footprintResult.analysis.emailResult.warnings
                          ?.length > 0 && (

                            <ul>

                              {footprintResult.analysis.emailResult.warnings.map(
                                (warning, index) => (

                                  <li key={index}>
                                    {warning}
                                  </li>

                                )
                              )}

                            </ul>

                          )}

                      </>

                    ) : (

                      <p>
                        Email analysis was not returned.
                      </p>

                    )

                  ) : (

                    <p>
                      No email address was provided.
                    </p>

                  )}

                </div>


                {/* =================================================
        PERSONAL INFORMATION
    ================================================= */}

                <div className="analysis-section">

                  <h3>Personal information</h3>

                  <ul>

                    <li>
                      Full Name:{" "}
                      <strong>
                        {footprintData.fullName.trim()
                          ? "Provided"
                          : "Not provided"}
                      </strong>
                    </li>

                    <li>
                      Phone Number:{" "}
                      <strong>
                        {footprintData.phone.trim()
                          ? "Provided"
                          : "Not provided"}
                      </strong>
                    </li>

                  </ul>

                </div>


                {/* =================================================
        PRIVACY INDICATORS
    ================================================= */}

                <div className="analysis-section">

                  <h3>Privacy indicators</h3>

                  {footprintResult.analysis.warnings?.length > 0 ? (

                    <ul>

                      {footprintResult.analysis.warnings.map(
                        (warning, index) => (

                          <li key={index}>
                            {warning}
                          </li>

                        )
                      )}

                    </ul>

                  ) : (

                    <p>
                      No privacy indicators were detected by the
                      current checks.
                    </p>

                  )}

                </div>


                {/* =================================================
        WHAT THIS SCAN CHECKS
    ================================================= */}

                <div className="analysis-section">

                  <h3>What this scan checks</h3>

                  <ul>

                    <li>
                      Username profile availability on configured platforms
                    </li>

                    <li>
                      Email format and domain type
                    </li>

                    <li>
                      Basic personal-information exposure indicators
                    </li>

                    <li>
                      Combined privacy risk score
                    </li>

                  </ul>

                </div>


                {/* =================================================
        DISCLAIMER
    ================================================= */}

                <p className="disclaimer">

                  {footprintResult.disclaimer}

                </p>

              </div>

            )}

          </div>

        )}

        {/* =================================================
            BACKEND TEST
        ================================================= */}

        <div className="backend-test">

          <button
            className="backend-button"
            onClick={testBackend}
          >
            Test Backend Connection
          </button>

          {backendStatus && (

            <p>
              {backendStatus}
            </p>

          )}

        </div>

      </main>

    </div>
  );
}

export default App;