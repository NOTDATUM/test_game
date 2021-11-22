var $util = ( function() {
	'use strict';

	var
	_queue = [],
	_httpRequest = new XMLHttpRequest;

	return {
		element : function( $id ) {
			return document.getElementById( $id );
		},

		style : function( $element, $styles ) {
			if ( $styles ) { // setter
				for ( var attribute in $styles )
					$element.style[ attribute ] = $styles[ attribute ];
			} else { // getter
				if ( window.getComputedStyle )
					return $element.ownerDocument.defaultView.getComputedStyle( $element, null );
				else
					return $element.currentStyle;
			}
		},

		number : function( $str ) {
			return $str.replace ? Number( $str.replace( /[^0-9|.]/g, "" ) ) : "";
		},

		fn : function( $fn, $context, $parameters ) {
			$parameters = $parameters || [];
			
			return function( $addParams ) {
				$fn.apply( $context, $addParams ? $parameters.concat( $addParams ) : $parameters );
			};
		},

		ajax : function( $url, $method, $parameters, $callback, $async ) {
			var
			httpRequest = $async === undefined ? new XMLHttpRequest : ( $async ? new XMLHttpRequest : _httpRequest ),
			callback = function() {
				if ( httpRequest.readyState == 4 ) {
					var result = JSON.parse( httpRequest.responseText );

					if ( httpRequest.status == 200 ) {
						if ( $callback ) $callback( result );
					} else {
						alert( result.message + '[' + result.code + ']' );
					}
				}
			};

			if ( $parameters ) {
				$parameters = encodeURIComponent( JSON.stringify( $parameters ) );
				if ( $method === "GET" ) $url += "?parameters=" + $parameters;
			}

			httpRequest.open( $method, $url, $async === undefined ? true : $async );
			httpRequest.setRequestHeader( 'Content-Type', 'application/json' );
			httpRequest.onreadystatechange = callback;
			httpRequest.send( $parameters && $method === "POST" ? $parameters : null );
		},

		clientSize : function() {
			return {
				'width'  : document.documentElement.clientWidth,
				'height' : document.documentElement.clientHeight
			};
		},

		hash : function( $value ) {
			if ( $value ) {
				location.hash = '#' + $value;
				location.hash = '';
				return;
			}

			return location.hash;
		},
		
		syncOnLoad : function( images, callback ) {
			var i, interval;
			
			interval =
				setInterval( function() {
					for ( i = 0; i < images.length; i++ ) {
						if ( !images[ i ].complete ) {
							return;
						}
					}
					
					clearInterval( interval );
					callback();
				}, 60 );
		},

		syncQueue : function( $url, $method, $parameters, $callback ) {
			_queue.push( this.fn( this.ajax, null, [ $url, $method, $parameters,
				function() {
					$callback && $callback();
					_queue.splice( 0, 1 );
					_queue[ 0 ] && _queue[ 0 ]();
				}
			, true ] ) );

			if ( _queue.length === 1 ) {
				_queue[ 0 ]();
			}
		},

		fireEvent : function( $target, $eventName ) {
			var event = document.createEvent( 'HTMLEvents' );
			event.initEvent( $eventName, true, false );
			if ( $target.dispatchEvent ) {
				$target.dispatchEvent( event );
			}
		},

		clone : function( $target ) {
			return JSON.parse( JSON.stringify( $target ) );
		}
	};
} )();
