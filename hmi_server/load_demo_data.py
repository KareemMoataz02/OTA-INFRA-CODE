"""
Enhanced MongoDB Demo Data Loader with Flashing Feedback Examples

This script loads sample data including flashing feedback history for testing.
"""

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List
import uuid
import random

# MongoDB connection
uri = "mongodb+srv://ahmedbaher382001:VMv7y5NvzU0R3aFA@cluster0.ggbavh1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, server_api=ServerApi('1'))
db = client['automotive_firmware_db']

# Collections
car_types_collection = db['car_types']
ecus_collection = db['ecus']
versions_collection = db['versions']
requests_collection = db['requests']
download_requests_collection = db['download_requests']

# NEW: Flashing feedback collections
flashing_feedback_collection = db['flashing_feedback']
flashing_sessions_collection = db['flashing_sessions']
flashing_metrics_collection = db['flashing_metrics']
car_flashing_history_collection = db['car_flashing_history']

def clear_collections():
    """Clear all collections before loading demo data"""
    print("Clearing existing collections...")
    car_types_collection.delete_many({})
    ecus_collection.delete_many({})
    versions_collection.delete_many({})
    requests_collection.delete_many({})
    download_requests_collection.delete_many({})
    
    # Clear flashing feedback collections
    flashing_feedback_collection.delete_many({})
    flashing_sessions_collection.delete_many({})
    flashing_metrics_collection.delete_many({})
    car_flashing_history_collection.delete_many({})

def load_versions():
    """Load version data and return a mapping of version IDs to ObjectIDs"""
    print("Loading version data...")
    version_mapping = {}
    
    versions_data = [
        {
            "version_number": "1.0.0",
            "compatible_car_types": ["ModelX", "ModelY"],
            "hex_file_path": "hex_files/hello.srec"
        },
        {
            "version_number": "1.1.0",
            "compatible_car_types": ["ModelX", "ModelY"],
            "hex_file_path": "hex_files/ECM_1_1_0.hex"
        },
        {
            "version_number": "1.2.0",
            "compatible_car_types": ["ModelX", "ModelY"],
            "hex_file_path": "hex_files/ECM_1_2_0.hex"
        },
        {
            "version_number": "1.0.0",
            "compatible_car_types": ["ModelX", "ModelY"],
            "hex_file_path": "hex_files/TCM_1_0_0.hex"
        },
        {
            "version_number": "1.1.0",
            "compatible_car_types": ["ModelX", "ModelY"],
            "hex_file_path": "hex_files/TCM_1_1_0.hex"
        },
        {
            "version_number": "1.0.0",
            "compatible_car_types": ["ModelX"],
            "hex_file_path": "hex_files/BCM_1_0_0.hex"
        },
        {
            "version_number": "1.1.0",
            "compatible_car_types": ["ModelX"],
            "hex_file_path": "hex_files/hello.srec"
        },
        {
            "version_number": "1.0.0",
            "compatible_car_types": ["ModelY"],
            "hex_file_path": "hex_files/BMS_1_0_0.hex"
        },
        {
            "version_number": "1.1.0",
            "compatible_car_types": ["ModelY"],
            "hex_file_path": "hex_files/hello.srec"
        },
        {
            "version_number": "1.2.0",
            "compatible_car_types": ["ModelY"],
            "hex_file_path": "hex_files/BMS_1_2_0.hex"
        }
    ]
    
    # Map the IDs from the provided data to the versions
    version_ids = ["ECM_V1", "ECM_V2", "ECM_V3", "TCM_V1", "TCM_V2", 
                   "BCM_V1", "BCM_V2", "BMS_V1", "BMS_V2", "BMS_V3"]
    
    for i, (version_id, version_data) in enumerate(zip(version_ids, versions_data)):
        # Create a MongoDB ObjectId for each version
        object_id = ObjectId()
        version_mapping[version_id] = object_id
        
        # Add the ObjectId and original ID for reference
        version_data["_id"] = object_id
        version_data["original_id"] = version_id
        
        # Insert into MongoDB
        versions_collection.insert_one(version_data)
        print(f"  Inserted version: {version_id} -> {object_id}")
    
    return version_mapping

