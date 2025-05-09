import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import carTypeService from "../../services/carTypeService";
import Loading from "../common/Loading";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [carTypes, setCarTypes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch data in parallel
        const [statsData, carTypesData] = await Promise.all([
          carTypeService.getCarTypeStatistics(),
          carTypeService.getAllCarTypes(),
        ]);

        setStats(statsData);
        setCarTypes(carTypesData);
        setError(null);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <Loading message="Loading dashboard data..." />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Dashboard</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group me-2">
            <Link
              to="/car-types/new"
              className="btn btn-sm btn-outline-primary"
            >
              Add Car Type
            </Link>
            <Link
              to="/versions/upload"
              className="btn btn-sm btn-outline-secondary"
            >
              Upload Firmware
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-white bg-primary mb-3">
              <div className="card-body">
                <h5 className="card-title">Car Types</h5>
                <p className="card-text display-4">{stats.total_car_types}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success mb-3">
              <div className="card-body">
                <h5 className="card-title">Total Manufactured</h5>
                <p className="card-text display-4">
                  {stats.total_manufactured}
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-warning mb-3">
              <div className="card-body">
                <h5 className="card-title">ECUs</h5>
                <p className="card-text display-4">
                  {stats.car_type_details.reduce(
                    (total, ct) => total + ct.ecu_count,
                    0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Car Types */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Car Types</h5>
              <Link to="/car-types" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
            </div>
            <div className="card-body">
              {carTypes.length === 0 ? (
                <p className="text-muted">
                  No car types available. Add one to get started.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Model Number</th>
                        <th>Manufactured</th>
                        <th>ECUs Count</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carTypes.slice(0, 5).map((carType) => (
                        <tr key={carType.name}>
                          <td>{carType.name}</td>
                          <td>{carType.model_number}</td>
                          <td>{carType.manufactured_count}</td>
                          <td>{carType.ecus_count}</td>
                          <td>
                            <Link
                              to={`/car-types/${carType.name}`}
                              className="btn btn-sm btn-outline-info me-2"
                            >
                              View
                            </Link>
                            <Link
                              to={`/ecus/${carType.name}`}
                              className="btn btn-sm btn-outline-secondary"
                            >
                              ECUs
                            </Link>
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
      </div>
    </div>
  );
}

export default Dashboard;
