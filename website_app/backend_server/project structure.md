# Automotive Firmware Management API - Implementation Guide

## Project Structure

```
automotive_firmware_api/
├── app.py                      # Flask application factory
├── __init__.py                 # Package initialization
├── requirements.txt            # Project dependencies
├── database_manager.py         # Existing MongoDB connection manager
├── models.py                   # Data models
├── controllers/                # API controllers
│   ├── __init__.py
│   ├── car_type_controller.py  # Car type API endpoints
│   ├── ecu_controller.py       # ECU API endpoints
│   ├── version_controller.py   # Version API endpoints
│   └── request_controller.py   # Request API endpoints
└── services/                   # Service layer
    ├── __init__.py
    ├── database_service.py     # Service factory
    ├── car_type_service.py     # Car type operations
    ├── ecu_service.py          # ECU operations
    ├── version_service.py      # Version operations
    └── request_service.py      # Request operations
```

## Architecture Overview

This project follows a layered architecture pattern:

1. **Controllers Layer** - Handles HTTP requests and responses
2. **Service Layer** - Contains business logic and operations
3. **Data Access Layer** - Handled by the DatabaseManager to interact with MongoDB

## Key Design Patterns

1. **Factory Pattern** - `DatabaseService` acts as a factory for creating service instances
2. **Dependency Injection** - Service dependencies are injected into the `DatabaseManager`
3. **Repository Pattern** - Each service acts as a repository for a specific entity
4. **Blueprint Pattern** - Flask blueprints are used to organize API endpoints

## Service Responsibilities

Each service class has specific responsibilities:

### CarTypeService

- Manages car type operations (CRUD)
- Provides statistics
- Handles relationships with ECUs

### ECUService

- Manages ECU operations
- Handles relationships with versions
- Provides compatibility information

### VersionService

- Manages version operations
- Handles hex file operations
- Provides compatibility information

### RequestService

- Manages service and download requests
- Tracks request status
- Provides reporting functions

## API Endpoints

The API provides the following endpoints organized by resource:

### Car Types

- `GET /api/car-types/` - Get all car types
- `GET /api/car-types/<name>` - Get a specific car type
- `POST /api/car-types/` - Create a new car type
- `PUT /api/car-types/<name>` - Update a car type
- `DELETE /api/car-types/<name>` - Delete a car type
- `GET /api/car-types/statistics` - Get statistics

### ECUs

- `GET /api/ecus/car-type/<car_type_name>` - Get all ECUs for a car type
- `GET /api/ecus/<ecu_name>/<ecu_model>` - Get details for a specific ECU
- `GET /api/ecus/compatible/<car_type_name>` - Get all ECUs compatible with a car type

### Versions

- `GET /api/versions/ecu/<ecu_name>/<ecu_model>` - Get all versions for an ECU
- `GET /api/versions/ecu/<ecu_name>/<ecu_model>/<version_number>` - Get details for a specific version
- `GET /api/versions/download/<ecu_name>/<ecu_model>/<version_number>` - Download a hex file
- `GET /api/versions/stream/<ecu_name>/<ecu_model>/<version_number>` - Stream a hex file in chunks
- `GET /api/versions/compatible/<car_type_name>` - Get all versions compatible with a car type

### Requests

- `POST /api/requests/service` - Create a new service request
- `POST /api/requests/download` - Create a new download request
- `PUT /api/requests/download/<car_id>/status` - Update download request status
- `GET /api/requests/car/<car_id>` - Get all requests for a car
- `GET /api/requests/service/status/<status>` - Get service requests by status
- `GET /api/requests/download/status/<status>` - Get download requests by status
- `GET /api/requests/download/active` - Get all active download requests

## Implementation Details

### Service Layer Details

#### DatabaseService

This is the main service factory that manages all other services. It:

1. Creates instances of all service classes
2. Injects references to the service getters into the DatabaseManager
3. Manages circular dependencies between services
4. Provides getter methods to access each service

```python
def get_car_type_service(self) -> CarTypeService:
    """Get or create the car type service"""
    if self._car_type_service is None:
        self._car_type_service = CarTypeService(self.db_manager)
    return self._car_type_service
```

#### CarTypeService

Handles all car type-related operations:

- CRUD operations for car types
- Getting statistics
- Converting database data to model objects

#### ECUService

Handles all ECU-related operations:

- Getting ECUs by various criteria
- Finding compatible ECUs
- Converting database data to model objects

#### VersionService

Handles all version-related operations:

- Getting versions by various criteria
- Handling hex file operations (chunk reading, size calculation)
- Converting database data to model objects

#### RequestService

Handles all request-related operations:

- Creating and updating service requests
- Creating and updating download requests
- Querying requests by various criteria

### Controller Layer Details

Each controller uses Flask blueprints to define routes and handle HTTP requests:

1. Receives HTTP requests
2. Validates input data
3. Calls appropriate service methods
4. Formats responses

### Data Flow Example

Let's trace a typical data flow for getting a car type by name:

1. HTTP request comes to `/api/car-types/some_car_name`
2. `car_type_controller.py` handles the request
3. Controller gets the car type service from the app's DB service factory
4. Controller calls `service.get_by_name(name)`
5. CarTypeService calls the database manager to query MongoDB
6. CarTypeService converts the database data to model objects
7. Controller formats the data as JSON and returns it

## Database Management

The existing `DatabaseManager` class has been preserved to maintain your MongoDB connection and collection management. The service classes build on top of it to provide more structured business logic.

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has clear responsibilities
2. **Maintainability**: Changes to one part of the system don't affect others
3. **Testability**: Easy to mock dependencies for unit testing
4. **Scalability**: Services can be extracted to separate microservices if needed
5. **Clear API**: Well-defined REST API with consistent patterns

## Running the Application

To run the application:

```bash
# Set up virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

The application will be available at `http://localhost:5000`.

## Extending the Application

To add new features:

1. **Add a new model**: Define a new class in `models.py`
2. **Add a new service**: Create a new service class in `services/`
3. **Add a new controller**: Create a new controller in `controllers/`
4. **Register in DatabaseService**: Add getter method for the new service
5. **Register blueprint**: Add the new blueprint to `app.py`