def load_ecus(version_mapping):
    """Load ECU data and return a mapping of ECU IDs to ObjectIDs"""
    print("Loading ECU data...")
    ecu_mapping = {}
    
    ecus_data = [
        {
            "name": "Engine_Control_Module",
            "model_number": "ECM_2023",
            "version_ids": ["ECM_V1", "ECM_V2", "ECM_V3"]
        },
        {
            "name": "Transmission_Control_Module",
            "model_number": "TCM_2023",
            "version_ids": ["TCM_V1", "TCM_V2"]
        },
        {
            "name": "Brake_Control_Module",
            "model_number": "BCM_2023",
            "version_ids": ["BCM_V1", "BCM_V2"]
        },
        {
            "name": "Battery_Management_System",
            "model_number": "BMS_2023",
            "version_ids": ["BMS_V1", "BMS_V2", "BMS_V3"]
        }
    ]
    
    # Map the IDs from the provided data to the ECUs
    ecu_ids = ["ECU001", "ECU002", "ECU003", "ECU004"]
    
    for i, (ecu_id, ecu_data) in enumerate(zip(ecu_ids, ecus_data)):
        # Create a MongoDB ObjectId for each ECU
        object_id = ObjectId()
        ecu_mapping[ecu_id] = object_id
        
        # Convert version_ids to ObjectIds using the mapping
        ecu_data["version_ids"] = [version_mapping[v_id] for v_id in ecu_data["version_ids"]]
        
        # Add the ObjectId and original ID for reference
        ecu_data["_id"] = object_id
        ecu_data["original_id"] = ecu_id
        
        # Insert into MongoDB
        ecus_collection.insert_one(ecu_data)
        print(f"  Inserted ECU: {ecu_id} -> {object_id}")
    
    return ecu_mapping

def load_car_types(ecu_mapping):
    """Load car type data"""
    print("Loading car type data...")
    
    car_types_data = [
        {
            "name": "ModelX",
            "model_number": "MX2023",
            "manufactured_count": 100,
            "car_ids": [
                "MX2023-001",
                "MX2023-002", 
                "MX2023-003",
                "MX2023-004",
                "MX2023-005"
            ],
            "ecu_ids": ["ECU001", "ECU002", "ECU003"]
        },
        {
            "name": "ModelY",
            "model_number": "MY2023",
            "manufactured_count": 50,
            "car_ids": [
                "MY2023-001",
                "MY2023-002",
                "MY2023-003"
            ],
            "ecu_ids": ["ECU001", "ECU002", "ECU004"]
        }
    ]
    
    for car_type_data in car_types_data:
        # Convert ecu_ids to ObjectIds using the mapping
        car_type_data["ecu_ids"] = [ecu_mapping[e_id] for e_id in car_type_data["ecu_ids"]]
        
        # Insert into MongoDB
        result = car_types_collection.insert_one(car_type_data)
        print(f"  Inserted car type: {car_type_data['name']} -> {result.inserted_id}")

def load_sample_requests():
    """Load sample request data"""
    print("Loading sample requests...")
    
    # Sample service requests
    requests_data = [
        {
            "timestamp": datetime.now(),
            "car_type": "ModelX",
            "car_id": "MX2023-001",
            "ip_address": "192.168.1.100",
            "port": 8080,
            "service_type": "CHECK_UPDATES",
            "metadata": {
                "Engine_Control_Module": "1.0.0",
                "Transmission_Control_Module": "1.0.0",
                "Brake_Control_Module": "1.0.0"
            },
            "status": "COMPLETED"
        },
        {
            "timestamp": datetime.now(),
            "car_type": "ModelY",
            "car_id": "MY2023-001",
            "ip_address": "192.168.1.200",
            "port": 8080,
            "service_type": "CHECK_UPDATES",
            "metadata": {
                "Engine_Control_Module": "1.0.0",
                "Transmission_Control_Module": "1.0.0",
                "Battery_Management_System": "1.0.0"
            },
            "status": "COMPLETED"
        }
    ]
    
    for request_data in requests_data:
        result = requests_collection.insert_one(request_data)
        print(f"  Inserted request for car: {request_data['car_id']} -> {result.inserted_id}")

