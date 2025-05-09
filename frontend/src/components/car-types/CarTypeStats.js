import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import carTypeService from "../../services/carTypeService";
import Loading from "../common/Loading";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

function CarTypeStats({ showAlert }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await carTypeService.getCarTypeStatistics();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching car type statistics:", err);
        setError(
          "Failed to fetch car type statistics. Please try again later."
        );
        showAlert("error", "Failed to fetch car type statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [showAlert]);

  if (loading) {
    return <Loading message="Loading car type statistics..." />;
  }

  if (error || !stats) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || "Failed to load statistics"}
      </div>
    );
  }

  // Prepare data for Charts
  const manufacturingData = {
    labels: stats.car_type_details.map((ct) => ct.name),
    datasets: [
      {
        label: "Manufactured Count",
        data: stats.car_type_details.map((ct) => ct.manufactured_count),
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const ecuCountData = {
    labels: stats.car_type_details.map((ct) => ct.name),
    datasets: [
      {
        label: "ECU Count",
        data: stats.car_type_details.map((ct) => ct.ecu_count),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const carIdsData = {
    labels: stats.car_type_details.map((ct) => ct.name),
    datasets: [
      {
        label: "Car IDs Count",
        data: stats.car_type_details.map((ct) => ct.car_ids_count),
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Car Type Statistics",
      },
    },
  };

  return (
    <div className="car-type-stats">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Car Type Statistics</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <Link to="/car-types" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i> Back to Car Types
          </Link>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Overview</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-center">
                <div className="text-center">
                  <div className="display-4">{stats.total_car_types}</div>
                  <p className="text-muted">Total Car Types</p>
                </div>
              </div>
              <hr />
              <div className="d-flex justify-content-center">
                <div className="text-center">
                  <div className="display-4">{stats.total_manufactured}</div>
                  <p className="text-muted">Total Manufactured</p>
                </div>
              </div>
              <hr />
              <div className="d-flex justify-content-center">
                <div className="text-center">
                  <div className="display-4">
                    {stats.car_type_details.reduce(
                      (total, ct) => total + ct.ecu_count,
                      0
                    )}
                  </div>
                  <p className="text-muted">Total ECUs</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Manufacturing Distribution</h5>
            </div>
            <div className="card-body">
              <Pie data={manufacturingData} />
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">ECUs per Car Type</h5>
            </div>
            <div className="card-body">
              <Bar options={barOptions} data={ecuCountData} />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Cars per Car Type</h5>
            </div>
            <div className="card-body">
              <Bar options={barOptions} data={carIdsData} />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Detailed Statistics</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Car Type</th>
                  <th>Model Number</th>
                  <th>Manufactured Count</th>
                  <th>Car IDs Count</th>
                  <th>ECUs Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.car_type_details.map((ct, index) => (
                  <tr key={index}>
                    <td>{ct.name}</td>
                    <td>{ct.model_number}</td>
                    <td>{ct.manufactured_count}</td>
                    <td>{ct.car_ids_count}</td>
                    <td>{ct.ecu_count}</td>
                    <td>
                      <Link
                        to={`/car-types/${ct.name}`}
                        className="btn btn-sm btn-outline-info"
                      >
                        <i className="bi bi-eye"></i> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarTypeStats;
