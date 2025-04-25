import React from "react";
import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const location = useLocation();

  // Check if the current path matches the menu item
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      id="sidebar"
      className="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse"
    >
      <div className="position-sticky pt-3">
        <ul className="nav flex-column">
          <li className="nav-item">
            <Link
              className={`nav-link ${
                isActive("/") &&
                !isActive("/car-types") &&
                !isActive("/ecus") &&
                !isActive("/versions")
                  ? "active"
                  : ""
              }`}
              to="/"
            >
              <i className="bi bi-speedometer2 me-2"></i>
              Dashboard
            </Link>
          </li>

          <li className="nav-item">
            <Link
              className={`nav-link ${isActive("/car-types") ? "active" : ""}`}
              to="/car-types"
            >
              <i className="bi bi-car-front me-2"></i>
              Car Types
            </Link>
          </li>
        </ul>

        <h6 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
          <span>Quick Actions</span>
        </h6>
        <ul className="nav flex-column mb-2">
          <li className="nav-item">
            <Link className="nav-link" to="/car-types/new">
              <i className="bi bi-plus-circle me-2"></i>
              New Car Type
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/versions/upload">
              <i className="bi bi-upload me-2"></i>
              Upload Firmware
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Sidebar;
