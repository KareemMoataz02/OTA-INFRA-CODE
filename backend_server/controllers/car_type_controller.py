from flask import Blueprint, jsonify, request, current_app
from models import CarType, ECU, Version


car_type_bp = Blueprint('car_type', __name__)


@car_type_bp.route('/', methods=['GET'])
@car_type_bp.route('', methods=['GET'])
def get_all_car_types():
    """Get all car types"""
    service = current_app.db_service.get_car_type_service()
    car_types = service.get_all()

    # Convert car types to serializable format
    result = []
    for car_type in car_types:
        result.append({
            'id': str(car_type.id),  # Convert ObjectId to string
            'name': car_type.name,
            'model_number': car_type.model_number,
            'manufactured_count': car_type.manufactured_count,
            'car_ids_count': len(car_type.car_ids),
            # Convert each ObjectId to string
            'car_ids': [str(car_id) for car_id in car_type.car_ids],
            'ecus_count': len(car_type.ecus),
            # Convert each ObjectId to string
            'ecus_id': [str(ecu) for ecu in car_type.ecu_ids],
        })

    return jsonify(result)


@car_type_bp.route('/<name>/', methods=['GET'])
@car_type_bp.route('/<name>', methods=['GET'])
def get_car_type(name):
    """Get a specific car type by name"""
    service = current_app.db_service.get_car_type_service()
    car_type = service.get_by_name(name.lower())

    if not car_type:
        return jsonify({'error': 'Car type not found'}), 404

    # Convert to serializable format
    ecus = []
    for ecu in car_type.ecus:
        versions = []
        for version in ecu.versions:
            versions.append({
                'version_number': version.version_number,
                'compatible_car_types': version.compatible_car_types,
                'hex_file_path': version.hex_file_path
            })

        ecus.append({
            'name': ecu.name,
            'model_number': ecu.model_number,
            'versions': versions
        })

    result = {
        'name': car_type.name,
        'model_number': car_type.model_number,
        'manufactured_count': car_type.manufactured_count,
        'car_ids': car_type.car_ids,
        'ecus': ecus
    }

    return jsonify(result)


@car_type_bp.route('/model/<model_number>/', methods=['GET'])
@car_type_bp.route('/model/<model_number>', methods=['GET'])
def get_car_type_by_model(model_number):
    """Get a specific car type by model number"""
    service = current_app.db_service.get_car_type_service()
    car_type = service.get_by_model_number(model_number)

    if not car_type:
        return jsonify({'error': 'Car type not found'}), 404

    # Convert to serializable format (reuse the same structure as get_car_type)
    ecus = []
    for ecu in car_type.ecus:
        versions = []
        for version in ecu.versions:
            versions.append({
                'version_number': version.version_number,
                'compatible_car_types': version.compatible_car_types,
                'hex_file_path': version.hex_file_path
            })

        ecus.append({
            'name': ecu.name,
            'model_number': ecu.model_number,
            'versions': versions
        })

    result = {
        'name': car_type.name,
        'model_number': car_type.model_number,
        'manufactured_count': car_type.manufactured_count,
        'car_ids': car_type.car_ids,
        'ecus': ecus
    }

    return jsonify(result)


@car_type_bp.route('/', methods=['POST'])
@car_type_bp.route('', methods=['POST'])
def create_car_type():
    """Create a new car type"""
    data = request.json

    if not data or not data.get('name') or not data.get('model_number'):
        return jsonify({'error': 'Missing required fields'}), 400

    # Get required services
    db_service = current_app.db_service
    car_type_service = db_service.get_car_type_service()
    ecu_service = db_service.get_ecu_service()

    ecus_ids = []  # Change to store ECU IDs instead of ECU objects

    for ecu_data in data.get('ecus', []):
        # Check if this ECU already exists
        ecu = ecu_service.get_by_name_and_model(
            ecu_data['name'], 
            ecu_data['model_number']
        )
        
        if not ecu:
            # Create new ECU with versions
            versions = []
            for version_data in ecu_data.get('versions', []):
                versions.append(Version(
                    version_number=version_data['version_number'],
                    compatible_car_types=version_data.get('compatible_car_types', []),
                    hex_file_path=version_data.get('hex_file_path', '')
                ))

            ecu = ECU(
                name=ecu_data['name'],
                model_number=ecu_data['model_number'],
                versions=versions
            )
            
            # Save the ECU using the service and get the ID
            ecu_id = ecu_service.save(ecu)
            if ecu_id:
                ecus_ids.append(ecu_id)

        else:
            # If ECU already exists, just use its ID
            if hasattr(ecu, '_id') and ecu._id:
                ecus_ids.append(ecu._id)


    car_ids = [car_id.lower() for car_id in data.get('car_ids', [])]

    # Create car type
    car_type = CarType(
        name=data['name'],
        model_number=data['model_number'],
        ecus=ecus_ids,
        manufactured_count=data.get('manufactured_count', 0),
        car_ids=car_ids
    )

    try: 
        # Save to database using service
        success = car_type_service.save(car_type)

        if success:
            return jsonify({
                'message': 'Car type created successfully',
                'car_type': {
                    'name': car_type.name,
                    'model_number': car_type.model_number,
                    'ecu_count': len(car_type.ecus),
                    'manufactured_count': car_type.manufactured_count
                }
            }), 201
        else:
            return jsonify({'error': 'Failed to create car type. Name and model number combination may already exist.'}), 500
    except Exception as e:
        return jsonify({'message': 'Failed to create car type. Name and model number combination may already exist.'}), 409
    

