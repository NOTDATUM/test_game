(function() {
	'use strict';
	
	var
	CHARACTER_SIZE = 96,
	CORRECT_LVALUE = 11 * 3,
	CORRECT_TVALUE = 8 * 3,
	
	initialize, painters, requestId, sog, Game, Server, Sprite, Painter, Actors, PainterFactory,
	
	moveUp = new Image( CHARACTER_SIZE, CHARACTER_SIZE ),
	moveDown = new Image( CHARACTER_SIZE, CHARACTER_SIZE ),
	moveLeft = new Image( CHARACTER_SIZE, CHARACTER_SIZE ),
	moveRight = new Image( CHARACTER_SIZE, CHARACTER_SIZE ),
	attackUp = new Image( CHARACTER_SIZE, CHARACTER_SIZE ),
	attackDown = new Image( CHARACTER_SIZE, CHARACTER_SIZE ),
	attackLeft = new Image( CHARACTER_SIZE, CHARACTER_SIZE ),
	attackRight = new Image( CHARACTER_SIZE, CHARACTER_SIZE )
	;
	
	function createPlayerPainters() {
		var painters = {};
		
		for ( var p in sog.sprite ) {
			painters[ p ] = {
				UP : {
					STAY : PainterFactory.create( PainterFactory.UP ),
					MOVE : PainterFactory.create( PainterFactory.UP ),
					ATTACK : PainterFactory.create( PainterFactory.ATTACK_UP )
				},
				DOWN : {
					STAY : PainterFactory.create( PainterFactory.DOWN ),
					MOVE : PainterFactory.create( PainterFactory.DOWN ),
					ATTACK : PainterFactory.create( PainterFactory.ATTACK_DOWN )
				},
				LEFT : {
					STAY : PainterFactory.create( PainterFactory.LEFT ),
					MOVE : PainterFactory.create( PainterFactory.LEFT ),
					ATTACK : PainterFactory.create( PainterFactory.ATTACK_LEFT )
				},
				RIGHT : {
					STAY : PainterFactory.create( PainterFactory.RIGHT ),
					MOVE : PainterFactory.create( PainterFactory.RIGHT ),
					ATTACK : PainterFactory.create( PainterFactory.ATTACK_RIGHT )
				}
			};
		}
		
		return painters;
	}

	function createActive( $interval, $length ) {
		var active = [], i;

		for ( i = 0; i < $length; i++ ) {
			active.push( { left : i * $interval, top : 0, width : $interval, height : $interval } );
		}

		return active;
	}
	
	function setSpriteData( $sprite, $data ) {
		var painter = painters[ $sprite === sog.sprite.p1 ? 'p1' : 'p2' ][ $data.direction ][ $data.status ];
		
		if ( $sprite.painter !== painter ) {
			$sprite.painter = painter;
		}
		if ( $data.status === 'MOVE' || $data.status === 'ATTACK' ) {
			setAllActors( $sprite );
		} else {
			clearAllActors( $sprite );
		}
	}
	
	function setAllActors( $sprite ) {
		for ( var name in Actors ) {
			if ( !( name in $sprite.actors ) ) {
				$sprite.actors[ name ] = new Actors[ name ];
			}
		}
	}
	
	function clearAllActors( $sprite ) {
		for ( var name in Actors ) {
			delete $sprite.actors[ name ];
		}
	}

	function collision( $data ) {
		var
		p1 = sog.sprite.p1,
		p1Left = p1.left + CORRECT_LVALUE,
		p1Right = p1Left + CHARACTER_SIZE - CORRECT_LVALUE * 2,
		p1Top = p1.top + CORRECT_TVALUE,
		p1Bottom = p1Top + CHARACTER_SIZE - CORRECT_LVALUE - CORRECT_TVALUE,		
		
		nextLeft = p1Left + $data.speedV,
		nextRight = p1Right + $data.speedV,
		nextTop = p1Top + $data.speedH,
		nextBottom = p1Bottom + $data.speedH,

		attackLeft = p1.left,
		attackRight = attackLeft + CHARACTER_SIZE,
		attackTop = p1.top + CORRECT_TVALUE / 2 + 5,
		attackBottom = attackTop + CHARACTER_SIZE - ( CORRECT_TVALUE / 2 + 5 ) * 2,

		p2 = sog.sprite.p2, p2Left, p2Right, p2Top, p2Bottom;
		
		// Wall
		if ( nextLeft < 0 || nextRight > sog.context.canvas.width || nextTop < 0 || nextBottom > sog.context.canvas.height ) {
			p1.data.direction = $data.direction;
			$util.fireEvent( document, 'keyup' );
			return false;
		}

		if ( p2 ) {
			p2Left = p2.left + CORRECT_LVALUE;
			p2Right = p2Left + CHARACTER_SIZE - CORRECT_LVALUE * 2;
			p2Top = p2.top + CORRECT_TVALUE;
			p2Bottom = p2Top + CHARACTER_SIZE - CORRECT_LVALUE - CORRECT_TVALUE;

			if ( ! ( ( p1Left >= p2Left && p1Left <= p2Right || p1Right >= p2Left && p1Right <= p2Right ) &&
				 	 ( p1Top >= p2Top && p1Top <= p2Bottom || p1Bottom >= p2Top && p1Bottom <= p2Bottom ) ) ) {
				// Charactor
				if ( ( nextLeft >= p2Left && nextLeft <= p2Right || nextRight >= p2Left && nextRight <= p2Right ) &&
					 ( nextTop >= p2Top && nextTop <= p2Bottom || nextBottom >= p2Top && nextBottom <= p2Bottom ) ) {
					p1.data.direction = $data.direction;
					$util.fireEvent( document, 'keyup' );
					return false;
				}

				// Attack
				if ( $data.status === 'ATTACK' ) {
					if ( ( $data.direction === 'UP' && p1Left >= p2Left && p1Left <= p2Right && p1Top >= p2Bottom && attackTop <= p2Bottom ) ||
						 ( $data.direction === 'DOWN' && p1Right >= p2Left && p1Right <= p2Right && p1Bottom <= p2Top && attackBottom >= p2Top ) ||
						 ( $data.direction === 'LEFT' && attackTop <= p2Top && attackBottom >= p2Bottom && p1Left >= p2Right && attackLeft <= p2Right ) ||
						 ( $data.direction === 'RIGHT' && attackTop <= p2Top && attackBottom >= p2Bottom && p1Right <= p2Left && attackRight >= p2Left ) ) {
							$data.attackStatus = 'success';
					}
				}
			}
		}

		return true;
	}
	
	Game = function( $params ) {
		this.context = $params.context;
		this.server = $params.server;
		this.sprite = {};
		this.sprite.p1 = $params.sprite;
		this.sprite.p2 = null;
	};
	
	Game.prototype.start = function() {
		painters = createPlayerPainters();
		this.server.connect( this.registerCB, this.dataCB );
	};
	
	Game.prototype.progress = function( $time ) {
		this.server.data( $time );
	};

	Game.prototype.registerCB = function( $data ) {
		this.server.userId = $data.userId;
		requestId = requestAnimationFrame( $util.fn( this.progress, this ) );
	};

	Game.prototype.dataCB = function( $data, $time ) {
		var p2, id;

		if ( $data[ this.server.userId ].energy < 1 ) {
			this.server.exit();
		}

		this.context.clearRect( 0, 0, this.context.canvas.width, this.context.canvas.height );
		setSpriteData( this.sprite.p1, $data[ this.server.userId ] );
		this.sprite.p1.update( $data[ this.server.userId ], $time );
		this.sprite.p1.paint( this.context );

		for ( id in $data ) {
			if ( id != this.server.userId ) {
				p2 = id;
			}
		}

		if ( p2 ) {
			if ( !this.sprite.p2 ) {
				this.sprite.p2 = new Sprite;
				this.sprite.p2.left = $data[ p2 ].left;
				this.sprite.p2.top = $data[ p2 ].top;
			}

			setSpriteData( this.sprite.p2, $data[ p2 ] );
			this.sprite.p2.update( $data[ p2 ], $time );
			this.sprite.p2.paint( this.context );
		}
		
		requestId = requestAnimationFrame( $util.fn( this.progress, this ) );
	};

	Server = function( $params ) {
		this.userId = null;
		this.roomNo = $params.roomNo;
		this.socket = null;
		this.command = { REGISTER : 'register', UPDATE : 'update', DATA : 'data' };
	};

	Server.prototype.connect = function( $registerCB, $dataCB ) {
		var self = this;
		this.socket = new WebSocket('ws://' + ( window.location.hostname || 'localhost' ) + ':8080');
		this.socket.addEventListener( 'open', function() { self.register(); } );
		this.socket.addEventListener ( 'message', function( $event ) {
			var result = JSON.parse( $event.data ),
				data = result.data;

			if ( result.code === 0 ) {
				if ( result.status === self.command.REGISTER ) {
					$registerCB.apply( sog, [ data ] );
				} else if ( result.status === self.command.DATA ) {
					$dataCB.apply( sog, [ data, result.time ] );
				}
			} else {
				self.exit();
				alert( data.message );
			}
		} );
		this.socket.addEventListener( 'close' , function( $event ) {
			document.getElementById( 'exit' ).style.display = 'none';
			sog.context.clearRect( 0, 0, sog.context.canvas.width, sog.context.canvas.height );
		} );
	};
	
	Server.prototype.data = function( $time ) {
		this.socket.send( this.command.DATA + '::' + JSON.stringify( { roomNo : this.roomNo, time : $time } ) );
	};
	
	Server.prototype.register = function() {	
		this.socket.send( this.command.REGISTER + '::' + JSON.stringify( { roomNo : this.roomNo } ) );
	};

	Server.prototype.update = function( $data ) {
		this.socket.send( this.command.UPDATE + '::' + JSON.stringify( {
			roomNo : this.roomNo,
			userId : this.userId,
			speedV : $data.speedV,
			speedH : $data.speedH,
			left : sog.sprite.p1.left + $data.speedV,
			top : sog.sprite.p1.top + $data.speedH,
			direction : $data.direction,
			status : $data.status,
			attackStatus : $data.attackStatus || 'none'
		} ) );
	};
	
	Server.prototype.exit = function( $target ) {
		cancelAnimationFrame( requestId );
		requestId = null;
		this.socket.close();
	};
	
	Sprite = function( $painter, $actors ) {
		this.painter = $painter;
		this.actors = $actors || {};
		this.data = null;
		this.left = 0;
		this.top = 0;
	};
	
	Sprite.prototype.paint = function( $context ) {
		this.painter.paint( this, $context );
	};
	
	Sprite.prototype.update = function( $data, $time ) {
		this.data = $data;
		
		for ( var name in this.actors ) {
			this.actors[ name ].execute( this, $data, $time );
		}
	};
	
	Sprite.prototype.advance = function() {
		this.painter.advance();
	};
	
	Painter = function( $image, $active ) {
		this.image = $image;
		this.active = $active;
		this.index = 0;
	};
	
	Painter.prototype.paint = function( $sprite, $context ) {
		var
		i, r, g, b, imageData,
		active = this.active[ this.index ];
		
		$context.drawImage(
			this.image,
			active.left, active.top, active.width, active.height,
			$sprite.left, $sprite.top, this.image.width, this.image.height
		);

		imageData = $context.getImageData(
			$sprite.left + CORRECT_LVALUE,
			$sprite.top + CORRECT_TVALUE,
			this.image.width - CORRECT_LVALUE * 2,
			this.image.height - CORRECT_LVALUE - CORRECT_TVALUE
		);

		if ( $sprite === sog.sprite.p2 ) {
			for ( i = 0; i < imageData.data.length; i += 4 ) {
				r = imageData.data[ i ],
				g = imageData.data[ i + 1 ],
				b = imageData.data[ i + 2 ];

				if ( r === 202 && g === 16 && b === 16 ) {
					imageData.data[ i ] = b;
					imageData.data[ i + 2 ] = r;
				}
			}

			$context.putImageData( imageData, $sprite.left + CORRECT_LVALUE, $sprite.top + CORRECT_TVALUE );
		}

		var target = $sprite === sog.sprite.p1 ? sog.sprite.p2 : sog.sprite.p1;

		if ( target && target.data.attackStatus === 'success' ) {
			for ( i = 3; i < imageData.data.length; i += 4 ) {
				imageData.data[ i ] = imageData.data[ i ] / 2;
			}

			$context.putImageData( imageData, $sprite.left + CORRECT_LVALUE, $sprite.top + CORRECT_TVALUE );
		}
	};
	
	Painter.prototype.advance = function() {
		this.index++;
		
		if ( this.index > this.active.length - 1 ) {
			this.index = 0;
		}
	};
	
	Actors = (function() {
		var move, next;
		
		move = function() {};
		move.prototype.execute = function( $sprite, $data, $time ) {
			$sprite.left = $data.left;
			$sprite.top = $data.top;
		};
		
		next = function() {
			this.interval = 50;
			this.lastTime = 0;
		};
		next.prototype.execute = function( $sprite, $data, $time ) {
			if ( $time - this.lastTime > this.interval ) {
				this.lastTime = $time;
				$sprite.advance();
			}
		};
		
		return {
			move : move,
			next : next
		};
	})();
	
	PainterFactory = {
		UP : 'UP',
		DOWN : 'DOWN',
		LEFT : 'LEFT',
		RIGHT : 'RIGHT',
		ATTACK_UP : 'ATTACK_UP',
		ATTACK_DOWN : 'ATTACK_DOWN',
		ATTACK_LEFT : 'ATTACK_LEFT',
		ATTACK_RIGHT : 'ATTACK_RIGHT',
		create : function( $status ) {
			switch ( $status ) {
			case this.UP:
				return new Painter( moveUp, createActive( 1024, 3 ) );
				break;
			case this.DOWN:
				return new Painter( moveDown, createActive( 1024, 3 ) );
				break;
			case this.LEFT:
				return new Painter( moveLeft, createActive( 1024, 8 ) );
				break;
			case this.RIGHT:
				return new Painter( moveRight, createActive( 1024, 8 ) );
				break;
			case this.ATTACK_UP:
				return new Painter( attackUp, createActive( 512, 6 ) );
				break;
			case this.ATTACK_DOWN:
				return new Painter( attackDown, createActive( 512, 6 ) );
				break;
			case this.ATTACK_LEFT:
				return new Painter( attackLeft, createActive( 512, 6 ) );
				break;
			case this.ATTACK_RIGHT:
				return new Painter( attackRight, createActive( 512, 6 ) );
				break;
			}
		}
	};
	
	initialize = function() {
		var
		exit = document.getElementById( 'exit' ),
		context = document.getElementById( 'canvas' ).getContext( '2d' ),
		keyInfo = {
			'38' : { speedV : 0, speedH : -2, direction : 'UP', status : 'MOVE' },
			'40' : { speedV : 0, speedH : 2, direction : 'DOWN', status : 'MOVE' },
			'37' : { speedV : -2, speedH : 0, direction : 'LEFT', status : 'MOVE' },
			'39' : { speedV : 2, speedH : 0, direction : 'RIGHT', status : 'MOVE' },
			'32' : { speedV : 0, speedH : 0, direction : 'DOWN', status : 'ATTACK' }
		};
		
		exit.addEventListener( 'click', function( $event ) {
			sog.server.exit();
		} );
		
		document.addEventListener( 'keydown', function( $event ) {
			if ( $event.keyCode in keyInfo ) {
				var data = $util.clone( keyInfo[ $event.keyCode ] );
				if ( data.status === 'ATTACK' ) {
					data.direction = sog.sprite.p1.data.direction;
				}
				if ( collision( data ) ) {
					sog.server.update( data );
				}
			}
		}, false );

		document.addEventListener( 'keyup', function( $event ) {
			sog.server.update( { speedV : 0, speedH : 0, direction : sog.sprite.p1.data.direction, status : 'STAY' } );
		}, false );
		
		moveUp.src = 'static/img/moveUp.png';
		moveDown.src = 'static/img/moveDown.png';
		moveLeft.src = 'static/img/moveLeft.png';
		moveRight.src = 'static/img/moveRight.png';
		attackUp.src = 'static/img/attackUp.png';
		attackDown.src = 'static/img/attackDown.png';
		attackLeft.src = 'static/img/attackLeft.png';
		attackRight.src = 'static/img/attackRight.png';
		
		$util.syncOnLoad( [ moveUp, moveDown, moveLeft, moveRight, attackUp, attackDown, attackLeft, attackRight ], function() {
			var server = new Server( { roomNo : 'ROOM1' } );
			sog = new Game( { context : context, server : server, sprite : new Sprite( PainterFactory.create( PainterFactory.DOWN ) ) } );
			
			document.removeEventListener( 'DOMContentLoaded', initialize, false );
			sog.start();
		} );
	};
	
	document.addEventListener( 'DOMContentLoaded', initialize, false );
})();
