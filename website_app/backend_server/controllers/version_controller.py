from flask import Blueprint, jsonify, request, current_app, send_file
import os
import io

version_bp = Blueprint('version', __name__)

@version_bp.route('/ecu/<ecu_name>/<ecu_model>', methods=['GET'])
def get_versions_for_ecu(ecu_name, ecu_model):
    """Get all versions for a specific ECU"""
    # First get the ECU
    ecu_service = current_app.db_service.get_ecu_service()
    ecu = ecu_service.get_by_name_and_model(ecu_name, ecu_model)
    
    if not ecu or not ecu.versions:
        return jsonify({'error': 'ECU not found or has no versions'}), 404
    
    # Convert to serializable format
    result = []
    for version in ecu.versions:
        result.append({
            'version_number': version.version_number,
            'compatible_car_types': version.compatible_car_types,
            'hex_file_path': version.hex_file_path
        })
    
    return jsonify(result)

@version_bp.route('/ecu/<ecu_name>/<ecu_model>/<version_number>', methods=['GET'])
def get_version_details(ecu_name, ecu_model, version_number):
    """Get details for a specific version"""
    # First get the ECU
    ecu_service = current_app.db_service.get_ecu_service()
    ecu = ecu_service.get_by_name_and_model(ecu_name, ecu_model)
    
    if not ecu:
        return jsonify({'error': 'ECU not found'}), 404
    
    # Find the version
    version = None
    for v in ecu.versions:
        if v.version_number == version_number:
            version = v
            break
    
    if not version:
        return jsonify({'error': 'Version not found'}), 404
    
    # Get file size
    version_service = current_app.db_service.get_version_service()
    file_size = version_service.get_file_size(version.hex_file_path)
    
    result = {
        'version_number': version.version_number,
        'compatible_car_types': version.compatible_car_types,
        'hex_file_path': version.hex_file_path,
        'file_size': file_size
    }
    
    return jsonify(result)

@version_bp.route('/download/<ecu_name>/<ecu_model>/<version_number>', methods=['GET'])
def download_hex_file(ecu_name, ecu_model, version_number):
    """Download a hex file for a specific version"""
    # First get the ECU
    ecu_service = current_app.db_service.get_ecu_service()
    ecu = ecu_service.get_by_name_and_model(ecu_name, ecu_model)
    
    if not ecu:
        return jsonify({'error': 'ECU not found'}), 404
    
    # Find the version
    version = None
    for v in ecu.versions:
        if v.version_number == version_number:
            version = v
            break
    
    if not version:
        return jsonify({'error': 'Version not found'}), 404
    
    file_path = version.hex_file_path
    
    # Check if file exists
    if not os.path.exists(file_path):
        return jsonify({'error': 'Hex file not found'}), 404
    
    # Return the file
    return send_file(file_path, as_attachment=True, 
                    download_name=f"{ecu_name}_{ecu_model}_v{version_number}.hex")

@version_bp.route('/stream/<ecu_name>/<ecu_model>/<version_number>', methods=['GET'])
def stream_hex_file(ecu_name, ecu_model, version_number):
    """Stream a hex file in chunks"""
    # First get the ECU
    ecu_service = current_app.db_service.get_ecu_service()
    ecu = ecu_service.get_by_name_and_model(ecu_name, ecu_model)
    
    if not ecu:
        return jsonify({'error': 'ECU not found'}), 404
    
    # Find the version
    version = None
    for v in ecu.versions:
        if v.version_number == version_number:
            version = v
            break
    
    if not version:
        return jsonify({'error': 'Version not found'}), 404
    
    # Get query parameters
    chunk_size = request.args.get('chunk_size', 1024, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Get chunk
    version_service = current_app.db_service.get_version_service()
    chunk = version_service.get_hex_file_chunk(version.hex_file_path, chunk_size, offset)
    
    if chunk is None:
        return jsonify({'error': 'Failed to read file chunk'}), 500
    
    # Get total file size
    file_size = version_service.get_file_size(version.hex_file_path)
    
    # Create response
    return send_file(
        io.BytesIO(chunk),
        mimetype='application/octet-stream',
        as_attachment=True,
        download_name=f"{ecu_name}_{ecu_model}_v{version_number}_chunk.hex"
    ), 200, {
        'Content-Range': f'bytes {offset}-{offset + len(chunk) - 1}/{file_size}',
        'Accept-Ranges': 'bytes',
        'Content-Length': str(len(chunk))
    }

@version_bp.route('/compatible/<car_type_name>', methods=['GET'])
def get_compatible_versions(car_type_name):
    """Get all versions compatible with a specific car type"""
    version_service = current_app.db_service.get_version_service()
    car_type_service = current_app.db_service.get_car_type_service()
    
    # Get all car types to extract ECU information
    car_types = car_type_service.get_all()
    
    compatible_versions = []
    
    # For each car type, check ECUs and their versions for compatibility
    for car_type in car_types:
        for ecu in car_type.ecus:
            for version in ecu.versions:
                if car_type_name in version.compatible_car_types:
                    compatible_versions.append({
                        'ecu_name': ecu.name,
                        'ecu_model': ecu.model_number,
                        'version_number': version.version_number,
                        'hex_file_path': version.hex_file_path
                    })
    
    if not compatible_versions:
        return jsonify({'message': 'No compatible versions found'}), 404
    
    return jsonify(compatible_versions)