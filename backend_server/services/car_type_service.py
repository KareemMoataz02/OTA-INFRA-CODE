from typing import List, Optional, Dict

import pymongo
from models import CarType, ECU, Version
from database_manager import DatabaseManager
# from pymongo import 


class CarTypeService:
    """Service for handling car type operations"""

    def __init__(self, db_manager: DatabaseManager):
        """Initialize with database manager"""
        self.db_manager = db_manager
        self.collection = db_manager.car_types_collection

    def get_all(self) -> List[CarType]:
        """Get all car types"""
        car_types_data = list(self.collection.find({}))
        return self._convert_to_car_types(car_types_data)

    def get_by_name(self, name: str) -> Optional[CarType]:
        """Get a car type by name"""
        car_type_info = self.collection.find_one({"name": name.lower()})
        if not car_type_info:
            return None

        car_types = self._convert_to_car_types([car_type_info])
        return car_types[0] if car_types else None

    def get_by_model_number(self, model_number: str) -> Optional[CarType]:
        """Get a car type by model number"""
        car_type_info = self.collection.find_one(
            {"model_number": model_number.lower()})
        if not car_type_info:
            return None

        car_types = self._convert_to_car_types([car_type_info])
        return car_types[0] if car_types else None


    def save(self, car_type: CarType) -> bool:
        """
        Save a car type to the database, ensuring name and model number are individually unique.
        Throws an exception if a car type with the same name OR model number already exists.
        """
        try:
            # Convert to lowercase
            name_lower = car_type.name.lower()
            model_number_lower = car_type.model_number.lower()
            
            # Check if a car type with the same name already exists (but different ID)
            existing_by_name = self.collection.find_one({"name": name_lower})
            if existing_by_name:
                if not hasattr(car_type, '_id') or not car_type._id or str(existing_by_name['_id']) != str(car_type._id):
                    raise ValueError(f"A car type with name '{name_lower}' already exists")
            
            # Check if a car type with the same model number already exists (but different ID)
            existing_by_model = self.collection.find_one({"model_number": model_number_lower})
            if existing_by_model:
                if not hasattr(car_type, '_id') or not car_type._id or str(existing_by_model['_id']) != str(car_type._id):
                    raise ValueError(f"A car type with model number '{model_number_lower}' already exists")
            
            # First save/update ECUs and get their IDs through the ECU service
            # ecu_service = self.db_manager.get_ecu_service()
            # ecu_ids = []

            # for ecu in car_type.ecus:
            #     ecu_id = ecu_service.save(ecu)
            #     if ecu_id:
            #         ecu_ids.append(ecu_id)

            # Prepare car type data for saving
            car_type_data = {
                "name": name_lower,
                "model_number": model_number_lower,
                "ecu_ids": car_type.ecus,
                "manufactured_count": car_type.manufactured_count,
                "car_ids": car_type.car_ids
            }

            self.collection.insert_one(car_type_data)

            return True
        except ValueError as ve:
            # Re-raise the specific validation exceptions we created
            print(str(ve))
            raise
        except Exception as e:
            print(f"Error saving car type: {str(e)}")
            return False
        

    def update(self, name: str, data: Dict) -> bool:
        """Update specific fields of a car type"""
        try:
            # Create a copy of the data to avoid modifying the original
            updated_data = data.copy()
            
            # If model_number is in the data, convert it to lowercase
            if "model_number" in updated_data:
                updated_data["model_number"] = updated_data["model_number"].lower()
            
            self.collection.update_one(
                {"name": name.lower()},
                {"$set": updated_data}
            )
            return True
        except Exception as e:
            print(f"Error updating car type: {str(e)}")
            return False
    

    def delete(self, name: str) -> bool:
        """Delete a car type by name"""
        try:
            result = self.collection.delete_one({"name": name})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting car type: {str(e)}")
            return False

    def get_statistics(self) -> Dict:
        """Get statistics about car types"""
        try:
            car_types = self.get_all()

            # Calculate some basic statistics
            stats = {
                "total_car_types": len(car_types),
                "total_manufactured": sum(ct.manufactured_count for ct in car_types),
                "car_type_details": []
            }

            for car_type in car_types:
                stats["car_type_details"].append({
                    "name": car_type.name,
                    "model_number": car_type.model_number,
                    "manufactured_count": car_type.manufactured_count,
                    "car_ids_count": len(car_type.car_ids),
                    "ecu_count": len(car_type.ecus)
                })

            return stats
        except Exception as e:
            print(f"Error getting car type statistics: {str(e)}")
            return {"error": str(e)}

    def _convert_to_car_types(self, car_types_data: List[Dict]) -> List[CarType]:
        """Convert database data to CarType objects"""
        ecu_service = self.db_manager.get_ecu_service()
        car_types = []

        for car_type_info in car_types_data:
            # Get ECUs for this car type
            ecu_ids = car_type_info.get('ecu_ids', [])
            ecus = ecu_service.get_by_ids(ecu_ids)

            car_types.append(CarType(
                name=car_type_info['name'],
                model_number=car_type_info['model_number'],
                ecus=ecus,
                manufactured_count=car_type_info.get('manufactured_count', 0),
                car_ids=car_type_info.get('car_ids', [])
            ))

        return car_types
