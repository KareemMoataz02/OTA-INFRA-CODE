import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import carTypeService from "../../services/carTypeService";
import Loading from "../common/Loading";

function CarTypeList({ showAlert }) {
  const [carTypes, setCarTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchCarTypes();
  }, []);

  const fetchCarTypes = async () => {
    try {
      setLoading(true);
      const data = await carTypeService.getAllCarTypes();
      setCarTypes(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching car types:", err);
      setError("Failed to fetch car types. Please try again later.");
      showAlert("error", "Failed to fetch car types");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = async (name) => {
    if (confirmDelete === name) {
      try {
        await carTypeService.deleteCarType(name);
        showAlert("success", `Car type ${name} deleted successfully`);
        fetchCarTypes(); // Refresh the list
      } catch (err) {
        console.error("Error deleting car type:", err);
        showAlert("error", `Failed to delete car type ${name}`);
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(name);
    }
  };

  // Filter car types based on search term
  const filteredCarTypes = carTypes.filter(
    (carType) =>
      carType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carType.model_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loading message="Loading car types..." />;
  }

  return (
    <div className="car-type-list">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Car Types</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <Link to="/car-types/new" className="btn btn-sm btn-primary">
            <i className="bi bi-plus-circle me-1"></i> Add Car Type
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name or model number..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {filteredCarTypes.length === 0 ? (
        <div className="alert alert-info" role="alert">
          {searchTerm
            ? "No car types match your search criteria."
            : "No car types available. Add one to get started."}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>Model Number</th>
                <th>Manufactured Count</th>
                <th>Car IDs Count</th>
                <th>ECUs Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCarTypes.map((carType) => (
                <tr key={carType.name}>
                  <td>{carType.name}</td>
                  <td>{carType.model_number}</td>
                  <td>{carType.manufactured_count}</td>
                  <td>{carType.car_ids_count}</td>
                  <td>{carType.ecus_count}</td>
                  <td>
                    <div className="btn-group">
                      <Link
                        to={`/car-types/${carType.name}`}
                        className="btn btn-sm btn-outline-info"
                      >
                        <i className="bi bi-eye"></i>
                      </Link>
                      <Link
                        to={`/car-types/edit/${carType.name}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-pencil"></i>
                      </Link>
                      <Link
                        to={`/ecus/${carType.name}`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        <i className="bi bi-cpu"></i>
                      </Link>
                      <button
                        className={`btn btn-sm ${
                          confirmDelete === carType.name
                            ? "btn-danger"
                            : "btn-outline-danger"
                        }`}
                        onClick={() => handleDelete(carType.name)}
                      >
                        {confirmDelete === carType.name ? (
                          "Confirm"
                        ) : (
                          <i className="bi bi-trash"></i>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link to="/car-types/stats" className="btn btn-outline-secondary">
          <i className="bi bi-graph-up me-1"></i> View Statistics
        </Link>
      </div>
    </div>
  );
}

export default CarTypeList;
