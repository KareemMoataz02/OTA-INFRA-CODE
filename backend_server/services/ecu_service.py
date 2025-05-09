from typing import List, Optional, Dict
from models import ECU, Version, CarType
from database_manager import DatabaseManager
from bson import ObjectId

class ECUService:
    """Service for handling ECU operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        """Initialize with database manager"""
        self.db_manager = db_manager
        self.collection = db_manager.ecus_collection
    
    def get_all(self) -> List[ECU]:
        """Get all ECUs"""
        ecus_data = list(self.collection.find({}))
        return self._convert_to_ecus(ecus_data)
    
    def get_by_name_and_model(self, name: str, model_number: str) -> Optional[ECU]:
        """Get an ECU by name and model number"""
        ecu_info = self.collection.find_one({"name": name.lower(), "model_number": model_number.lower()})
        if not ecu_info:
            return None
        
        ecus = self._convert_to_ecus([ecu_info])
        return ecus[0] if ecus else None
    

    def get_by_name(self, name: str) -> Optional[ECU]:
        """Get an ECU by name and model number"""
        ecu_info = self.collection.find_one({"name": name.lower()})
        if not ecu_info:
            return None
        
        ecus = self._convert_to_ecus([ecu_info])
        return ecus[0] if ecus else None
    

    def get_by_ids(self, ecu_ids: List[ObjectId]) -> List[ECU]:
        """Get ECUs by their IDs"""
        if not ecu_ids:
            return []
        
        ecus_data = list(self.collection.find({"_id": {"$in": ecu_ids}}))
        return self._convert_to_ecus(ecus_data)
    
    
    def save(self, ecu: ECU) -> Optional[ObjectId]:
        """Save an ECU and return its ID"""
        try:
            version_service = self.db_manager.get_version_service()
            version_ids = []
            
            # Save versions first and get their IDs
            for version in ecu.versions:
                version_id = version_service.save(version)
                if version_id:
                    version_ids.append(version_id)
            
            # Prepare ECU data for saving
            ecu_data = {
                "name": ecu.name.lower(),
                "model_number": ecu.model_number.lower(),
                "version_ids": version_ids
            }
            
            # Check if ECU exists, update or insert
            result = self.collection.update_one(
                {"name": ecu.name.lower(), "model_number": ecu.model_number.lower()},
                {"$set": ecu_data},
                upsert=True
            )
            
            # Get the ID of the inserted/updated ECU
            if result.upserted_id:
                return result.upserted_id
            else:
                ecu_doc = self.collection.find_one(
                    {"name": ecu.name.lower(), "model_number": ecu.model_number.lower()}
                )
                return ecu_doc["_id"] if ecu_doc else None
            
        except Exception as e:
            print(f"Error saving ECU: {str(e)}")
            return None
    
    def update(self, name: str, model_number: str, data: Dict) -> bool:
        """Update specific fields of an ECU"""
        try:
            self.collection.update_one(
                {"name": name.lower(), "model_number": model_number.lower()},
                {"$set": data}
            )
            return True
        except Exception as e:
            print(f"Error updating ECU: {str(e)}")
            return False
    
    def delete(self, name: str, model_number: str) -> bool:
        """Delete an ECU by name and model number"""
        try:
            result = self.collection.delete_one({"name": name.lower(), "model_number": model_number.lower()})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting ECU: {str(e)}")
            return False
    
    def get_compatible_ecus(self, car_type_name: str) -> List[Dict]:
        """Get all ECUs with versions compatible with a specific car type"""
        try:
            compatible_ecus = []
            version_service = self.db_manager.get_version_service()
            
            # Get all ECUs
            ecus = self.get_all()
            
            # Check each ECU for compatible versions
            for ecu in ecus:
                compatible_versions = version_service.get_compatible_versions(car_type_name.lower(), ecu.versions)
                
                if compatible_versions:
                    compatible_ecus.append({
                        "name": ecu.name.lower(),
                        "model_number": ecu.model_number.lower(),
                        "compatible_versions": [v.version_number for v in compatible_versions]
                    })
            
            return compatible_ecus
            
        except Exception as e:
            print(f"Error getting compatible ECUs: {str(e)}")
            return []
    
    def _convert_to_ecus(self, ecus_data: List[Dict]) -> List[ECU]:
        """Convert database data to ECU objects"""
        version_service = self.db_manager.get_version_service()
        ecus = []
        
        for ecu_info in ecus_data:
            # Get versions for this ECU
            version_ids = ecu_info.get('version_ids', [])
            versions = version_service.get_by_ids(version_ids)
            
            ecus.append(ECU(
                _id=ecu_info["_id"],
                name=ecu_info['name'],
                model_number=ecu_info['model_number'],
                versions=versions
            ))
        
        return ecus
    

    def get_by_ecu_name(self, ecu_name: str) -> List[CarType]:
        """Get all car types that have an ECU with the given name"""
        try:
            # First get all ECUs with this name
            car_service = self.db_manager.get_car_type_service()
            ecu = self.get_by_name(ecu_name.lower())
            
            if not ecu:
                return []           
                
            # Find all car types that reference these ECU IDs
            # car_types_data = list(self.collection.find({
            #     "ecu_ids": {"$in": ecu._id}
            # }))

            car_types_data = list(self.db_manager.car_types_collection.find({
                "ecu_ids": {"$in": [ecu._id]}
            }))

            
            return car_service._convert_to_car_types(car_types_data)
        except Exception as e:
            print(f"Error getting car types by ECU name: {str(e)}")
            return []

            