# Needs to be tested
@car_type_bp.route('/<name>/', methods=['PUT'])
@car_type_bp.route('/<name>', methods=['PUT'])
def update_car_type(name):
    """Update an existing car type"""
    service = current_app.db_service.get_car_type_service()
    car_type = service.get_by_name(name)
    ecu_service = current_app.db_service.get_ecu_service()

    if not car_type:
        return jsonify({'error': 'Car type not found'}), 404

    data = request.json

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Handle ECUs update if provided - this would require rebuilding the entire car type
    if 'ecus' in data:
        ecus_ids = []
        # Create new ECUs list
        for ecu_data in data['ecus']:
            versions = []
            for version_data in ecu_data.get('versions', []):
                versions.append(Version(
                    version_number=version_data['version_number'],
                    compatible_car_types=version_data.get(
                        'compatible_car_types', []),
                    hex_file_path=version_data.get('hex_file_path', '')
                ))

            ecu = ECU(
                name=ecu_data['name'],
                model_number=ecu_data['model_number'],
                versions=versions
            )

                        # Save the ECU using the service and get the ID
            ecu_id = ecu_service.save(ecu)
            if ecu_id:
                ecus_ids.append(ecu_id)

        # Replace the 'ecus' field with 'ecu_ids' in the data
        data.pop('ecus')  # Remove the 'ecus' field
        data['ecu_ids'] = ecus_ids  # Add the 'ecu_ids' field instead

    # Update simple fields
    if 'model_number' in data:
        car_type.model_number = data['model_number']

    if 'manufactured_count' in data:
        car_type.manufactured_count = data['manufactured_count']

    if 'car_ids' in data:
        # car_type.car_ids = data['car_ids']
        car_type.car_ids = [car_id.lower() for car_id in data['car_ids']]


    # Save updated car type
    success = service.update(name.lower(), data)

    if success:
        return jsonify({'message': 'Car type updated successfully'})
    else:
        return jsonify({'error': 'Failed to update car type'}), 500


# Needs to be tested
@car_type_bp.route('/<name>/', methods=['PATCH'])
@car_type_bp.route('/<name>', methods=['PATCH'])
def partial_update_car_type(name):
    """Partially update a car type"""
    service = current_app.db_service.get_car_type_service()

    # Check if car type exists
    car_type = service.get_by_name(name)
    if not car_type:
        return jsonify({'error': 'Car type not found'}), 404

    data = request.json

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Build update data dictionary
    update_data = {}

    # Only include fields that can be directly updated
    if 'model_number' in data:
        update_data['model_number'] = data['model_number']

    if 'manufactured_count' in data:
        update_data['manufactured_count'] = data['manufactured_count']

    if 'car_ids' in data:
        update_data['car_ids'] = data['car_ids']

    # If there are fields to update
    if update_data:
        success = service.update(name, update_data)
        if success:
            return jsonify({'message': 'Car type updated successfully'})
        else:
            return jsonify({'error': 'Failed to update car type'}), 500

    # If no valid fields provided
    return jsonify({'message': 'No fields to update'})


@car_type_bp.route('/<name>/', methods=['DELETE'])
@car_type_bp.route('/<name>', methods=['DELETE'])
def delete_car_type(name):
    """Delete a car type"""
    service = current_app.db_service.get_car_type_service()

    # Check if car type exists
    car_type = service.get_by_name(name)
    if not car_type:
        return jsonify({'error': 'Car type not found'}), 404

    success = service.delete(name)

    if success:
        return jsonify({'message': 'Car type deleted successfully'})
    else:
        return jsonify({'error': 'Failed to delete car type'}), 500


@car_type_bp.route('/statistics/', methods=['GET'])
@car_type_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get statistics about car types"""
    service = current_app.db_service.get_car_type_service()
    stats = service.get_statistics()
    return jsonify(stats)


@car_type_bp.route('/by-ecu/<ecu_name>/', methods=['GET'])
@car_type_bp.route('/by-ecu/<ecu_name>', methods=['GET'])
def get_car_types_by_ecu_name(ecu_name):
    """Get all car types that have an ECU with the given name"""
    service = current_app.db_service.get_ecu_service()
    car_types = service.get_by_ecu_name(ecu_name)

    if not car_types:
        return jsonify([]), 200  # Return empty array with 200 OK

    # Convert car types to serializable format
    result = []
    for car_type in car_types:
        # Convert ECUs to simple format
        ecus = []
        for ecu in car_type.ecus:
            # Only include basic ECU info to keep response size manageable
            ecus.append({
                'name': ecu.name,
                'model_number': ecu.model_number,
                'versions_count': len(ecu.versions) if hasattr(ecu, 'versions') else 0
            })

        result.append({
            'name': car_type.name,
            'model_number': car_type.model_number,
            'manufactured_count': car_type.manufactured_count,
            'car_ids_count': len(car_type.car_ids) if hasattr(car_type, 'car_ids') else 0,
            'ecus': ecus
        })

    return jsonify(result)