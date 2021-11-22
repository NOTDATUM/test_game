import json
import struct

from hashlib import sha1
from base64 import b64encode
from socketserver import ThreadingMixIn, TCPServer, BaseRequestHandler

class WebsocketServer( ThreadingMixIn, TCPServer ):
	allow_reuse_address = True
	daemon_threads = True

	client_id = 0
	clients = []
	all_data = {}
	
	def __init__( self, host, port, handlerClass ):
		TCPServer.__init__( self, ( host, port ), handlerClass )

	def find_client( self, handler ):
		for client in self.clients:
			if client[ 'handler' ] == handler:
				return client

	def in_client( self, handler ):
		self.client_id += 1
		self.clients.append( { 'id' : str( self.client_id ), 'handler' : handler } )
		print( 'In client ' + str( self.client_id ) )

	def out_client( self, handler ):
		for client in self.clients:
			if client[ 'handler' ] == handler:
				self.clients.remove( client )
				del self.all_data[ client[ 'id' ] ]
				handler.send_message( json.dumps( { 'code' : 0, 'message' : 'success' } ) )
				print( 'Out client ' + client[ 'id' ] )
				break

	def receive_message( self, handler, message ):
		client = self.find_client( handler )
		oper, data = message.split( '::' )
		data = json.loads( data )
	 
		if oper == 'register':
			if len( self.all_data ) == 2:
				handler.send_message( json.dumps( { 'code' : -1, 'message' : 'Many peoples' } ) )
				return
			print( 'Register client : ' + str( client[ 'id' ] ) )
			self.all_data[ client[ 'id' ] ] = { 'speedV' : 0, 'speedH' : 0, 'left' : 0, 'top' : 0, 'direction' : 'DOWN', 'status' : 'STAY', 'attackStatus' : 'none', 'energy' : 30 }
			handler.send_message( json.dumps( { 'code' : 0, 'message' : 'success', 'data' : { 'userId' : client[ 'id' ] }, 'status' : 'register' } ) )
		elif oper == 'data':
			handler.send_message( json.dumps( { 'code' : 0, 'message' : 'success', 'data' : self.all_data, 'time' : data[ 'time' ], 'status' : 'data' } ) )
		elif oper == 'update':
			self.all_data[ client[ 'id' ] ][ 'speedV' ] = data[ 'speedV' ]
			self.all_data[ client[ 'id' ] ][ 'speedH' ] = data[ 'speedH' ]
			self.all_data[ client[ 'id' ] ][ 'left' ] = data[ 'left' ]
			self.all_data[ client[ 'id' ] ][ 'top' ] = data[ 'top' ]
			self.all_data[ client[ 'id' ] ][ 'direction' ] = data[ 'direction' ]
			self.all_data[ client[ 'id' ] ][ 'status' ] = data[ 'status' ]
			self.all_data[ client[ 'id' ] ][ 'attackStatus' ] = data[ 'attackStatus' ]
	 
			if data[ 'attackStatus' ] == 'success':
				for key in self.all_data.keys():
					if key != client[ 'id' ]:
						self.all_data[ key ][ 'energy' ] = self.all_data[ key ][ 'energy' ] - 1
	 
			handler.send_message( json.dumps( { 'code' : 0, 'message' : 'success', 'status' : 'update' } ) )

class WebsocketRequestHandler( BaseRequestHandler ):
	def setup( self ):
		self.socket = self.request
		self.is_valid = True
		self.is_handshake = False

	def handle( self ):
		while self.is_valid:
			if not self.is_handshake:
				self.handshake()
			else:
				self.receive_message()

	def finish( self ):
		self.server.out_client( self )

	def handshake( self ):
		header = self.socket.recv( 1024 ).decode().strip()
		request_key = ''

		for each in header.split( '\r\n' ):
			if each.find( ': ' ) == -1:
				continue
			( k, v ) = each.split( ': ' )
			if k.strip().lower() == 'sec-websocket-key':
				request_key = v.strip()
				break

		if not request_key:
			self.is_valid = False
			print( 'Not valid handshake request_key' )
			return

		response_key = b64encode( sha1( request_key.encode() + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'.encode() ).digest() ).strip().decode()
		response = \
			'HTTP/1.1 101 Switching Protocols\r\n'\
			'Upgrade: websocket\r\n'\
			'Connection: Upgrade\r\n'\
			'Sec-WebSocket-Accept: %s\r\n'\
			'\r\n' % response_key

		self.is_handshake = self.socket.send( response.encode() )
		self.server.in_client( self )
		print( 'Handshake OK!' )

	def send_message( self, message ):
		header = bytearray()
		payload = message.encode( 'UTF-8' )
		payload_length = len( payload )

		header.append( 129 )

		if payload_length <= 125:
			header.append( payload_length )
		elif payload_length >= 126 and payload_length <= pow( 2, 16 ):
			header.append( 126 )
			header.extend( struct.pack( '>H', payload_length ) )
		elif payload_length <= pow( 2, 64 ):
			header.append( 127 )
			header.extend( struct.pack( '>Q', payload_length ) )
		else:
			print( 'Not valid send payload_length' )
			return

		self.socket.send( header + payload )

	def receive_message( self ):
		byte1, byte2 = self.socket.recv( 2 )

		opcode = byte1 & 15
		is_mask = byte2 & 128
		payload_length = byte2 & 127

		if not byte1 or opcode == 8 or not is_mask:
			self.is_valid = False
			return

		if payload_length == 126:
			payload_length = struct.unpack( '>H', self.socket.recv( 2 ) )[ 0 ]
		elif payload_length == 127:
			payload_length = struct.unpack( '>Q', self.socket.recv( 4 ) )[ 0 ]

		masks = self.socket.recv( 4 )
		payload = self.socket.recv( payload_length )
		message = ''

		for byte in payload:
			byte ^= masks[ len( message ) % 4 ]
			message += chr( byte )

		self.server.receive_message( self, message )

try:
	port = 8080
	wsd = WebsocketServer( '0.0.0.0', port, WebsocketRequestHandler )
	print( 'Starting simple_wsd on port ' + str( port ) )
	wsd.serve_forever()

except KeyboardInterrupt:
	print( 'Shutting down simple_wsd' )
	wsd.socket.close()