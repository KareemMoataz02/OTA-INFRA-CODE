import React from "react";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer mt-auto py-3 bg-dark text-white">
      <div className="container text-center">
        <span>Automotive Firmware Management System © {currentYear}</span>
      </div>
    </footer>
  );
}

export default Footer;
