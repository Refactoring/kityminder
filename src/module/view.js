var ViewDragger = kity.createClass( "ViewDragger", {
    constructor: function ( minder ) {
        this._minder = minder;
        this._enabled = false;
        this._offset = {
            x: 0,
            y: 0
        };
        this._bind();
    },
    isEnabled: function () {
        return this._enabled;
    },
    setEnabled: function ( value ) {
        var paper = this._minder.getPaper();
        paper.setStyle( 'cursor', value ? 'pointer' : 'default' );
        paper.setStyle( 'cursor', value ? '-webkit-grab' : 'default' );
        this._enabled = value;
    },
    move: function ( offset ) {
        this._minder.getRenderContainer().translate( offset.x, offset.y );
    },

    _bind: function () {
        var dragger = this,
            isRootDrag = false,
            lastPosition = null,
            currentPosition = null;

        this._minder.on( 'normal.beforemousedown readonly.beforemousedown', function ( e ) {
            // 点击未选中的根节点临时开启
            if ( e.getTargetNode() == this.getRoot() &&
                ( !this.getRoot().isSelected() || !this.isSingleSelect() ) ) {
                lastPosition = e.getPosition();
                dragger.setEnabled( true );
                isRootDrag = true;
                var me = this;
                setTimeout( function () {
                    me.setStatus( 'hand' );
                }, 1 );
            }
        } )

        .on( 'hand.beforemousedown', function ( e ) {
            // 已经被用户打开拖放模式
            if ( dragger.isEnabled() ) {
                lastPosition = e.getPosition();
                e.stopPropagation();
                e.originEvent.preventDefault();
            }
        } )

        .on( 'hand.beforemousemove', function ( e ) {
            if ( lastPosition ) {
                currentPosition = e.getPosition();

                // 当前偏移加上历史偏移
                var offset = kity.Vector.fromPoints( lastPosition, currentPosition );
                dragger.move( offset );
                e.stopPropagation();
                lastPosition = currentPosition;
            }
        } )

        .on( 'hand.mouseup', function ( e ) {
            lastPosition = null;

            // 临时拖动需要还原状态
            if ( isRootDrag ) {
                dragger.setEnabled( false );
                isRootDrag = false;
                this.rollbackStatus();
            }
        } );
    }
} );

KityMinder.registerModule( 'View', function () {

    var km = this;

    var ToggleHandCommand = kity.createClass( "ToggleHandCommand", {
        base: Command,
        execute: function ( minder ) {

            minder._viewDragger.setEnabled( !minder._viewDragger.isEnabled() );
            if ( minder._viewDragger.isEnabled() ) {
                minder.setStatus( 'hand' );
            } else {
                minder.rollbackStatus();
            }
            this.setContentChanged( false );

        },
        queryState: function ( minder ) {
            return minder._viewDragger.isEnabled() ? 1 : 0;
        },
        enableReadOnly : false
    } );

    var CameraCommand = kity.createClass( "CameraCommand", {
        base: Command,
        execute: function ( km, focusNode ) {
            var viewport = km.getPaper().getViewPort();
            var offset = focusNode.getRenderContainer().getRenderBox( km.getRenderContainer() );
            var dx = viewport.center.x - offset.x - offset.width / 2,
                dy = viewport.center.y - offset.y;
            km.getRenderContainer().fxTranslate( dx, dy, 1000, "easeOutQuint" );
            this.setContentChanged( false );
        },
        enableReadOnly : false
    } );

    return {
        init: function () {
            this._viewDragger = new ViewDragger( this );
        },
        commands: {
            'hand': ToggleHandCommand,
            'camera': CameraCommand
        },
        events: {
            keyup: function ( e ) {
                if ( e.originEvent.keyCode == keymap.Spacebar && this.getSelectedNodes().length === 0 ) {
                    this.execCommand( 'hand' );
                    e.preventDefault();
                }
            },
            mousewheel: function ( e ) {
                var dx, dy;
                e = e.originEvent;
                if ( e.ctrlKey || e.shiftKey ) return;

                if ( 'wheelDeltaX' in e ) {

                    dx = e.wheelDeltaX || 0;
                    dy = e.wheelDeltaY || 0;

                } else {

                    dx = 0;
                    dy = e.wheelDelta;

                }

                this._viewDragger.move( {
                    x: dx / 2.5,
                    y: dy / 2.5
                } );

                e.preventDefault();
            },
            'normal.dblclick readonly.dblclick': function ( e ) {
                if ( e.getTargetNode() ) return;
                this.execCommand( 'camera', this.getRoot() );
            }
        }
    };
} );