def load_sample_flashing_feedback():
    """Load sample flashing feedback data"""
    print("Loading sample flashing feedback...")
    
    # Car IDs from our car types
    model_x_cars = ["MX2023-001", "MX2023-002", "MX2023-003", "MX2023-004", "MX2023-005"]
    model_y_cars = ["MY2023-001", "MY2023-002", "MY2023-003"]
    
    # Generate flashing feedback for the last 30 days
    feedback_data = []
    
    for i in range(20):  # 20 sample flashing sessions
        # Pick random car
        if random.choice([True, False]):
            car_id = random.choice(model_x_cars)
            car_type = "ModelX"
            ecu_names = ["Engine_Control_Module", "Transmission_Control_Module", "Brake_Control_Module"]
        else:
            car_id = random.choice(model_y_cars)
            car_type = "ModelY"
            ecu_names = ["Engine_Control_Module", "Transmission_Control_Module", "Battery_Management_System"]
        
        # Random timestamp within last 30 days
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        timestamp = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
        
        # Simulate different flashing outcomes
        outcome = random.choices(
            ["completed", "partial_failure", "failed"],
            weights=[70, 20, 10]  # 70% success, 20% partial, 10% failure
        )[0]
        
        if outcome == "completed":
            successful_ecus = ecu_names
            rolled_back_ecus = []
            final_versions = {
                "Engine_Control_Module": "1.2.0",
                "Transmission_Control_Module": "1.1.0", 
                "Brake_Control_Module": "1.1.0",
                "Battery_Management_System": "1.2.0"
            }
        elif outcome == "partial_failure":
            successful_ecus = ecu_names[:2]  # First 2 ECUs successful
            rolled_back_ecus = ecu_names[2:]  # Rest rolled back
            final_versions = {
                "Engine_Control_Module": "1.2.0",
                "Transmission_Control_Module": "1.1.0",
                "Brake_Control_Module": "1.0.0",  # Rolled back
                "Battery_Management_System": "1.0.0"  # Rolled back
            }
        else:  # failed
            successful_ecus = []
            rolled_back_ecus = ecu_names
            final_versions = {
                "Engine_Control_Module": "1.0.0",
                "Transmission_Control_Module": "1.0.0",
                "Brake_Control_Module": "1.0.0",
                "Battery_Management_System": "1.0.0"
            }
        
        feedback = {
            "session_id": str(uuid.uuid4()),
            "car_id": car_id,
            "car_type": car_type,
            "flashing_timestamp": timestamp,
            "overall_status": outcome,
            "total_ecus": len(ecu_names),
            "successful_ecus": successful_ecus,
            "rolled_back_ecus": rolled_back_ecus,
            "final_ecu_versions": final_versions,
            "android_app_version": "1.0.0",
            "beaglebone_version": "2.0-chunked",
            "request_id": str(uuid.uuid4()),
            "received_timestamp": timestamp + timedelta(minutes=random.randint(1, 10))
        }
        
        feedback_data.append(feedback)
    
    # Insert all feedback data
    for feedback in feedback_data:
        result = flashing_feedback_collection.insert_one(feedback)
        print(f"  Inserted flashing feedback for {feedback['car_id']}: {feedback['overall_status']}")

