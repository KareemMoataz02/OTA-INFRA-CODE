import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import versionService from "../../services/versionService";
import Loading from "../common/Loading";

function VersionDetail({ showAlert }) {
  const { ecuName, ecuModel, versionNumber } = useParams();

  const [version, setVersion] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Function to create a shortened representation of the URL
  const shortenUrl = (url) => {
    try {
      if (!url) return "";

      // Attempt to create a URL object
      const urlObj = new URL(url);

      // Get the hostname (domain)
      const domain = urlObj.hostname;

      // Get the pathname
      let path = urlObj.pathname;

      // If the path is too long, truncate it
      if (path.length > 20) {
        // Extract the last part of the path (filename)
        const pathParts = path.split("/");
        const fileName = pathParts[pathParts.length - 1];

        // Truncate the filename if it's too long
        const shortFileName =
          fileName.length > 20
            ? fileName.substring(0, 10) +
              "..." +
              fileName.substring(fileName.length - 10)
            : fileName;

        path = "/.../" + shortFileName;
      }

      return `${domain}${path}`;
    } catch (e) {
      // If URL parsing fails, just truncate the string
      return url.substring(0, 20) + "..." + url.substring(url.length - 20);
    }
  };

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        setLoading(true);
        const data = await versionService.getVersionDetails(
          ecuName,
          ecuModel,
          versionNumber
        );
        setVersion(data);
        setFileSize(data.file_size);
        setError(null);
      } catch (err) {
        console.error("Error fetching version details:", err);
        setError("Failed to fetch version details. Please try again later.");
        showAlert("error", "Failed to fetch version details");
      } finally {
        setLoading(false);
      }
    };

    if (ecuName && ecuModel && versionNumber) {
      fetchVersion();
    } else {
      setError("Missing required parameters");
      setLoading(false);
    }
  }, [ecuName, ecuModel, versionNumber, showAlert]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      showAlert("info", "Starting download...");

      const blob = await versionService.downloadHexFile(
        ecuName,
        ecuModel,
        versionNumber
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${ecuName}_${ecuModel}_${versionNumber}.hex`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showAlert("success", "Download completed successfully");
    } catch (err) {
      console.error("Error downloading hex file:", err);
      showAlert("error", "Failed to download hex file");
    } finally {
      setDownloading(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <Loading message={`Loading version details for ${versionNumber}...`} />
    );
  }

  if (error || !version) {
    return (
      <div className="alert alert-danger" role="alert">
        {error ||
          `Version ${versionNumber} not found for ECU: ${ecuName} (${ecuModel})`}
      </div>
    );
  }

  return (
    <div className="version-detail">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Firmware Version: {version.version_number}</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => window.open(version.hex_file_path, "_blank")}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Downloading...
              </>
            ) : (
              <>
                <i className="bi bi-download me-1"></i> Download Firmware
              </>
            )}
          </button>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Basic Information</h5>
            </div>
            <div className="card-body">
              <table className="table">
                <tbody>
                  <tr>
                    <th style={{ width: "30%" }}>ECU Name</th>
                    <td>{ecuName}</td>
                  </tr>
                  <tr>
                    <th>ECU Model</th>
                    <td>{ecuModel}</td>
                  </tr>
                  <tr>
                    <th>Version Number</th>
                    <td>{version.version_number}</td>
                  </tr>
                  <tr>
                    <th>Hex File Path</th>
                    <td>
                      <div className="d-flex flex-column">
                        {/* Hidden full URL in a visually hidden span for accessibility */}
                        <span className="visually-hidden">
                          {version.hex_file_path}
                        </span>

                        {/* Visible shortened version of the URL */}
                        <div className="mb-2" aria-hidden="true">
                          <a
                            href={version.hex_file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary"
                            title={version.hex_file_path}
                          >
                            {shortenUrl(version.hex_file_path)}
                          </a>
                        </div>

                        {/* Action buttons */}
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() =>
                              window.open(version.hex_file_path, "_blank")
                            }
                          >
                            <i className="bi bi-box-arrow-up-right"></i> Open
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                version.hex_file_path
                              );
                              showAlert("success", "URL copied to clipboard");
                            }}
                          >
                            <i className="bi bi-clipboard"></i> Copy
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Compatible Car Types</h5>
            </div>
            <div className="card-body">
              {version.compatible_car_types &&
              version.compatible_car_types.length > 0 ? (
                <div className="list-group">
                  {version.compatible_car_types.map((carType, index) => (
                    <Link
                      to={`/car-types/${carType}`}
                      key={index}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    >
                      {carType}
                      <i className="bi bi-arrow-right"></i>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="alert alert-warning" role="alert">
                  No compatible car types specified for this version.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Actions</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="d-grid">
                <button
                  className="btn btn-primary"
                  onClick={() => window.open(version.hex_file_path, "_blank")}
                  disabled={downloading}
                >
                  {downloading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download me-1"></i> Download Firmware
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="col-md-6">
              <div className="d-grid">
                <Link
                  to={`/versions/ecu/${ecuName}/${ecuModel}`}
                  className="btn btn-outline-secondary"
                >
                  <i className="bi bi-list me-1"></i> View All Versions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          to={`/ecus/${ecuName}/${ecuModel}`}
          className="btn btn-outline-secondary"
        >
          <i className="bi bi-arrow-left me-1"></i> Back to ECU Details
        </Link>
      </div>
    </div>
  );
}

export default VersionDetail;
