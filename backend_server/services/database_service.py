from database_manager import DatabaseManager
from services.car_type_service import CarTypeService
from services.ecu_service import ECUService
from services.version_service import VersionService

class DatabaseService:
    """
    Factory service that provides access to all individual collection services
    and manages dependencies between them
    """
    
    def __init__(self, data_directory: str):
        """Initialize the database service with database manager"""
        self.db_manager = DatabaseManager(data_directory)
        
        # Initialize services with circular dependency handling
        self.db_manager.get_car_type_service = self.get_car_type_service
        self.db_manager.get_ecu_service = self.get_ecu_service
        self.db_manager.get_version_service = self.get_version_service
        
        # Create service instances
        self._car_type_service = None
        self._ecu_service = None
        self._version_service = None
        self._request_service = None
    
    def get_car_type_service(self) -> CarTypeService:
        """Get or create the car type service"""
        if self._car_type_service is None:
            self._car_type_service = CarTypeService(self.db_manager)
        return self._car_type_service
    
    def get_ecu_service(self) -> ECUService:
        """Get or create the ECU service"""
        if self._ecu_service is None:
            self._ecu_service = ECUService(self.db_manager)
        return self._ecu_service
    
    def get_version_service(self) -> VersionService:
        """Get or create the version service"""
        if self._version_service is None:
            self._version_service = VersionService(self.db_manager)
        return self._version_service
    