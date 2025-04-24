from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from models import ServiceRequest, DownloadRequest, RequestStatus, ServiceType

request_bp = Blueprint('request', __name__)

@request_bp.route('/service', methods=['POST'])
def create_service_request():
    """Create a new service request"""
    data = request.json
    
    if not data or not data.get('car_id') or not data.get('car_type'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Extract data
    car_id = data.get('car_id')
    car_type = data.get('car_type')
    ip_address = data.get('ip_address', request.remote_addr)
    port = data.get('port', 0)
    
    # Validate service type
    try:
        service_type = ServiceType(data.get('service_type', 'DIAGNOSTICS'))
    except ValueError:
        return jsonify({'error': 'Invalid service type'}), 400
    
    # Create service request
    service_request = ServiceRequest(
        timestamp=datetime.now(),
        car_type=car_type,
        car_id=car_id,
        ip_address=ip_address,
        port=port,
        service_type=service_type,
        metadata=data.get('metadata', {}),
        status=RequestStatus.PENDING
    )
    
    # Save to database
    request_service = current_app.db_service.get_request_service()
    success = request_service.create_service_request(service_request)
    
    if success:
        return jsonify({'message': 'Service request created successfully'}), 201
    else:
        return jsonify({'error': 'Failed to create service request'}), 500

@request_bp.route('/download', methods=['POST'])
def create_download_request():
    """Create a new download request"""
    data = request.json
    
    if not data or not data.get('car_id') or not data.get('car_type') or not data.get('required_versions'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Extract data
    car_id = data.get('car_id')
    car_type = data.get('car_type')
    ip_address = data.get('ip_address', request.remote_addr)
    port = data.get('port', 0)
    required_versions = data.get('required_versions', [])
    old_versions = data.get('old_versions', [])
    
    # Calculate total size - assuming required_versions is a list of dicts with version info
    total_size = 0
    version_service = current_app.db_service.get_version_service()
    
    for version_info in required_versions:
        if 'hex_file_path' in version_info:
            file_size = version_service.get_file_size(version_info['hex_file_path'])
            total_size += file_size
    
    # Create download request
    download_request = DownloadRequest(
        timestamp=datetime.now(),
        car_type=car_type,
        car_id=car_id,
        ip_address=ip_address,
        port=port,
        required_versions=required_versions,
        old_versions=old_versions,
        status=RequestStatus.PENDING,
        total_size=total_size,
        transferred_size=0,
        active_transfers={}
    )
    
    # Save to database
    request_service = current_app.db_service.get_request_service()
    success = request_service.create_download_request(download_request)
    
    if success:
        return jsonify({
            'message': 'Download request created successfully',
            'request_id': car_id,  # Using car_id as request identifier
            'total_size': total_size
        }), 201
    else:
        return jsonify({'error': 'Failed to create download request'}), 500

@request_bp.route('/download/<car_id>/status', methods=['PUT'])
def update_download_status(car_id):
    """Update the status of a download request"""
    data = request.json
    
    if not data or 'status' not in data:
        return jsonify({'error': 'Missing status field'}), 400
    
    # Validate status
    try:
        status = RequestStatus(data['status'])
    except ValueError:
        return jsonify({'error': 'Invalid status value'}), 400
    
    # Get transferred size if provided
    transferred_size = data.get('transferred_size')
    
    # Update status
    request_service = current_app.db_service.get_request_service()
    success = request_service.update_download_request_status(car_id, status, transferred_size)
    
    if success:
        return jsonify({'message': 'Status updated successfully'})
    else:
        return jsonify({'error': 'Failed to update status'}), 500

@request_bp.route('/car/<car_id>', methods=['GET'])
def get_requests_for_car(car_id):
    """Get all requests for a specific car"""
    request_service = current_app.db_service.get_request_service()
    
    # Get both service and download requests
    service_requests = request_service.get_service_requests_by_car_id(car_id)
    download_requests = request_service.get_download_requests_by_car_id(car_id)
    
    result = {
        'service_requests': service_requests,
        'download_requests': download_requests
    }
    
    return jsonify(result)

@request_bp.route('/service/status/<status>', methods=['GET'])
def get_service_requests_by_status(status):
    """Get all service requests with a specific status"""
    try:
        status_enum = RequestStatus(status)
    except ValueError:
        return jsonify({'error': 'Invalid status value'}), 400
    
    request_service = current_app.db_service.get_request_service()
    service_requests = request_service.get_service_requests_by_status(status_enum)
    
    return jsonify(service_requests)

@request_bp.route('/download/status/<status>', methods=['GET'])
def get_download_requests_by_status(status):
    """Get all download requests with a specific status"""
    try:
        status_enum = RequestStatus(status)
    except ValueError:
        return jsonify({'error': 'Invalid status value'}), 400
    
    request_service = current_app.db_service.get_request_service()
    download_requests = request_service.get_download_requests_by_status(status_enum)
    
    return jsonify(download_requests)

@request_bp.route('/download/active', methods=['GET'])
def get_active_downloads():
    """Get all active download requests"""
    request_service = current_app.db_service.get_request_service()
    active_downloads = request_service.get_active_download_requests()
    
    return jsonify(active_downloads)