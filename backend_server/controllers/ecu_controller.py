from flask import Blueprint, jsonify, request, current_app

ecu_bp = Blueprint('ecu', __name__)


@ecu_bp.route('/car-type/<car_type_name>/', methods=['GET'])
@ecu_bp.route('/car-type/<car_type_name>', methods=['GET'])
def get_ecus_for_car_type(car_type_name):
    """Get all ECUs for a specific car type"""
    # First get the car type to extract its ECUs
    car_type_service = current_app.db_service.get_car_type_service()
    car_type = car_type_service.get_by_name(car_type_name)

    if not car_type or not car_type.ecus:
        return jsonify([])

    # Convert to serializable format
    result = []
    for ecu in car_type.ecus:
        # Only include basic info, not all versions
        result.append({
            'name': ecu.name,
            'model_number': ecu.model_number,
            'versions_count': len(ecu.versions)
        })

    return jsonify(result)


@ecu_bp.route('/<ecu_name>/<ecu_model>/', methods=['GET'])
@ecu_bp.route('/<ecu_name>/<ecu_model>', methods=['GET'])
def get_ecu_details(ecu_name, ecu_model):
    """Get details for a specific ECU"""
    ecu_service = current_app.db_service.get_ecu_service()
    ecu = ecu_service.get_by_name_and_model(ecu_name, ecu_model)

    if not ecu:
        return jsonify({'error': 'ECU not found'}), 404

    # Convert to serializable format including all versions
    versions = []
    for version in ecu.versions:
        versions.append({
            'version_number': version.version_number,
            'compatible_car_types': version.compatible_car_types,
            'hex_file_path': version.hex_file_path
        })

    result = {
        'name': ecu.name,
        'model_number': ecu.model_number,
        'versions': versions
    }

    return jsonify(result)


@ecu_bp.route('/compatible/<car_type_name>/', methods=['GET'])
@ecu_bp.route('/compatible/<car_type_name>', methods=['GET'])
def get_compatible_ecus(car_type_name):
    """Get all ECUs compatible with a specific car type"""
    ecu_service = current_app.db_service.get_ecu_service()
    compatible_ecus = ecu_service.get_compatible_ecus(car_type_name)

    # if not compatible_ecus:
    #     return jsonify({'message': 'No compatible ECUs found'}), 404

    return jsonify(compatible_ecus)


@ecu_bp.route('/', methods=['GET'])
@ecu_bp.route('', methods=['GET'])
def get_all_ecus():
    """Get all ECUs from the database"""
    try:
        # Get the ECU service from the database service
        db_service = current_app.db_service
        ecu_service = db_service.get_ecu_service()
        
        # Get all ECUs
        ecus = ecu_service.get_all()
        
        # Convert ECUs to JSON-serializable format
        ecus_data = []
        for ecu in ecus:
            # Convert versions to dictionaries
            versions = []
            for version in ecu.versions:
                versions.append({
                    "version_number": version.version_number,
                    "compatible_car_types": version.compatible_car_types,
                    "hex_file_path": version.hex_file_path
                })
            
            # Add ECU data to the list
            ecus_data.append({
                "_id": str(ecu._id) if hasattr(ecu, '_id') else None,
                "name": ecu.name,
                "model_number": ecu.model_number,
                "versions": versions
            })
        
        return jsonify(ecus_data), 200
    except Exception as e:
        print(f"Error fetching ECUs: {str(e)}")
        return jsonify({"error": f"Failed to fetch ECUs: {str(e)}"}), 500
    