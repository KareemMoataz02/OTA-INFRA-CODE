import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import requestService from "../../services/requestService";
import Loading from "../common/Loading";

function RequestDetail({ showAlert }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloadRequest, setIsDownloadRequest] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        // In a real app, you'd have an endpoint to get a request by ID
        // For demonstration, we'll use the car requests endpoint and filter by ID

        // Try to find in service requests
        let requestsForCar = await requestService.getRequestsForCar(id);

        // If the ID is actually a car ID
        if (
          requestsForCar &&
          (requestsForCar.service_requests?.length > 0 ||
            requestsForCar.download_requests?.length > 0)
        ) {
          // For simplicity, just use the first request found
          if (requestsForCar.service_requests?.length > 0) {
            setRequest(requestsForCar.service_requests[0]);
            setIsDownloadRequest(false);
          } else if (requestsForCar.download_requests?.length > 0) {
            setRequest(requestsForCar.download_requests[0]);
            setIsDownloadRequest(true);
          }
        } else {
          // If we couldn't find the request, show an error
          throw new Error("Request not found");
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching request details:", err);
        setError("Failed to fetch request details. Please try again later.");
        showAlert("error", "Failed to fetch request details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRequest();
    } else {
      setError("No request ID provided");
      setLoading(false);
    }
  }, [id, showAlert]);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      if (isDownloadRequest) {
        await requestService.updateDownloadStatus(request.car_id, {
          status: newStatus,
        });
        showAlert("success", `Download request status updated to ${newStatus}`);

        // Update the request object
        setRequest({
          ...request,
          status: newStatus,
        });

        // If status is now active, navigate to active downloads
        if (newStatus === "IN_PROGRESS") {
          navigate("/requests/download/active");
        }
      } else {
        // For service requests - not implemented in the backend
        showAlert(
          "info",
          "Service request status update is not implemented yet"
        );
      }
    } catch (err) {
      console.error("Error updating request status:", err);
      showAlert("error", "Failed to update request status");
    }
  };

  if (loading) {
    return <Loading message="Loading request details..." />;
  }

  if (error || !request) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || "Request not found"}
      </div>
    );
  }

  return (
    <div className="request-detail">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">
          {isDownloadRequest ? "Download Request" : "Service Request"}:{" "}
          {request.car_id}
        </h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          {isDownloadRequest && request.status !== "COMPLETED" && (
            <Link
              to="/requests/download/active"
              className="btn btn-sm btn-primary"
            >
              <i className="bi bi-lightning me-1"></i> View Active Downloads
            </Link>
          )}
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
                    <th style={{ width: "30%" }}>Request Type</th>
                    <td>
                      {isDownloadRequest
                        ? "Download Request"
                        : "Service Request"}
                    </td>
                  </tr>
                  <tr>
                    <th>Car ID</th>
                    <td>{request.car_id}</td>
                  </tr>
                  <tr>
                    <th>Car Type</th>
                    <td>
                      <Link to={`/car-types/${request.car_type}`}>
                        {request.car_type}
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <th>Timestamp</th>
                    <td>{formatDateTime(request.timestamp)}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>
                      <span
                        className={`badge ${
                          request.status === "PENDING"
                            ? "bg-warning"
                            : request.status === "IN_PROGRESS"
                            ? "bg-primary"
                            : request.status === "COMPLETED"
                            ? "bg-success"
                            : request.status === "FAILED"
                            ? "bg-danger"
                            : "bg-secondary"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>IP Address</th>
                    <td>{request.ip_address}</td>
                  </tr>
                  <tr>
                    <th>Port</th>
                    <td>{request.port || "N/A"}</td>
                  </tr>
                  {!isDownloadRequest && (
                    <tr>
                      <th>Service Type</th>
                      <td>{request.service_type}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          {isDownloadRequest ? (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Download Information</h5>
              </div>
              <div className="card-body">
                <table className="table">
                  <tbody>
                    <tr>
                      <th style={{ width: "30%" }}>Total Size</th>
                      <td>{formatBytes(request.total_size)}</td>
                    </tr>
                    <tr>
                      <th>Transferred</th>
                      <td>{formatBytes(request.transferred_size)}</td>
                    </tr>
                    <tr>
                      <th>Progress</th>
                      <td>
                        <div className="progress">
                          <div
                            className={`progress-bar ${
                              request.status === "IN_PROGRESS"
                                ? "progress-bar-striped progress-bar-animated"
                                : ""
                            }`}
                            role="progressbar"
                            style={{
                              width: `${Math.round(
                                (request.transferred_size /
                                  request.total_size) *
                                  100
                              )}%`,
                            }}
                            aria-valuenow={Math.round(
                              (request.transferred_size / request.total_size) *
                                100
                            )}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          >
                            {Math.round(
                              (request.transferred_size / request.total_size) *
                                100
                            )}
                            %
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th>Required Versions</th>
                      <td>
                        {request.required_versions?.length > 0 ? (
                          <ul className="list-group">
                            {request.required_versions.map((version, index) => (
                              <li key={index} className="list-group-item">
                                <strong>{version.version_number}</strong> -{" "}
                                {version.hex_file_path}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted">
                            No versions specified
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th>Old Versions</th>
                      <td>
                        {request.old_versions?.length > 0 ? (
                          <ul className="list-group">
                            {request.old_versions.map((version, index) => (
                              <li key={index} className="list-group-item">
                                <strong>{version.version_number}</strong> -{" "}
                                {version.hex_file_path}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted">
                            No old versions specified
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Service Information</h5>
              </div>
              <div className="card-body">
                <table className="table">
                  <tbody>
                    <tr>
                      <th style={{ width: "30%" }}>Metadata</th>
                      <td>
                        {request.metadata &&
                        Object.keys(request.metadata).length > 0 ? (
                          <pre>{JSON.stringify(request.metadata, null, 2)}</pre>
                        ) : (
                          <span className="text-muted">No metadata</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {request.status !== "COMPLETED" && request.status !== "CANCELLED" && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Actions</h5>
          </div>
          <div className="card-body">
            <div className="d-flex gap-2">
              {request.status === "PENDING" && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpdateStatus("IN_PROGRESS")}
                >
                  <i className="bi bi-play-fill me-1"></i> Start
                </button>
              )}

              {request.status === "IN_PROGRESS" && (
                <>
                  <button
                    className="btn btn-warning"
                    onClick={() => handleUpdateStatus("PENDING")}
                  >
                    <i className="bi bi-pause-fill me-1"></i> Pause
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleUpdateStatus("COMPLETED")}
                  >
                    <i className="bi bi-check-lg me-1"></i> Mark as Completed
                  </button>
                </>
              )}

              {(request.status === "PENDING" ||
                request.status === "IN_PROGRESS") && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleUpdateStatus("CANCELLED")}
                >
                  <i className="bi bi-x-lg me-1"></i> Cancel
                </button>
              )}

              {request.status === "FAILED" && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleUpdateStatus("PENDING")}
                >
                  <i className="bi bi-arrow-repeat me-1"></i> Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <Link to="/requests" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Requests
        </Link>
      </div>
    </div>
  );
}

export default RequestDetail;
