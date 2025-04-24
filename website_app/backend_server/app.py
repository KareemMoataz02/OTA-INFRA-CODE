from flask import Flask
from controllers.car_type_controller import car_type_bp
from controllers.ecu_controller import ecu_bp
from controllers.version_controller import version_bp
from controllers.request_controller import request_bp
from services.database_service import DatabaseService
from app_json_encoder import MongoJSONEncoder
import os

def create_app(test_config=None):
    # Create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATA_DIRECTORY=os.path.join(app.instance_path, 'data'),
    )

    # Set custom JSON encoder for MongoDB ObjectId
    app.json_encoder = MongoJSONEncoder

    if test_config is None:
        # Load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)

    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path, exist_ok=True)
        os.makedirs(app.config['DATA_DIRECTORY'], exist_ok=True)
    except OSError:
        pass

    # Initialize the database service and add it to app
    app.db_service = DatabaseService(app.config['DATA_DIRECTORY'])

    # Register blueprints
    app.register_blueprint(car_type_bp, url_prefix='/api/car-types')
    app.register_blueprint(ecu_bp, url_prefix='/api/ecus')
    app.register_blueprint(version_bp, url_prefix='/api/versions')
    app.register_blueprint(request_bp, url_prefix='/api/requests')

    # Create a simple index route
    @app.route('/')
    def index():
        return {
            "message": "Automotive Firmware Management API",
            "version": "1.0.0",
            "endpoints": {
                "car_types": "/api/car-types",
                "ecus": "/api/ecus",
                "versions": "/api/versions",
                "requests": "/api/requests"
            }
        }

    return app

# This allows for both direct execution and importing as a module
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)