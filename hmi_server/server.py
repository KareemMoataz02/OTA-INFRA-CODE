import socket
import threading
import time
from typing import Dict, List, Optional
from datetime import datetime
import logging
from models import *
from protocol import Protocol
from database_manager import DatabaseManager
from bson import ObjectId
import uuid

logging.basicConfig(level=logging.INFO)

class ECUUpdateServer:
    def __init__(self, host: str, port: int, data_directory: str):
        self.host = host
        self.port = port
        self.db_manager = DatabaseManager(data_directory)
        self.data_directory = data_directory
        self.car_types: List[CarType] = []
        self.active_requests: Dict[str, Request] = {}  # car_id -> Request
        self.active_downloads: Dict[str, DownloadRequest] = {}  # car_id -> DownloadRequest
        self.chunk_size = 8192  # 8KB chunks for file transfer
        self.socket = None
        self.running = False

    def start(self):
        """Start the server"""
        try:
            # Load database
            self.car_types = self.db_manager.load_all_data()
            if not self.car_types:
                raise Exception("Failed to load car types database")
            print(self.car_types)
            # Create and bind socket
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.host, self.port))
            self.socket.listen(5)
            self.running = True

            logging.info(f"Server started on {self.host}:{self.port}")
            logging.info(f"🔄 Flashing feedback collection enabled")
            
            # Start accepting connections
            while self.running:
                try:
                    client_socket, (client_ip, client_port) = self.socket.accept()
                    client_thread = threading.Thread(
                        target=self.handle_client,
                        args=(client_socket, client_ip, client_port)
                    )
                    client_thread.daemon = True
                    logging.info(f"new socket communication received from ip: {str(client_ip)} , port number: {str(client_port)}")
                    client_thread.start()
                except Exception as e:
                    if self.running:
                        logging.error(f"Error accepting connection: {str(e)}")

        except Exception as e:
            logging.error(f"Failed to start server: {str(e)}")
            self.shutdown()

    def handle_client(self, client_socket: socket.socket, client_ip: str, client_port: int):
        """Handle individual client connection"""
        try:
            logging.info(f"starting new thread handling request from client ip:{client_ip} and port {client_port}")
            client_socket.settimeout(1000)  # Set timeout for client operations
            
            # Receive initial message
            message = self.receive_message(client_socket)

            if not message:
                logging.error(f"No initial message received from {client_ip}:{client_port}")
                return
            
            logging.info(f"received new message from client ip: {client_ip} , message:: {str(message)}")  

            if message['type'] != Protocol.HANDSHAKE:
                logging.error(f"Invalid initial message type from {client_ip}:{client_port}")
                client_socket.send(Protocol.create_error_message(400, "Invalid initial message"))
                return

            # Extract client information
            payload = message['payload']
            car_type = payload.get('car_type')
            car_id = payload.get('car_id')

            if not car_type or not car_id:
                logging.error(f"Missing required information in handshake from {client_ip}:{client_port}")
                client_socket.send(Protocol.create_error_message(400, "Missing required information"))
                return
            
            logging.info(f"client ip: {client_ip} is a car with car ID: {car_id} and car_type: {car_type}")

            service_type = ServiceType(payload['service_type'])

            logging.info(f"client ip: {client_ip} is a car with car ID: {car_id} and car_type: {car_type}. service needed:: {service_type}")

            # Create request object
            request = Request(
                timestamp=datetime.now(),
                car_type=car_type,
                car_id=car_id,
                ip_address=client_ip,
                port=client_port,
                service_type=service_type,
                metadata=payload.get('metadata', {}),
                status=RequestStatus.CHECKING_AUTHENTICITY
            )
            logging.info(f"new Request has been created for car with client ip:{request.ip_address}. status:{request.status}")

            # Authenticate and process request
            if self.check_authentication(request):
                logging.info(f"Authentication success for request from client ip:{request.ip_address}")
                client_socket.send(Protocol.create_message(Protocol.HANDSHAKE, {
                    'status': 'authenticated',
                    'message': 'Connection established'
                }))

                # Initial update check
                logging.info(f"Performing initial update check for car ID: {car_id}")
                self.check_for_updates(request, client_socket)

                # Keep connection alive and handle subsequent requests
                logging.info(f"Maintaining connection for car ID: {car_id} to handle subsequent requests")
                while True:
                    logging.info(f"Waiting for next request from car ID: {car_id}")
                    message = self.receive_message(client_socket)
                    
                    if not message:
                        logging.info(f"Client {car_id} disconnected gracefully")
                        break

                    logging.info(f"Received request from car ID: {car_id}, message type: {message['type']}")

                    if message['type'] == Protocol.DOWNLOAD_REQUEST:
                        logging.info(f"Processing download request from car ID: {car_id}")
                        request.service_type = ServiceType.DOWNLOAD_UPDATE
                        request.metadata = message['payload']
                        self.handle_download_request(request, client_socket)
                        logging.info(f"Completed download request processing for car ID: {car_id}")
                    
                    elif message['type'] == Protocol.UPDATE_CHECK:
                        logging.info(f"Processing update check request from car ID: {car_id}")
                        request.service_type = ServiceType.CHECK_FOR_UPDATE
                        request.metadata = message['payload']
                        self.check_for_updates(request, client_socket)
                        logging.info(f"Completed update check for car ID: {car_id}")
                    
                    # NEW: Handle flashing feedback
                    elif message['type'] == Protocol.FLASHING_FEEDBACK:
                        logging.info(f"📋 Processing flashing feedback from car ID: {car_id}")
                        self.handle_flashing_feedback(request, message['payload'], client_socket)
                        logging.info(f"✅ Completed flashing feedback processing for car ID: {car_id}")
                    
                    # NEW: Handle server metrics request
                    elif message['type'] == Protocol.SERVER_METRICS_REQUEST:
                        logging.info(f"📊 Processing metrics request from car ID: {car_id}")
                        self.handle_metrics_request(request, message['payload'], client_socket)
                        logging.info(f"✅ Completed metrics request for car ID: {car_id}")
                    
                    else:
                        logging.warning(f"Unknown message type '{message['type']}' received from car ID: {car_id}")
                        client_socket.send(Protocol.create_error_message(
                            400, f"Unknown message type: {message['type']}"
                        ))

            else:
                logging.info(f"Authentication failed for request from client ip:{request.ip_address}")
                client_socket.send(Protocol.create_error_message(401, "Authentication failed"))

        except socket.timeout:
            logging.error(f"Connection timeout for {client_ip}:{client_port}")
        except ConnectionError as e:
            logging.error(f"Connection error for {client_ip}:{client_port}: {str(e)}")
        except Exception as e:
            logging.error(f"Error handling client {client_ip}:{client_port}: {str(e)}")
        finally:
            try:
                logging.info(f"Closing connection for client {client_ip}:{client_port}")
                client_socket.close()
            except Exception as e:
                logging.error(f"Error closing connection for {client_ip}:{client_port}: {str(e)}")
            logging.info(f"Connection terminated for client {client_ip}:{client_port}")

    # NEW: Handle flashing feedback from cars
    def handle_flashing_feedback(self, request: Request, payload: Dict, client_socket: socket.socket):
        """Handle flashing feedback received from a car"""
        try:
            logging.info(f"📋 Processing flashing feedback from car {request.car_id}")
            
            # Extract feedback data from payload
            feedback_data = payload.get('data', {})
            
            # Validate required fields
            required_fields = ['session_id', 'car_id', 'car_type', 'flashing_timestamp', 
                             'overall_status', 'total_ecus', 'final_ecu_versions']
            
            for field in required_fields:
                if field not in feedback_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Convert timestamp from milliseconds to datetime
            flashing_timestamp = datetime.fromtimestamp(feedback_data['flashing_timestamp'] / 1000)
            
            # Create FlashingFeedback object
            feedback = FlashingFeedback(
                session_id=feedback_data['session_id'],
                car_id=feedback_data['car_id'],
                car_type=feedback_data['car_type'],
                flashing_timestamp=flashing_timestamp,
                overall_status=feedback_data['overall_status'],
                total_ecus=feedback_data['total_ecus'],
                successful_ecus=feedback_data.get('successful_ecus', []),
                rolled_back_ecus=feedback_data.get('rolled_back_ecus', []),
                final_ecu_versions=feedback_data['final_ecu_versions'],
                android_app_version=feedback_data.get('android_app_version', 'unknown'),
                beaglebone_version=feedback_data.get('beaglebone_version', 'unknown'),
                request_id=feedback_data.get('request_id', ''),
                received_timestamp=datetime.now()
            )
            
            # Validate car exists in database
            if not self.db_manager.validate_car_exists(feedback.car_id, feedback.car_type):
                error_msg = f"Car {feedback.car_id} of type {feedback.car_type} not found in database"
                logging.error(error_msg)
                client_socket.send(Protocol.create_flashing_feedback_ack(
                    success=False, 
                    message=error_msg
                ))
                return
            
            # Save feedback to database
            success = self.db_manager.save_flashing_feedback(feedback)
            
            if success:
                # Send acknowledgment to car
                client_socket.send(Protocol.create_flashing_feedback_ack(
                    success=True,
                    message=f"Flashing feedback received and processed successfully",
                    session_id=feedback.session_id
                ))
                
                logging.info(f"✅ Flashing feedback processed successfully for car {request.car_id}")
                logging.info(f"   Session ID: {feedback.session_id}")
                logging.info(f"   Status: {feedback.overall_status}")
                logging.info(f"   Successful ECUs: {len(feedback.successful_ecus)}")
                logging.info(f"   Rolled back ECUs: {len(feedback.rolled_back_ecus)}")
                
                # Log detailed results for monitoring
                self._log_flashing_results(feedback)
                
            else:
                client_socket.send(Protocol.create_flashing_feedback_ack(
                    success=False,
                    message="Failed to save flashing feedback to database"
                ))
                logging.error(f"❌ Failed to save flashing feedback for car {request.car_id}")
                
        except ValueError as e:
            logging.error(f"Invalid flashing feedback data from car {request.car_id}: {str(e)}")
            client_socket.send(Protocol.create_flashing_feedback_ack(
                success=False,
                message=f"Invalid feedback data: {str(e)}"
            ))
        except Exception as e:
            logging.error(f"Error processing flashing feedback from car {request.car_id}: {str(e)}")
            client_socket.send(Protocol.create_flashing_feedback_ack(
                success=False,
                message=f"Server error processing feedback: {str(e)}"
            ))

    # NEW: Handle server metrics requests
    def handle_metrics_request(self, request: Request, payload: Dict, client_socket: socket.socket):
        """Handle server metrics request from a car"""
        try:
            logging.info(f"📊 Processing metrics request from car {request.car_id}")
            
            # Get metrics based on request type
            metrics_type = payload.get('metrics_type', 'summary')
            car_type_filter = payload.get('car_type_filter')
            days = payload.get('days', 30)
            
            if metrics_type == 'summary':
                metrics = self.db_manager.get_flashing_metrics_summary(
                    car_type=car_type_filter, 
                    days=days
                )
            elif metrics_type == 'car_history':
                car_id = payload.get('target_car_id', request.car_id)
                metrics = self.db_manager.get_car_flashing_history(car_id)
            elif metrics_type == 'ecu_success_rates':
                metrics = self.db_manager.get_ecu_success_rates(car_type=car_type_filter)
            elif metrics_type == 'recent_activities':
                limit = payload.get('limit', 50)
                metrics = self.db_manager.get_recent_flashing_activities(limit=limit)
            else:
                metrics = {"error": f"Unknown metrics type: {metrics_type}"}
            
            # Send metrics response
            client_socket.send(Protocol.create_metrics_response(metrics))
            logging.info(f"✅ Sent {metrics_type} metrics to car {request.car_id}")
            
        except Exception as e:
            logging.error(f"Error processing metrics request from car {request.car_id}: {str(e)}")
            client_socket.send(Protocol.create_error_message(
                500, f"Failed to retrieve metrics: {str(e)}"
            ))

    # NEW: Log flashing results for monitoring
    def _log_flashing_results(self, feedback: FlashingFeedback):
        """Log detailed flashing results for monitoring and analytics"""
        try:
            logging.info(f"📈 FLASHING ANALYTICS - Car: {feedback.car_id}")
            logging.info(f"   Car Type: {feedback.car_type}")
            logging.info(f"   Session: {feedback.session_id}")
            logging.info(f"   Timestamp: {feedback.flashing_timestamp}")
            logging.info(f"   Overall Status: {feedback.overall_status.upper()}")
            logging.info(f"   Total ECUs: {feedback.total_ecus}")
            
            if feedback.successful_ecus:
                logging.info(f"   ✅ Successful ECUs ({len(feedback.successful_ecus)}):")
                for ecu in feedback.successful_ecus:
                    version = feedback.final_ecu_versions.get(ecu, 'unknown')
                    logging.info(f"      • {ecu} → {version}")
            
            if feedback.rolled_back_ecus:
                logging.info(f"   ⚠️ Rolled Back ECUs ({len(feedback.rolled_back_ecus)}):")
                for ecu in feedback.rolled_back_ecus:
                    version = feedback.final_ecu_versions.get(ecu, 'unknown')
                    logging.info(f"      • {ecu} → {version} (rolled back)")
            
            failed_count = feedback.total_ecus - len(feedback.successful_ecus) - len(feedback.rolled_back_ecus)
            if failed_count > 0:
                logging.info(f"   ❌ Failed ECUs: {failed_count}")
            
            # Calculate success rate for this session
            success_rate = (len(feedback.successful_ecus) / feedback.total_ecus) * 100 if feedback.total_ecus > 0 else 0
            logging.info(f"   📊 Session Success Rate: {success_rate:.1f}%")
            
        except Exception as e:
            logging.error(f"Error logging flashing results: {str(e)}")

    # Keep all existing methods unchanged
    def check_authentication(self, request: Request) -> bool:
        """Authenticate the car request"""
        try:
            car_type = next((ct for ct in self.car_types 
                           if ct.name.lower() == request.car_type.lower()), None)
            
            if not car_type:
                print("bazet fl car type")
                request.status = RequestStatus.NON_AUTHENTICATED
                return False

            print(f"\n\n request.car_id.lower(): {request.car_id.lower()}")
            print(f"car_type.car_ids: {car_type.car_ids}")
            car_type.car_ids = [car_id.lower() for car_id in car_type.car_ids]
            if request.car_id.lower() not in car_type.car_ids:
                print("bazet fl id")
                request.status = RequestStatus.NON_AUTHENTICATED
                return False

            request.status = RequestStatus.AUTHENTICATED
            self.active_requests[request.car_id] = request
            return True

        except Exception as e:
            logging.error(f"Authentication error: {str(e)}")
            request.status = RequestStatus.FAILED
            return False

    def check_for_updates(self, request: Request, client_socket: socket.socket):
        self.db_manager = DatabaseManager(data_directory=self.data_directory)
        self.car_types = self.db_manager.load_all_data()
        logging.info(f"checking-for-update method started processing for client:{request.ip_address}")
        """Check if updates are available for the car"""
        try:
            car_type = next((ct for ct in self.car_types 
                        if ct.name == request.car_type), None)
            
            if not car_type:
                raise Exception("Car type not found")

            # Get current versions from metadata
            current_versions = request.metadata.get('ecu_versions', {})
            
            # Check for updates
            updates_needed = car_type.check_for_updates(current_versions)
            logging.info(f"updates needed response for client with ip:{request.ip_address}")
            # Send response
            response = Protocol.create_update_response(updates_needed)
            
            client_socket.send(response)
            logging.info(f"updates needed response for client with ip:{request.ip_address} is send successfully with message:{response}")
            logging.info(f"Request for: {request.ip_address} finished successfully")
            request.status = RequestStatus.FINISHED_SUCCESSFULLY

        except Exception as e:
            logging.error(f"Update check error: {str(e)}")
            request.status = RequestStatus.FAILED
            client_socket.send(Protocol.create_error_message(
                500, "Update check failed"
            ))

    # ... Keep all other existing methods unchanged (handle_download_request, send_new_versions, etc.) ...

    def handle_download_request(self, request: Request, client_socket: socket.socket):
        """Handle download request for new ECU versions"""
        try:
            logging.info(f"starting new download request for client with ip:{request.ip_address} on port:{request.port}")
            # Get download information from metadata
            required_versions = request.metadata.get('required_versions', {})
            old_versions = request.metadata.get('old_versions', {})

            file_offsets = request.metadata.get('file_offsets', {})
            print(f"\n\nserver: file_offsets: {file_offsets}\n\n")
            
            if not required_versions:
                raise Exception("No versions specified for download")

            # Create download request
            download_request = DownloadRequest(
                timestamp=datetime.now(),
                car_type=request.car_type,
                car_id=request.car_id,
                ip_address=request.ip_address,
                port=request.port,
                required_versions=required_versions,
                old_versions=old_versions,
                status=DownloadStatus.PREPARING_FILES,
                active_transfers={},
                file_offsets=file_offsets
            )

            self.active_downloads[request.car_id] = download_request
            
            # Start download process
            self.send_new_versions(download_request, client_socket)

        except Exception as e:
            logging.error(f"Download request error: {str(e)}")
            request.status = RequestStatus.FAILED
            client_socket.send(Protocol.create_error_message(
                500, "Download request failed"
            ))

    def send_new_versions(self, download_request: DownloadRequest, client_socket: socket.socket):
        """Send new ECU versions to client"""
        try:
            car_type = next((ct for ct in self.car_types 
                           if ct.name == download_request.car_type), None)
            
            if not car_type:
                raise Exception("Car type not found")

            download_request.status = DownloadStatus.SENDING_IN_PROGRESS
            
            # Calculate total size and prepare file information
            files_info = {}
            total_size = 0
            
            for ecu_name, version_number in download_request.required_versions.items():
                ecu = next((e for e in car_type.ecus if e.name == ecu_name), None)
                if not ecu:
                    continue
                
                version = next((v for v in ecu.versions 
                              if v.version_number == version_number), None)
                if not version:
                    continue

                file_size = self.db_manager.get_file_size(version.hex_file_path)
                total_size += file_size
                
                # Get offset from download_request.files_offset (default to 0)
                offset = download_request.file_offsets.get(ecu_name, 0)

                files_info[ecu_name] = {
                    'path': version.hex_file_path,
                    'size': file_size,
                    'transferred': offset  # <-- Use offset here
                }

            download_request.total_size = total_size

            # Send download start message
            start_message = Protocol.create_message(Protocol.DOWNLOAD_START, {
                'total_size': total_size,
                'files': {name: info['size'] for name, info in files_info.items()},
                'file_offsets': {name: info['transferred'] for name, info in files_info.items()}
            })
            
            client_socket.send(start_message)
            logging.info(f"Download Start message for client on ip:{download_request.ip_address} port: {download_request.port} , with message:{start_message}")
            
            # Wait for client acknowledgment
            ack = self.receive_message(client_socket)
            if not ack or ack['type'] != "DOWNLOAD_ACK":
                raise Exception("Client did not acknowledge download start")

            # Send files
            successful_transfers = 0
            for ecu_name, file_info in files_info.items():
                try:
                    self.transfer_file(
                        client_socket,
                        ecu_name,
                        file_info['path'],
                        file_info['size'],
                        download_request,
                        start_offset=file_info['transferred']  # <-- Pass offset here
                    )
                    successful_transfers += 1
                except Exception as e:
                    logging.error(f"Error transferring {ecu_name}: {str(e)}")

            # Update final status
            if successful_transfers == len(files_info):
                download_request.status = DownloadStatus.FINISHED_SUCCESSFULLY
            elif successful_transfers > 0:
                download_request.status = DownloadStatus.FAILED_PARTIAL_SUCCESS
            else:
                download_request.status = DownloadStatus.ALL_FAILED

            # Send completion message
            completion_message = Protocol.create_message(Protocol.DOWNLOAD_COMPLETE, {
                'status': download_request.status.value,
                'successful_transfers': successful_transfers,
                'total_files': len(files_info)
            })
            client_socket.send(completion_message)

        except Exception as e:
            logging.error(f"File transfer error: {str(e)}")
            download_request.status = DownloadStatus.ALL_FAILED
            client_socket.send(Protocol.create_error_message(
                500, "File transfer failed"
            ))

    def transfer_file(self, client_socket: socket.socket, ecu_name: str, 
                     file_path: str, file_size: int, download_request: DownloadRequest, start_offset: int = 0):
        """Transfer a single file to client"""
        print(f"file_path: {file_path}")
        print(f"File offset: {start_offset}")
        offset = start_offset
        while offset < file_size:
            chunk = self.db_manager.get_hex_file_chunk(file_path, self.chunk_size, offset)
            if not chunk:
                raise Exception(f"Failed to read chunk from {file_path}")

            # Create chunk message
            chunk_message = Protocol.create_message(Protocol.FILE_CHUNK, {
                'ecu_name': ecu_name,
                'offset': offset,
                'data': chunk.hex()  # Convert binary to hex string
            })
            client_socket.send(chunk_message)

            # Wait for chunk acknowledgment
            ack = self.receive_message(client_socket)
            if not ack or ack['type'] != "CHUNK_ACK":
                raise Exception("Chunk not acknowledged")

            offset += len(chunk)
            download_request.transferred_size += len(chunk)

    def receive_message(self, client_socket: socket.socket) -> Optional[Dict]:
        """Receive and parse a message from the client"""
        try:
            # First receive message length (10 bytes)
            length_data = b""
            while len(length_data) < 10:
                chunk = client_socket.recv(10 - len(length_data))
                if not chunk:
                    logging.error("Connection closed by peer while receiving message length")
                    return None
                length_data += chunk
            
            message_length = int(length_data.decode())
            
            # Receive the actual message
            message_data = b""
            while len(message_data) < message_length:
                remaining = message_length - len(message_data)
                chunk = client_socket.recv(min(self.chunk_size, remaining))
                if not chunk:
                    logging.error("Connection closed by peer while receiving message data")
                    return None
                message_data += chunk

            return Protocol.parse_message(message_data)

        except socket.timeout:
            logging.error("Socket timeout while receiving message")
            return None
        except ConnectionError as e:
            logging.error(f"Connection error while receiving message: {str(e)}")
            return None
        except Exception as e:
            logging.error(f"Error receiving message: {str(e)}")
            return None

    def shutdown(self):
        """Shutdown the server"""
        self.running = False
        if self.socket:
            self.socket.close()