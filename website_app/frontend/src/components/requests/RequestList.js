import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import requestService from "../../services/requestService";
import Loading from "../common/Loading";

function RequestList({ showAlert }) {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [downloadRequests, setDownloadRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("service");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);

        // For demonstration, we'll fetch by statuses since the /requests endpoint was not implemented
        // In a real app, you'd have a dedicated endpoint to get all requests

        const serviceData = await Promise.all([
          requestService.getServiceRequestsByStatus("PENDING"),
          requestService.getServiceRequestsByStatus("IN_PROGRESS"),
          requestService.getServiceRequestsByStatus("COMPLETED"),
          requestService.getServiceRequestsByStatus("FAILED"),
          requestService.getServiceRequestsByStatus("CANCELLED"),
        ]);

        const downloadData = await Promise.all([
          requestService.getDownloadRequestsByStatus("PENDING"),
          requestService.getDownloadRequestsByStatus("IN_PROGRESS"),
          requestService.getDownloadRequestsByStatus("COMPLETED"),
          requestService.getDownloadRequestsByStatus("FAILED"),
          requestService.getDownloadRequestsByStatus("CANCELLED"),
        ]);

        // Flatten the arrays
        setServiceRequests([].concat(...serviceData));
        setDownloadRequests([].concat(...downloadData));

        setError(null);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError("Failed to fetch requests. Please try again later.");
        showAlert("error", "Failed to fetch requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [showAlert]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Filter requests based on search term and status filter
  const filteredRequests = (
    activeTab === "service" ? serviceRequests : downloadRequests
  ).filter((request) => {
    const matchesSearch =
      request.car_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.car_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.ip_address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <Loading message="Loading requests..." />;
  }

  return (
    <div className="request-list">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Requests</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <Link
            to="/requests/service/new"
            className="btn btn-sm btn-success me-2"
          >
            <i className="bi bi-tools me-1"></i> New Service Request
          </Link>
          <Link
            to="/requests/download/new"
            className="btn btn-sm btn-primary me-2"
          >
            <i className="bi bi-download me-1"></i> New Download Request
          </Link>
          <Link
            to="/requests/download/active"
            className="btn btn-sm btn-warning"
          >
            <i className="bi bi-lightning me-1"></i> Active Downloads
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "service" ? "active" : ""
                }`}
                onClick={() => setActiveTab("service")}
              >
                Service Requests
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "download" ? "active" : ""
                }`}
                onClick={() => setActiveTab("download")}
              >
                Download Requests
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by car ID, car type, or IP address..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="col-md-6">
              <select
                className="form-select"
                value={statusFilter}
                onChange={handleStatusFilter}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="alert alert-info" role="alert">
              {searchTerm || statusFilter
                ? "No requests match your search criteria."
                : `No ${activeTab} requests available.`}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Car ID</th>
                    <th>Car Type</th>
                    <th>Timestamp</th>
                    <th>IP Address</th>
                    <th>Status</th>
                    {activeTab === "service" && <th>Service Type</th>}
                    {activeTab === "download" && <th>Progress</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request, index) => (
                    <tr key={index}>
                      <td>{request.car_id}</td>
                      <td>
                        <Link to={`/car-types/${request.car_type}`}>
                          {request.car_type}
                        </Link>
                      </td>
                      <td>{formatDateTime(request.timestamp)}</td>
                      <td>{request.ip_address}</td>
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
                      {activeTab === "service" && (
                        <td>{request.service_type}</td>
                      )}
                      {activeTab === "download" && (
                        <td>
                          {request.total_size > 0 ? (
                            <div className="progress">
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{
                                  width: `${Math.round(
                                    (request.transferred_size /
                                      request.total_size) *
                                      100
                                  )}%`,
                                }}
                                aria-valuenow={Math.round(
                                  (request.transferred_size /
                                    request.total_size) *
                                    100
                                )}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              >
                                {Math.round(
                                  (request.transferred_size /
                                    request.total_size) *
                                    100
                                )}
                                %
                              </div>
                            </div>
                          ) : (
                            <span>N/A</span>
                          )}
                        </td>
                      )}
                      <td>
                        <div className="btn-group">
                          <Link
                            to={`/requests/${request._id}`}
                            className="btn btn-sm btn-outline-info"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          {activeTab === "download" &&
                            request.status !== "COMPLETED" && (
                              <Link
                                to={`/requests/download/active`}
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className="bi bi-lightning"></i>
                              </Link>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestList;