def load_sample_flashing_metrics():
    """Load sample flashing metrics data"""
    print("Loading sample flashing metrics...")
    
    # ECU metrics based on our sample data
    metrics_data = [
        {
            "car_type": "ModelX",
            "ecu_name": "Engine_Control_Module",
            "version": "1.2.0",
            "total_attempts": 15,
            "successful_attempts": 12,
            "failed_attempts": 2,
            "rollback_attempts": 1,
            "success_rate": 80.0,
            "last_updated": datetime.now()
        },
        {
            "car_type": "ModelX",
            "ecu_name": "Transmission_Control_Module",
            "version": "1.1.0",
            "total_attempts": 15,
            "successful_attempts": 14,
            "failed_attempts": 1,
            "rollback_attempts": 0,
            "success_rate": 93.3,
            "last_updated": datetime.now()
        },
        {
            "car_type": "ModelX",
            "ecu_name": "Brake_Control_Module",
            "version": "1.1.0",
            "total_attempts": 15,
            "successful_attempts": 11,
            "failed_attempts": 3,
            "rollback_attempts": 1,
            "success_rate": 73.3,
            "last_updated": datetime.now()
        },
        {
            "car_type": "ModelY",
            "ecu_name": "Engine_Control_Module",
            "version": "1.2.0",
            "total_attempts": 8,
            "successful_attempts": 7,
            "failed_attempts": 1,
            "rollback_attempts": 0,
            "success_rate": 87.5,
            "last_updated": datetime.now()
        },
        {
            "car_type": "ModelY",
            "ecu_name": "Battery_Management_System",
            "version": "1.2.0",
            "total_attempts": 8,
            "successful_attempts": 6,
            "failed_attempts": 1,
            "rollback_attempts": 1,
            "success_rate": 75.0,
            "last_updated": datetime.now()
        }
    ]
    
    for metrics in metrics_data:
        result = flashing_metrics_collection.insert_one(metrics)
        print(f"  Inserted metrics for {metrics['car_type']} {metrics['ecu_name']}: {metrics['success_rate']}% success rate")

def load_sample_car_flashing_history():
    """Load sample car flashing history"""
    print("Loading sample car flashing history...")
    
    # Generate history for each car
    all_cars = [
        ("MX2023-001", "ModelX"), ("MX2023-002", "ModelX"), ("MX2023-003", "ModelX"),
        ("MX2023-004", "ModelX"), ("MX2023-005", "ModelX"),
        ("MY2023-001", "ModelY"), ("MY2023-002", "ModelY"), ("MY2023-003", "ModelY")
    ]
    
    for car_id, car_type in all_cars:
        # Generate random history
        total_sessions = random.randint(1, 5)
        successful_sessions = random.randint(0, total_sessions)
        partial_sessions = random.randint(0, total_sessions - successful_sessions)
        failed_sessions = total_sessions - successful_sessions - partial_sessions
        
        # Current ECU versions after flashing
        if car_type == "ModelX":
            current_versions = {
                "Engine_Control_Module": "1.2.0" if successful_sessions > 0 else "1.0.0",
                "Transmission_Control_Module": "1.1.0" if successful_sessions > 0 else "1.0.0",
                "Brake_Control_Module": "1.1.0" if successful_sessions > 0 else "1.0.0"
            }
        else:  # ModelY
            current_versions = {
                "Engine_Control_Module": "1.2.0" if successful_sessions > 0 else "1.0.0",
                "Transmission_Control_Module": "1.1.0" if successful_sessions > 0 else "1.0.0",
                "Battery_Management_System": "1.2.0" if successful_sessions > 0 else "1.0.0"
            }
        
        history = {
            "car_id": car_id,
            "car_type": car_type,
            "total_flashing_sessions": total_sessions,
            "successful_sessions": successful_sessions,
            "partial_success_sessions": partial_sessions,
            "failed_sessions": failed_sessions,
            "last_flashing_date": datetime.now() - timedelta(days=random.randint(1, 30)),
            "current_ecu_versions": current_versions,
            "flashing_sessions": [str(uuid.uuid4()) for _ in range(total_sessions)]
        }
        
        result = car_flashing_history_collection.insert_one(history)
        print(f"  Inserted history for {car_id}: {total_sessions} sessions, {successful_sessions} successful")

def ensure_hex_file_directory():
    """Create hex files directory and dummy files if needed"""
    print("Ensuring hex files directory and dummy files exist...")
    hex_dir = "hex_files"
    
    if not os.path.exists(hex_dir):
        os.makedirs(hex_dir)
        print(f"  Created directory: {hex_dir}")
    
    # Create dummy hex files
    hex_files = [
        "hello.srec",
        "ECM_1_1_0.hex",
        "ECM_1_2_0.hex",
        "TCM_1_0_0.hex",
        "TCM_1_1_0.hex",
        "BCM_1_0_0.hex",
        "BMS_1_0_0.hex",
        "BMS_1_2_0.hex"
    ]
    
    for file_name in hex_files:
        file_path = os.path.join(hex_dir, file_name)
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                f.write(f"Dummy hex content for {file_name}")
            print(f"  Created dummy file: {file_path}")

