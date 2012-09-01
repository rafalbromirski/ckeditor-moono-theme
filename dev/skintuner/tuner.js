(function() {
	CKEDITOR.replaceClass = false;
	CKEDITOR.disableAutoInline = true;

	var uiColor = window.location.href.match( /uicolor=([^&]+)/ );
	uiColor = uiColor ? decodeURIComponent( uiColor[ 1 ] ) : '';
	CKEDITOR.config.uiColor = uiColor;
	CKEDITOR.config.height = 80;

	var doc = CKEDITOR.document, win = doc.getWindow();
	doc.write( '<script src="jscolor/jscolor.js"></script>' );

	window.$ = CKEDITOR.tools.extend( {},
		{
			themed: function( target, config ) {

				target = CKEDITOR.dom.element.get( target );

				config.on = {
					instanceReady: function() {
						editor.execCommand( 'bold' );
						editor.execCommand( 'italic' );
						setTimeout( function() {
							var clone = editor.container.clone( true );
							editor.destroy();
							editor = null;

							target.append( clone );

						}, 0 );
					}
				};

				var editor = CKEDITOR.appendTo( target, config );
			},

			inline: function( target, config ) {

				target = CKEDITOR.dom.element.get( target );

				config.on = {
					instanceReady: function() {
						editor.execCommand( 'bold' );
						editor.execCommand( 'italic' );
						setTimeout( function() {
							editor.focus();
							var clone = doc.getById( 'cke_' + editor.name ).clone( true );

							// Stop the space floating.
							clone.removeStyle( 'position' );

							editor.destroy();
							editor = null;
							el.remove();
							target.append( clone );

						}, 0 );
					}
				};

				var el = CKEDITOR.dom.element.createFromHtml( '<div contenteditable="true"></div>' );
				target.append( el );
				var editor = CKEDITOR.inline( el, config );
			},

			dialog: function( target, dialogName, tabName, config ) {

				// Make tab name optional.
				if ( typeof tabName == 'object' )
					config = tabName, tabName = null;

				target = CKEDITOR.dom.element.get( target );

				config.on = {
					instanceReady: function() {
						editor.once( 'dialogShow', function( evt ) {

							var dialog = evt.data;
							tabName && dialog.selectPage( tabName );
							var clone = dialog._.element.clone( true );
							// Stop centralization.
							clone.getFirst().setStyles( {
								left: 0,
								top: 0,
								right: 0,
								'z-index': 1,
								position: 'relative'
							} );
							target.append( clone );
							dialog.hide();
							setTimeout( function() {
								editor.destroy();
							}, 0 );
						} );
						editor.execCommand( dialogName );
					}
				};

				var editor = CKEDITOR.appendTo( target, config );
			},

			menu: function( target, items, config ) {

				if ( checkBusy( arguments ) )
					return;

				// Make tab name optional.
				if ( typeof items == 'object' )
					config = items, items = null;
				else
					items = items.split( ',' );

				target = CKEDITOR.dom.element.get( target );

				config.on = {
					instanceReady: function() {
						editor.once( 'panelShow', function( evt ) {
							var panel = evt.data;
							target.append( clonePanel( panel ) )

							panel.hide();
							editor.destroy();
						} );

						var menu = editor.contextMenu;

						// Overwrite with requested items.
						if ( items )
							menu._.onShow = function() {
								menu.removeAll();
								menu._.listeners = [];
								for ( var i = 0 ; i < items.length ; i++ ) {

									var item = items[ i ], state = CKEDITOR.TRISTATE_OFF;

									// Resolve item state.
									item = item.replace( /\((.*?)\)/, function( match, s ) {
										state = s == 'disabled' ? CKEDITOR.TRISTATE_DISABLED :
										        s == 'on' ? CKEDITOR.TRISTATE_ON :
										        CKEDITOR.TRISTATE_OFF;
										return '';
									} );

									item = editor.getMenuItem( item );
									item.state = state;
									menu.add( item );
								}
							};

						menu.open( target, null, 0, 0 );
					}
				};

				var editor = CKEDITOR.appendTo( target, config );
			},

			combo: function( target, comboName, value, config ) {

				if ( checkBusy( arguments ) )
					return;

				// Receive optional value.
				if ( typeof value == 'object' )
					config = value, value = null;

				target = CKEDITOR.dom.element.get( target );

				config.on = {
					instanceReady: function() {
						editor.once( 'panelShow', function( evt ) {

							value && combo.mark( value );
							var panel = evt.data;
							target.append( clonePanel( panel ) )

							panel.hide();
							editor.destroy();
						} );

						var combo = editor.ui.get( comboName );
						combo.open( editor, target );
					}
				};

				var editor = CKEDITOR.appendTo( target, config );
			}
		} );

	function clonePanel( panel ) {

		var doc = panel.element.getFirst().getFrameDocument();
		// element::clone doesn't handle iframe content,
		// extract the iframe content manually.
		var panelHtml = dumpPage( doc );
		var el = panel.element.clone( 1 );
		el.setStyles( {
			position: 'static',
			display: 'block',
			opacity: 1
		} );

		// Emulate the structure by compensating the <body> element.
		var wrapper = doc.createElement( 'div' );
		doc.getBody().copyAttributes( wrapper );
		var panelFrame = el.getFirst();
		panelFrame.remove();
		wrapper.setHtml( panelHtml );
		wrapper.appendTo( el );
		return el;
	}

	function checkBusy( args ) {
		var count = 0, ins = CKEDITOR.instances;
		for ( var name in ins )
			count++;

		if ( count ) {
			var fn = args.callee;
			setTimeout( function() {
				fn.apply( null, args );
			}, 100 );
		}
		return !!count;
	}

	var awaiting = 0;

	function stat( org ) {

		return function() {
			if ( !awaiting )
				toggleLoading();
			awaiting++;
			return org.apply( this, arguments );
		};
	}

	CKEDITOR.on( 'instanceDestroyed', function() {
		if ( !--awaiting )
			setTimeout( loadViewer, 200 );
	} );

	win.on( 'load', function() {
		setTimeout( function() {
			if ( !awaiting )
					toggleLoading( 'No skin part request found on the page, aborted...');
		}, 0 );
	});


	function toggleLoading( msg ) {
		var body = doc.getBody(),
			loader = doc.getById( 'mask' );

		if ( loader ) {
			loader.remove();
		}
		else {
			body.append( CKEDITOR.dom.element.createFromHtml(
				'<div id="mask">' +
				'<div id="loading">' + ( msg || 'Building skin parts...' ) + '</div>' +
				'</div>'
			) );
		}
	}

	function createViewer( html ) {

		function createToolbar() {

			function checkRefresh() {
				var newColor = picker.getValue();
				// Reload if ui color changed.
				if ( newColor != uiColor ) {
					location.search = 'uicolor=' + encodeURIComponent( newColor );
				}
				else
					loadViewer();
			}

			function chooseColor( evt ) {
				var target = evt.data.getTarget();
				if ( target.is( 'a' ) )
				{
					var color = target.getStyle( 'background-color' );
					color = CKEDITOR.tools.convertRgbToHex( color )
					picker.setValue( color );
					checkRefresh();
				}
			}

			function setupAccessKeys( el ) {
				el.on( 'keydown', function( evt ) {
					evt = evt.data;
					var key = evt.getKeystroke(), target = evt.getTarget(), handled = 0;
					if ( !target.equals( picker ) ) {

						// Refresh: defer to avoid silent failure on viewer frame.
						if ( key == 82 )
							setTimeout( checkRefresh, 0 ), handled = 1;
						else
							if ( key == 67 )
								picker.focus(), handled = 1;

						handled && evt.preventDefault();
					}
				} );
			}

			var toolbar = CKEDITOR.dom.element.createFromHtml(
				'<div class="toolbar">' +
					'<div id="intro" class="toolbox"><h1><strong>SkinTuner</strong> - all editor skin parts in one place</h1></div>' +
					'<div class="toolbox"><label for="reload">Fast Reload (r)</label><a id="reload" title="Reload skin-only files."></a></div>' +
					'<div class="divider"></div>' +
					'<div class="toolbox"><label for="colorpicker">UI Color: (c)</label>' +
							'<input id="colorpicker" title="Quick access to the Chameleon feature." value="' + uiColor + '" />' +
							'<div id="color-options">' +
							'<a class="color" href="javascript:void(0)" title="Default"></a>' +
							'<a class="color" href="javascript:void(0)" style="background:#99F299" title="Green"></a>' +
							'<a class="color" href="javascript:void(0)" style="background:#FFCD69" title="Orange"></a>' +
						'</div>' +
					'</div>' +
				'</div>'
			);
			body.append( toolbar );
			var picker = doc.getById( 'colorpicker' );
			jscolor.color( picker.$, { hash: true, caps: true, required: false } );
			doc.getById( 'color-options' ).on( 'click', chooseColor );
			doc.getById( 'reload' ).on( 'click', checkRefresh );

			setupAccessKeys( body );
			setupAccessKeys( viewer.getBody() );
		}

		var body = doc.getBody();
		// Empty old page contents.
		body.setHtml( '' );

		var viewer = doc.getById( 'viewer' );
		viewer && viewer.remove();
		viewer = CKEDITOR.dom.element.createFromHtml( '<div id="viewer"><iframe src="javascript:void(0)" frameborder="0"></iframe></div>' );
		doc.getBody().append( viewer );
		viewer = viewer.getFirst().getFrameDocument();
		viewer.write( html );

		viewer.getDocumentElement().setStyle( 'overflow-y', 'auto' );
		viewer.getBody().setStyle( 'overflow-y', 'auto' );

		createToolbar();
	}

	// Saved page html with all ui parts created.
	var pageHtml;

	function loadViewer() {

		toggleLoading();

		!pageHtml && ( pageHtml = dumpPage( doc ) );

		createViewer( pageHtml );
	}

	// Dump full page HTML:
	// 1. dynamic <style> content preserved.
	// 2. all <script>  content removed.
	function dumpPage( doc ) {

		var html = doc.equals( CKEDITOR.document ) ?
		           doc.getDocumentElement().getOuterHtml() :
		           doc.getBody().getHtml();

		if ( !CKEDITOR.env.gecko )
			html = html.replace( /(?=<\/head>)/, function() {
				var extra = doc.getById( 'cke_ui_color' );

				if ( extra ) {
					var css = '';
					if ( CKEDITOR.env.ie )
						css = extra.$.styleSheet.cssText;
					else {
						var rules = extra.$.sheet.cssRules;
						for ( var i = 0 ; i < rules.length ; i++ ) {
							css += rules[ i ].cssText;
						}
					}
				}

				return css ? '<style>' + css + '</style>' : '';
			} );
		// Trimmed scripts.
		return stripScripts( html );
	}

	function stripScripts( html ) {
		return html.replace( /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			'' );
	}

	for ( var i in $ )
		$[ i ] = CKEDITOR.tools.override( $[ i ], stat );

})();


