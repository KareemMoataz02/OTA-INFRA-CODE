from typing import List, Optional, Dict
from models import ServiceRequest, DownloadRequest, RequestStatus
from database_manager import DatabaseManager
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger('RequestService')

class RequestService:
    """Service for handling service and download requests"""
    
    def __init__(self, db_manager: DatabaseManager):
        """Initialize with database manager"""
        self.db_manager = db_manager
        self.service_collection = db_manager.requests_collection
        self.download_collection = db_manager.download_requests_collection
    
    # Service Request Methods
    def get_all_service_requests(self) -> List[Dict]:
        """Get all service requests"""
        try:
            # Convert MongoDB cursor to list and process _id fields
            return self._process_mongodb_results(self.service_collection.find({}))
        except Exception as e:
            logger.error(f"Error getting service requests: {str(e)}")
            return []
    
    def get_service_requests_by_car_id(self, car_id: str) -> List[Dict]:
        """Get service requests for a specific car"""
        try:
            return self._process_mongodb_results(self.service_collection.find({"car_id": car_id}))
        except Exception as e:
            logger.error(f"Error getting service requests by car ID: {str(e)}")
            return []
    
    def get_service_requests_by_status(self, status: RequestStatus) -> List[Dict]:
        """Get service requests with a specific status"""
        try:
            return self._process_mongodb_results(self.service_collection.find({"status": status.value}))
        except Exception as e:
            logger.error(f"Error getting service requests by status: {str(e)}")
            return []
    
    def create_service_request(self, service_request: ServiceRequest) -> bool:
        """Create a new service request"""
        try:
            request_data = {
                "timestamp": service_request.timestamp,
                "car_type": service_request.car_type,
                "car_id": service_request.car_id,
                "ip_address": service_request.ip_address,
                "port": service_request.port,
                "service_type": service_request.service_type.value,
                "metadata": service_request.metadata,
                "status": service_request.status.value
            }
            
            self.service_collection.insert_one(request_data)
            return True
        except Exception as e:
            logger.error(f"Error creating service request: {str(e)}")
            return False
    
    def update_service_request_status(self, request_id: str, status: RequestStatus) -> bool:
        """Update the status of a service request"""
        try:
            from bson import ObjectId
            # Convert string ID to ObjectId if it's not already
            obj_id = ObjectId(request_id) if not isinstance(request_id, ObjectId) else request_id
            
            self.service_collection.update_one(
                {"_id": obj_id},
                {"$set": {"status": status.value}}
            )
            return True
        except Exception as e:
            logger.error(f"Error updating service request status: {str(e)}")
            return False
    
    # Download Request Methods
    def get_all_download_requests(self) -> List[Dict]:
        """Get all download requests"""
        try:
            return self._process_mongodb_results(self.download_collection.find({}))
        except Exception as e:
            logger.error(f"Error getting download requests: {str(e)}")
            return []
    
    def get_download_requests_by_car_id(self, car_id: str) -> List[Dict]:
        """Get download requests for a specific car"""
        try:
            return self._process_mongodb_results(self.download_collection.find({"car_id": car_id}))
        except Exception as e:
            logger.error(f"Error getting download requests by car ID: {str(e)}")
            return []
    
    def get_download_requests_by_status(self, status: RequestStatus) -> List[Dict]:
        """Get download requests with a specific status"""
        try:
            return self._process_mongodb_results(self.download_collection.find({"status": status.value}))
        except Exception as e:
            logger.error(f"Error getting download requests by status: {str(e)}")
            return []
    
    def create_download_request(self, download_request: DownloadRequest) -> bool:
        """Create a new download request"""
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
            
            self.download_collection.insert_one(request_data)
            return True
        except Exception as e:
            logger.error(f"Error creating download request: {str(e)}")
            return False
    
    def update_download_request_status(self, car_id: str, status: RequestStatus, transferred_size: int = None) -> bool:
        """Update the status of a download request"""
        try:
            update_data = {"status": status.value}
            if transferred_size is not None:
                update_data["transferred_size"] = transferred_size
                
            self.download_collection.update_one(
                {"car_id": car_id, "status": {"$ne": RequestStatus.COMPLETED.value}},
                {"$set": update_data}
            )
            return True
        except Exception as e:
            logger.error(f"Error updating download request status: {str(e)}")
            return False
    
    def get_active_download_requests(self) -> List[Dict]:
        """Get all active download requests (not completed or failed)"""
        try:
            query = {
                "status": {"$nin": [RequestStatus.COMPLETED.value, RequestStatus.FAILED.value, RequestStatus.CANCELLED.value]}
            }
            return self._process_mongodb_results(self.download_collection.find(query))
        except Exception as e:
            logger.error(f"Error getting active download requests: {str(e)}")
            return []
    
    def _process_mongodb_results(self, cursor) -> List[Dict]:
        """Convert MongoDB cursor results to serializable dictionaries"""
        try:
            result = []
            for doc in cursor:
                # Convert MongoDB ObjectIds to strings for JSON serialization
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
                result.append(doc)
            return result
        except Exception as e:
            logger.error(f"Error processing MongoDB results: {str(e)}")
            return []