def print_analytics_summary():
    """Print analytics summary of loaded data"""
    print("\n" + "="*50)
    print("📊 FLASHING ANALYTICS SUMMARY")
    print("="*50)
    
    # Overall statistics
    total_feedback = flashing_feedback_collection.count_documents({})
    completed_sessions = flashing_feedback_collection.count_documents({"overall_status": "completed"})
    partial_sessions = flashing_feedback_collection.count_documents({"overall_status": "partial_failure"})
    failed_sessions = flashing_feedback_collection.count_documents({"overall_status": "failed"})
    
    print(f"📋 Total Flashing Sessions: {total_feedback}")
    print(f"✅ Successful Sessions: {completed_sessions} ({(completed_sessions/total_feedback)*100:.1f}%)")
    print(f"⚠️ Partial Success Sessions: {partial_sessions} ({(partial_sessions/total_feedback)*100:.1f}%)")
    print(f"❌ Failed Sessions: {failed_sessions} ({(failed_sessions/total_feedback)*100:.1f}%)")
    
    # Car type breakdown
    print(f"\n🚗 BY CAR TYPE:")
    for car_type in ["ModelX", "ModelY"]:
        type_sessions = flashing_feedback_collection.count_documents({"car_type": car_type})
        type_success = flashing_feedback_collection.count_documents({"car_type": car_type, "overall_status": "completed"})
        success_rate = (type_success/type_sessions)*100 if type_sessions > 0 else 0
        print(f"   {car_type}: {type_sessions} sessions, {success_rate:.1f}% success rate")
    
    # ECU performance
    print(f"\n🔧 TOP PERFORMING ECUs:")
    top_ecus = flashing_metrics_collection.find().sort("success_rate", -1).limit(3)
    for ecu in top_ecus:
        print(f"   {ecu['ecu_name']} ({ecu['car_type']}): {ecu['success_rate']:.1f}% success rate")
    
    # Recent activity
    recent_count = flashing_feedback_collection.count_documents({
        "received_timestamp": {"$gte": datetime.now() - timedelta(days=7)}
    })
    print(f"\n📅 Recent Activity (7 days): {recent_count} flashing sessions")
    
    print("="*50)

def main():
    """Main function to load all demo data including flashing feedback"""
    try:
        # Test connection
        client.admin.command('ping')
        print("Connected successfully to MongoDB!")
        
        # Clear existing data
        clear_collections()
        
        # Create hex files directory and dummy files
        ensure_hex_file_directory()
        
        # Load basic data with proper references
        version_mapping = load_versions()
        ecu_mapping = load_ecus(version_mapping)
        load_car_types(ecu_mapping)
        load_sample_requests()
        
        # Load flashing feedback data
        load_sample_flashing_feedback()
        load_sample_flashing_metrics()
        load_sample_car_flashing_history()
        
        print("\n✅ Demo data with flashing feedback loaded successfully!")
        
        # Verify the data
        print("\n📊 Data counts:")
        print(f"Car Types: {car_types_collection.count_documents({})}")
        print(f"ECUs: {ecus_collection.count_documents({})}")
        print(f"Versions: {versions_collection.count_documents({})}")
        print(f"Requests: {requests_collection.count_documents({})}")
        print(f"Download Requests: {download_requests_collection.count_documents({})}")
        print(f"Flashing Feedback: {flashing_feedback_collection.count_documents({})}")
        print(f"Flashing Metrics: {flashing_metrics_collection.count_documents({})}")
        print(f"Car Flashing History: {car_flashing_history_collection.count_documents({})}")
        
        # Print analytics summary
        print_analytics_summary()
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
    finally:
        # Close the connection
        client.close()
        print("\n🔌 MongoDB connection closed")

if __name__ == "__main__":
    main()