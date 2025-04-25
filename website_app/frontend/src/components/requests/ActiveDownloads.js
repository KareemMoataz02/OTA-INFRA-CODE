import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import requestService from "../../services/requestService";
import Loading from "../common/Loading";

function ActiveDownloads({ showAlert }) {
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchActiveDownloads = async () => {
    try {
      const data = await requestService.getActiveDownloads();
      setActiveDownloads(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching active downloads:", err);
      setError("Failed to fetch active downloads. Please try again later.");
      showAlert("error", "Failed to fetch active downloads");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActiveDownloads();
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchActiveDownloads();
      }, 5000); // Refresh every 5 seconds

      setRefreshInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchActiveDownloads();
  };

  const handleStatusUpdate = async (carId, newStatus) => {
    try {
      await requestService.updateDownloadStatus(carId, { status: newStatus });
      showAlert("success", `Download status updated to ${newStatus}`);
      fetchActiveDownloads();
    } catch (err) {
      console.error("Error updating download status:", err);
      showAlert("error", "Failed to update download status");
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return <Loading message="Loading active downloads..." />;
  }

  return (
    <div className="active-downloads">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Active Downloads</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group me-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={handleManualRefresh}
              disabled={loading}
            >
              <i className="bi bi-arrow-repeat me-1"></i> Refresh
            </button>
            <button
              className={`btn btn-sm ${
                autoRefresh ? "btn-success" : "btn-outline-success"
              }`}
              onClick={toggleAutoRefresh}
            >
              <i
                className={`bi ${
                  autoRefresh ? "bi-pause-circle" : "bi-play-circle"
                } me-1`}
              ></i>
              {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
            </button>
          </div>
          <Link to="/requests/download/new" className="btn btn-sm btn-primary">
            <i className="bi bi-plus-circle me-1"></i> New Download
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {activeDownloads.length === 0 ? (
        <div className="alert alert-info" role="alert">
          <i className="bi bi-info-circle me-2"></i>
          No active downloads at the moment.
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              Active Downloads ({activeDownloads.length})
              {autoRefresh && (
                <small className="text-muted ms-2">
                  Auto-refreshing every 5 seconds
                </small>
              )}
            </h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>Car ID</th>
                    <th>Car Type</th>
                    <th>Time Started</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDownloads.map((download) => (
                    <tr key={download._id}>
                      <td>{download.car_id}</td>
                      <td>{download.car_type}</td>
                      <td>{formatDateTime(download.timestamp)}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div
                            className="progress flex-grow-1 me-2"
                            style={{ height: "20px" }}
                          >
                            <div
                              className={`progress-bar progress-bar-striped ${
                                download.status === "IN_PROGRESS"
                                  ? "progress-bar-animated"
                                  : ""
                              }`}
                              role="progressbar"
                              style={{
                                width: `${Math.round(
                                  (download.transferred_size /
                                    download.total_size) *
                                    100
                                )}%`,
                                backgroundColor:
                                  download.status === "PENDING"
                                    ? "#ffc107"
                                    : download.status === "IN_PROGRESS"
                                    ? "#0d6efd"
                                    : download.status === "FAILED"
                                    ? "#dc3545"
                                    : "#198754",
                              }}
                              aria-valuenow={Math.round(
                                (download.transferred_size /
                                  download.total_size) *
                                  100
                              )}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            >
                              {Math.round(
                                (download.transferred_size /
                                  download.total_size) *
                                  100
                              )}
                              %
                            </div>
                          </div>
                          <span className="text-nowrap">
                            {formatBytes(download.transferred_size)} /{" "}
                            {formatBytes(download.total_size)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            download.status === "PENDING"
                              ? "bg-warning"
                              : download.status === "IN_PROGRESS"
                              ? "bg-primary"
                              : download.status === "FAILED"
                              ? "bg-danger"
                              : "bg-success"
                          }`}
                        >
                          {download.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          {download.status === "PENDING" && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                handleStatusUpdate(
                                  download.car_id,
                                  "IN_PROGRESS"
                                )
                              }
                            >
                              <i className="bi bi-play"></i> Start
                            </button>
                          )}
                          {download.status === "IN_PROGRESS" && (
                            <>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() =>
                                  handleStatusUpdate(download.car_id, "PENDING")
                                }
                              >
                                <i className="bi bi-pause"></i> Pause
                              </button>
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() =>
                                  handleStatusUpdate(
                                    download.car_id,
                                    "COMPLETED"
                                  )
                                }
                              >
                                <i className="bi bi-check2"></i> Complete
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              handleStatusUpdate(download.car_id, "CANCELLED")
                            }
                          >
                            <i className="bi bi-x"></i> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link to="/requests" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> All Requests
        </Link>
      </div>
    </div>
  );
}

export default ActiveDownloads;
