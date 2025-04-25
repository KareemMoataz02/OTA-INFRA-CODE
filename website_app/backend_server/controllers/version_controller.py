from flask import Blueprint, jsonify, request, current_app, send_file
import os
import io
from azure.storage.blob import BlobServiceClient, ContentSettings
import uuid

version_bp = Blueprint('version', __name__)

@version_bp.route('/ecu/<ecu_name>/<ecu_model>/', methods=['GET'])
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

@version_bp.route('/ecu/<ecu_name>/<ecu_model>/<version_number>/', methods=['GET'])
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

@version_bp.route('/download/<ecu_name>/<ecu_model>/<version_number>/', methods=['GET'])
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

@version_bp.route('/stream/<ecu_name>/<ecu_model>/<version_number>/', methods=['GET'])
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

@version_bp.route('/compatible/<car_type_name>/', methods=['GET'])
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


@version_bp.route('/upload', methods=['POST'])
def upload_firmware():
    """Upload a new firmware version"""
    try:
        # Check if the file is in the request
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        
        # Check if a file was actually selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        # Get other form data
        ecu_name = request.form.get('ecuName')
        ecu_model = request.form.get('ecuModel')
        version_number = request.form.get('versionNumber')
        hex_file_path = request.form.get('hexFilePath')
        compatible_car_types = request.form.get('compatibleCarTypes')
        
        # Validate required fields
        if not all([ecu_name, ecu_model, version_number, hex_file_path]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Parse compatible car types from JSON string
        import json
        compatible_car_types = json.loads(compatible_car_types)
        
        # Create the destination directory if it doesn't exist
        data_dir = current_app.config['DATA_DIRECTORY']
        hex_files_dir = os.path.join(data_dir, 'hex_files')
        os.makedirs(hex_files_dir, exist_ok=True)
        
        # Save the file
        file_path = os.path.join(hex_files_dir, os.path.basename(hex_file_path))
        file.save(file_path)
        
        # Now create the version in the database
        db_service = current_app.db_service
        ecu_service = db_service.get_ecu_service()
        
        # Get the ECU first
        ecu = ecu_service.get_by_name_and_model(ecu_name, ecu_model)
        
        if not ecu:
            return jsonify({'error': 'ECU not found'}), 404
            
        # Create a new version and add it to the ECU
        from models import Version
        new_version = Version(
            version_number=version_number,
            compatible_car_types=compatible_car_types,
            hex_file_path=hex_file_path
        )
        
        # Add the version to the ECU and save
        ecu.versions.append(new_version)
        
        # Get the car type for this ECU and update it
        car_type_service = db_service.get_car_type_service()
        for car_type in car_type_service.get_all():
            for ct_ecu in car_type.ecus:
                if ct_ecu.name == ecu.name and ct_ecu.model_number == ecu.model_number:
                    # Found the car type that has this ECU
                    # Update the ECU in this car type
                    for i, e in enumerate(car_type.ecus):
                        if e.name == ecu.name and e.model_number == ecu.model_number:
                            car_type.ecus[i] = ecu
                            break
                    
                    # Save the updated car type
                    car_type_service.save(car_type)
                    break
        
        return jsonify({
            'message': 'Firmware uploaded successfully',
            'version': {
                'version_number': version_number,
                'hex_file_path': hex_file_path,
                'compatible_car_types': compatible_car_types
            }
        }), 201
        
    except Exception as e:
        print(f"Error uploading firmware: {str(e)}")
        return jsonify({'error': f'Failed to upload firmware: {str(e)}'}), 500


# Azure Storage configuration
hex_storage_account_name = "otahexstorage"
hex_storage_container_name = "hexfiles"
from dotenv import load_dotenv
load_dotenv()
hex_storage_account_key = os.getenv("HEX_STORAGE_ACCOUNT_KEY")

@version_bp.route('/upload-to-azure', methods=['POST'])
def upload_firmware_to_azure():
    """Upload a new firmware version to Azure Blob Storage"""
    try:
        # Check if the file is in the request
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        
        # Check if a file was actually selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        # Get other form data
        ecu_name = request.form.get('ecuName')
        ecu_model = request.form.get('ecuModel')
        version_number = request.form.get('versionNumber')
        compatible_car_types = request.form.get('compatibleCarTypes')
        
        # Validate required fields
        if not all([ecu_name, ecu_model, version_number]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Parse compatible car types from JSON string
        import json
        compatible_car_types = json.loads(compatible_car_types)
        
        # Create a unique blob name
        file_extension = os.path.splitext(file.filename)[1]
        blob_name = f"{ecu_name}_{ecu_model}_{version_number}_{uuid.uuid4().hex}{file_extension}"
        
        # Connect to Azure Blob Storage
        connection_string = (f"DefaultEndpointsProtocol=https;AccountName={hex_storage_account_name};"
                            f"AccountKey={hex_storage_account_key};EndpointSuffix=core.windows.net")
        
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        container_client = blob_service_client.get_container_client(hex_storage_container_name)
        
        # Upload the file
        blob_client = container_client.get_blob_client(blob_name)
        file_data = file.read()  # Read file content
        
        content_settings = ContentSettings(content_type=file.content_type)
        blob_client.upload_blob(file_data, overwrite=True, content_settings=content_settings)
        
        # Generate the URL for the blob
        blob_url = f"https://{hex_storage_account_name}.blob.core.windows.net/{hex_storage_container_name}/{blob_name}"
        
        # Now create the version in the database with the blob URL as hex_file_path
        db_service = current_app.db_service
        ecu_service = db_service.get_ecu_service()
        
        # Get the ECU first
        ecu = ecu_service.get_by_name_and_model(ecu_name, ecu_model)
        
        if not ecu:
            return jsonify({'error': 'ECU not found'}), 404
            
        # Create a new version and add it to the ECU
        from models import Version
        new_version = Version(
            version_number=version_number,
            compatible_car_types=compatible_car_types,
            hex_file_path=blob_url  # Store the Azure Blob URL
        )
        
        # Add the version to the ECU
        ecu.versions.append(new_version)
        
        # Get the car type for this ECU and update it
        car_type_service = db_service.get_car_type_service()
        for car_type in car_type_service.get_all():
            for ct_ecu in car_type.ecus:
                if ct_ecu.name == ecu.name and ct_ecu.model_number == ecu.model_number:
                    # Found the car type that has this ECU
                    # Update the ECU in this car type
                    for i, e in enumerate(car_type.ecus):
                        if e.name == ecu.name and e.model_number == ecu.model_number:
                            car_type.ecus[i] = ecu
                            break
                    
                    # Save the updated car type
                    car_type_service.save(car_type)
                    break
        
        return jsonify({
            'message': 'Firmware uploaded successfully to Azure Blob Storage',
            'version': {
                'version_number': version_number,
                'hex_file_path': blob_url,
                'compatible_car_types': compatible_car_types
            }
        }), 201
        
    except Exception as e:
        print(f"Error uploading firmware to Azure: {str(e)}")
        return jsonify({'error': f'Failed to upload firmware: {str(e)}'}), 500