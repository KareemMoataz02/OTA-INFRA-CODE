from flask import Blueprint, jsonify, request, current_app
from models import CarType, ECU, Version
from bson import ObjectId

car_type_bp = Blueprint('car_type', __name__)

@car_type_bp.route('/', methods=['GET'])
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
            'car_ids': [str(car_id) for car_id in car_type.car_ids],  # Convert each ObjectId to string
            'ecus_count': len(car_type.ecus),
            'ecus_id': [str(ecu) for ecu in car_type.ecu_ids],  # Convert each ObjectId to string
        })
    
    return jsonify(result)


@car_type_bp.route('/<name>/', methods=['GET'])
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
def create_car_type():
    """Create a new car type"""
    data = request.json
    
    if not data or not data.get('name') or not data.get('model_number'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Create ECUs
    ecus = []
    for ecu_data in data.get('ecus', []):
        versions = []
        for version_data in ecu_data.get('versions', []):
            versions.append(Version(
                version_number=version_data['version_number'],
                compatible_car_types=version_data.get('compatible_car_types', []),
                hex_file_path=version_data.get('hex_file_path', '')
            ))
        
        ecus.append(ECU(
            name=ecu_data['name'],
            model_number=ecu_data['model_number'],
            versions=versions
        ))
    
    # Create car type
    car_type = CarType(
        name=data['name'],
        model_number=data['model_number'],
        ecus=ecus,
        manufactured_count=data.get('manufactured_count', 0),
        car_ids=data.get('car_ids', [])
    )
    
    # Save to database
    service = current_app.db_service.get_car_type_service()
    success = service.save(car_type)
    
    if success:
        return jsonify({'message': 'Car type created successfully'}), 201
    else:
        return jsonify({'error': 'Failed to create car type'}), 500



# Needs to be tested
@car_type_bp.route('/<name>/', methods=['PUT'])
def update_car_type(name):
    """Update an existing car type"""
    service = current_app.db_service.get_car_type_service()
    car_type = service.get_by_name(name)
    
    if not car_type:
        return jsonify({'error': 'Car type not found'}), 404
    
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Handle ECUs update if provided - this would require rebuilding the entire car type
    if 'ecus' in data:
        # Create new ECUs list
        ecus = []
        for ecu_data in data['ecus']:
            versions = []
            for version_data in ecu_data.get('versions', []):
                versions.append(Version(
                    version_number=version_data['version_number'],
                    compatible_car_types=version_data.get('compatible_car_types', []),
                    hex_file_path=version_data.get('hex_file_path', '')
                ))
            
            ecus.append(ECU(
                name=ecu_data['name'],
                model_number=ecu_data['model_number'],
                versions=versions
            ))
        
        car_type.ecus = ecus
    
    # Update simple fields
    if 'model_number' in data:
        car_type.model_number = data['model_number']
    
    if 'manufactured_count' in data:
        car_type.manufactured_count = data['manufactured_count']
    
    if 'car_ids' in data:
        car_type.car_ids = data['car_ids']
    
    # Save updated car type
    success = service.save(car_type)
    
    if success:
        return jsonify({'message': 'Car type updated successfully'})
    else:
        return jsonify({'error': 'Failed to update car type'}), 500


# Needs to be tested
@car_type_bp.route('/<name>/', methods=['PATCH'])
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
def get_statistics():
    """Get statistics about car types"""
    service = current_app.db_service.get_car_type_service()
    stats = service.get_statistics()
    return jsonify(stats)