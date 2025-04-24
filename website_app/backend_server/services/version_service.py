from typing import List, Optional, Dict
from models import Version
from database_manager import DatabaseManager
from bson import ObjectId
import os

class VersionService:
    """Service for handling firmware version operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        """Initialize with database manager"""
        self.db_manager = db_manager
        self.collection = db_manager.versions_collection
        self.data_directory = db_manager.data_directory
    
    def get_all(self) -> List[Version]:
        """Get all versions"""
        versions_data = list(self.collection.find({}))
        return self._convert_to_versions(versions_data)
    
    def get_by_version_number(self, version_number: str, hex_file_path: str = None) -> Optional[Version]:
        """Get a version by its number and optionally hex file path"""
        query = {"version_number": version_number}
        if hex_file_path:
            query["hex_file_path"] = hex_file_path
            
        version_info = self.collection.find_one(query)
        if not version_info:
            return None
        
        versions = self._convert_to_versions([version_info])
        return versions[0] if versions else None
    
    def get_by_ids(self, version_ids: List[ObjectId]) -> List[Version]:
        """Get versions by their IDs"""
        if not version_ids:
            return []
        
        versions_data = list(self.collection.find({"_id": {"$in": version_ids}}))
        return self._convert_to_versions(versions_data)
    
    def save(self, version: Version) -> Optional[ObjectId]:
        """Save a version and return its ID"""
        try:
            # Prepare version data for saving
            version_data = {
                "version_number": version.version_number,
                "compatible_car_types": version.compatible_car_types,
                "hex_file_path": version.hex_file_path
            }
            
            # Check if version exists, update or insert
            result = self.collection.update_one(
                {"version_number": version.version_number, "hex_file_path": version.hex_file_path},
                {"$set": version_data},
                upsert=True
            )
            
            # Get the ID of the inserted/updated version
            if result.upserted_id:
                return result.upserted_id
            else:
                version_doc = self.collection.find_one(
                    {"version_number": version.version_number, "hex_file_path": version.hex_file_path}
                )
                return version_doc["_id"] if version_doc else None
                
        except Exception as e:
            print(f"Error saving version: {str(e)}")
            return None
    
    def update(self, version_number: str, hex_file_path: str, data: Dict) -> bool:
        """Update specific fields of a version"""
        try:
            self.collection.update_one(
                {"version_number": version_number, "hex_file_path": hex_file_path},
                {"$set": data}
            )
            return True
        except Exception as e:
            print(f"Error updating version: {str(e)}")
            return False
    
    def delete(self, version_number: str, hex_file_path: str) -> bool:
        """Delete a version by number and hex file path"""
        try:
            result = self.collection.delete_one(
                {"version_number": version_number, "hex_file_path": hex_file_path}
            )
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting version: {str(e)}")
            return False
    
    def get_compatible_versions(self, car_type_name: str, versions: List[Version] = None) -> List[Version]:
        """Get all versions compatible with a specific car type"""
        try:
            compatible_versions = []
            
            # If versions list is provided, filter it
            if versions is not None:
                for version in versions:
                    if car_type_name in version.compatible_car_types:
                        compatible_versions.append(version)
                return compatible_versions
            
            # Otherwise, query the database
            versions_data = list(self.collection.find(
                {"compatible_car_types": car_type_name}
            ))
            
            return self._convert_to_versions(versions_data)
            
        except Exception as e:
            print(f"Error getting compatible versions: {str(e)}")
            return []
    
    def get_hex_file_chunk(self, file_path: str, chunk_size: int, offset: int) -> Optional[bytes]:
        """Read a chunk of hex file"""
        return self.db_manager.get_hex_file_chunk(file_path, chunk_size, offset)
    
    def get_file_size(self, file_path: str) -> int:
        """Get size of a hex file"""
        return self.db_manager.get_file_size(file_path)
    
    def _convert_to_versions(self, versions_data: List[Dict]) -> List[Version]:
        """Convert database data to Version objects"""
        versions = []
        
        for version_info in versions_data:
            versions.append(Version(
                version_number=version_info['version_number'],
                compatible_car_types=version_info.get('compatible_car_types', []),
                hex_file_path=version_info.get('hex_file_path', '')
            ))
        
        return versions