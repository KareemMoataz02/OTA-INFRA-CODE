from typing import Dict, List, Optional
from enum import Enum
from datetime import datetime

class CarType:
    """Class representing a car type"""
    
    def __init__(self, name: str, model_number: str, ecus: List['ECU'], 
                 manufactured_count: int = 0, car_ids: List[str] = None):
        self.name = name
        self.model_number = model_number
        self.ecus = ecus
        self.manufactured_count = manufactured_count
        self.car_ids = car_ids or []

class ECU:
    """Class representing an Electronic Control Unit"""
    
    def __init__(self, name: str, model_number: str, versions: List['Version']):
        self.name = name
        self.model_number = model_number
        self.versions = versions

class Version:
    """Class representing a firmware version"""
    
    def __init__(self, version_number: str, compatible_car_types: List[str], hex_file_path: str):
        self.version_number = version_number
        self.compatible_car_types = compatible_car_types
        self.hex_file_path = hex_file_path

class RequestStatus(Enum):
    """Enum for request status"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class ServiceType(Enum):
    """Enum for service types"""
    DIAGNOSTICS = "DIAGNOSTICS"
    REPAIR = "REPAIR"
    MAINTENANCE = "MAINTENANCE"
    UPDATE = "UPDATE"
    OTHER = "OTHER"

class ServiceRequest:
    """Class representing a service request"""
    
    def __init__(self, timestamp: datetime, car_type: str, car_id: str, 
                 ip_address: str, port: int, service_type: ServiceType, 
                 metadata: Dict, status: RequestStatus):
        self.timestamp = timestamp
        self.car_type = car_type
        self.car_id = car_id
        self.ip_address = ip_address
        self.port = port
        self.service_type = service_type
        self.metadata = metadata
        self.status = status

class DownloadRequest:
    """Class representing a firmware download request"""
    
    def __init__(self, timestamp: datetime, car_type: str, car_id: str, 
                 ip_address: str, port: int, required_versions: List[Dict], 
                 old_versions: List[Dict], status: RequestStatus, 
                 total_size: int, transferred_size: int, active_transfers: Dict):
        self.timestamp = timestamp
        self.car_type = car_type
        self.car_id = car_id
        self.ip_address = ip_address
        self.port = port
        self.required_versions = required_versions
        self.old_versions = old_versions
        self.status = status
        self.total_size = total_size
        self.transferred_size = transferred_size
        self.active_transfers = active_transfers