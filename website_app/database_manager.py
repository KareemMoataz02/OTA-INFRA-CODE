import os
from typing import Dict, List, Optional
from models import CarType, ECU, Version
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.binary import Binary

class DatabaseManager:
    def __init__(self, data_directory: str):
        """
        Initialize the DatabaseManager with MongoDB connection
        The data_directory parameter is kept for compatibility with existing code
        """
        self.data_directory = data_directory  # Keep for hex files storage
        
        # MongoDB connection
        uri = "mongodb+srv://ahmedbaher382001:VMv7y5NvzU0R3aFA@cluster0.ggbavh1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        self.client = MongoClient(uri, server_api=ServerApi('1'))
        self.db = self.client['automotive_firmware_db']
        
        # Collections
        self.car_types_collection = self.db['car_types']
        self.ecus_collection = self.db['ecus']
        self.versions_collection = self.db['versions']
        self.requests_collection = self.db['requests']
        self.download_requests_collection = self.db['download_requests']
        
        # Initialize collections if needed
        self._initialize_db()
    
    def _initialize_db(self):
        """Create indexes and ensure collections exist"""
        # Create indexes for faster queries
        self.car_types_collection.create_index("name")
        self.car_types_collection.create_index("model_number")
        self.ecus_collection.create_index("name")
        self.versions_collection.create_index([("version_number", 1), ("ecu_id", 1)])
        self.requests_collection.create_index("car_id")
        self.download_requests_collection.create_index("car_id")

    def load_all_data(self) -> List[CarType]:
        """Load all data from MongoDB and create CarType objects"""
        try:
            # Get all car types from MongoDB
            car_types_data = list(self.car_types_collection.find({}))
            
            car_types = []
            for car_type_info in car_types_data:
                # Get ECUs for this car type
                ecu_ids = car_type_info.get('ecu_ids', [])
                ecus = []
                
                for ecu_id in ecu_ids:
                    ecu_info = self.ecus_collection.find_one({"_id": ecu_id})
                    
                    if ecu_info:
                        # Get versions for this ECU
                        version_ids = ecu_info.get('version_ids', [])
                        versions = []
                        
                        for version_id in version_ids:
                            version_info = self.versions_collection.find_one({"_id": version_id})
                            
                            if version_info:
                                versions.append(Version(
                                    version_number=version_info['version_number'],
                                    compatible_car_types=version_info['compatible_car_types'],
                                    hex_file_path=version_info['hex_file_path']
                                ))
                        
                        ecus.append(ECU(
                            name=ecu_info['name'],
                            model_number=ecu_info['model_number'],
                            versions=versions
                        ))
                
                car_types.append(CarType(
                    name=car_type_info['name'],
                    model_number=car_type_info['model_number'],
                    ecus=ecus,
                    manufactured_count=car_type_info.get('manufactured_count', 0),
                    car_ids=car_type_info.get('car_ids', [])
                ))
            
            return car_types
        
        except Exception as e:
            print(f"Error loading database from MongoDB: {str(e)}")
            return []

    def save_car_type(self, car_type: CarType):
        """Save a car type to the database"""
        try:
            # First save/update ECUs and get their IDs
            ecu_ids = []
            for ecu in car_type.ecus:
                # Save versions first and get their IDs
                version_ids = []
                for version in ecu.versions:
                    version_data = {
                        "version_number": version.version_number,
                        "compatible_car_types": version.compatible_car_types,
                        "hex_file_path": version.hex_file_path
                    }
                    
                    # Check if version exists, update or insert
                    result = self.versions_collection.update_one(
                        {"version_number": version.version_number, "hex_file_path": version.hex_file_path},
                        {"$set": version_data},
                        upsert=True
                    )
                    
                    # Get the ID of the inserted/updated version
                    if result.upserted_id:
                        version_id = result.upserted_id
                    else:
                        version_doc = self.versions_collection.find_one(
                            {"version_number": version.version_number, "hex_file_path": version.hex_file_path}
                        )
                        version_id = version_doc["_id"]
                    
                    version_ids.append(version_id)
                
                # Now save the ECU with version IDs
                ecu_data = {
                    "name": ecu.name,
                    "model_number": ecu.model_number,
                    "version_ids": version_ids
                }
                
                # Check if ECU exists, update or insert
                result = self.ecus_collection.update_one(
                    {"name": ecu.name, "model_number": ecu.model_number},
                    {"$set": ecu_data},
                    upsert=True
                )
                
                # Get the ID of the inserted/updated ECU
                if result.upserted_id:
                    ecu_id = result.upserted_id
                else:
                    ecu_doc = self.ecus_collection.find_one(
                        {"name": ecu.name, "model_number": ecu.model_number}
                    )
                    ecu_id = ecu_doc["_id"]
                
                ecu_ids.append(ecu_id)
            
            # Finally save the car type with ECU IDs
            car_type_data = {
                "name": car_type.name,
                "model_number": car_type.model_number,
                "ecu_ids": ecu_ids,
                "manufactured_count": car_type.manufactured_count,
                "car_ids": car_type.car_ids
            }
            
            # Update or insert car type
            self.car_types_collection.update_one(
                {"name": car_type.name, "model_number": car_type.model_number},
                {"$set": car_type_data},
                upsert=True
            )
            
        except Exception as e:
            print(f"Error saving car type to MongoDB: {str(e)}")

    def get_hex_file_chunk(self, file_path: str, chunk_size: int, offset: int) -> Optional[bytes]:
        """
        Read a chunk of hex file - still using file system for binary files
        In the future, this could be migrated to MongoDB GridFS for binary storage
        """
        try:
            with open(file_path, 'rb') as f:
                f.seek(offset)
                return f.read(chunk_size)
        except Exception as e:
            print(f"Error reading hex file: {str(e)}")
            return None

    def get_file_size(self, file_path: str) -> int:
        """
        Get size of a hex file - still using file system
        In the future, this could be migrated to MongoDB GridFS for binary storage
        """
        try:
            return os.path.getsize(file_path)
        except Exception as e:
            print(f"Error getting file size: {str(e)}")
            return 0
    
    def save_request(self, request):
        """Save a service request to the database"""
        try:
            request_data = {
                "timestamp": request.timestamp,
                "car_type": request.car_type,
                "car_id": request.car_id,
                "ip_address": request.ip_address,
                "port": request.port,
                "service_type": request.service_type.value,
                "metadata": request.metadata,
                "status": request.status.value
            }
            
            self.requests_collection.insert_one(request_data)
        except Exception as e:
            print(f"Error saving request to MongoDB: {str(e)}")
    
    def save_download_request(self, download_request):
        """Save a download request to the database"""
        try:
            request_data = {
                "timestamp": download_request.timestamp,
                "car_type": download_request.car_type,
                "car_id": download_request.car_id,
                "ip_address": download_request.ip_address,
                "port": download_request.port,
                "required_versions": download_request.required_versions,
                "old_versions": download_request.old_versions,
                "status": download_request.status.value,
                "total_size": download_request.total_size,
                "transferred_size": download_request.transferred_size,
                "active_transfers": download_request.active_transfers
            }
            
            self.download_requests_collection.insert_one(request_data)
        except Exception as e:
            print(f"Error saving download request to MongoDB: {str(e)}")
    
    def update_download_request_status(self, car_id: str, status, transferred_size=None):
        """Update the status of a download request"""
        try:
            update_data = {"status": status.value}
            if transferred_size is not None:
                update_data["transferred_size"] = transferred_size
                
            self.download_requests_collection.update_one(
                {"car_id": car_id, "status": {"$ne": "COMPLETED"}},
                {"$set": update_data}
            )
        except Exception as e:
            print(f"Error updating download request status in MongoDB: {str(e)}")

    def get_car_type_by_name(self, name: str) -> Optional[CarType]:
        """Get a car type by name"""
        try:
            car_type_info = self.car_types_collection.find_one({"name": name})
            if not car_type_info:
                return None
                
            # Load full car type using the same logic as load_all_data
            ecus = []
            for ecu_id in car_type_info.get('ecu_ids', []):
                ecu_info = self.ecus_collection.find_one({"_id": ecu_id})
                if ecu_info:
                    versions = []
                    for version_id in ecu_info.get('version_ids', []):
                        version_info = self.versions_collection.find_one({"_id": version_id})
                        if version_info:
                            versions.append(Version(
                                version_number=version_info['version_number'],
                                compatible_car_types=version_info['compatible_car_types'],
                                hex_file_path=version_info['hex_file_path']
                            ))
                    
                    ecus.append(ECU(
                        name=ecu_info['name'],
                        model_number=ecu_info['model_number'],
                        versions=versions
                    ))
            
            return CarType(
                name=car_type_info['name'],
                model_number=car_type_info['model_number'],
                ecus=ecus,
                manufactured_count=car_type_info.get('manufactured_count', 0),
                car_ids=car_type_info.get('car_ids', [])
            )
        except Exception as e:
            print(f"Error getting car type by name from MongoDB: {str(e)}")
            return None