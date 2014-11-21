angular.module('galleryManagerApp', [])

.controller('galleryAdminCtrl', function ($scope) {
  $scope.openThumbEditor = function(image) {
    $scope.$broadcast( "editThumb", image );
  }
} )

.controller('thumbEditCtrl', function ($scope, $document, $rootScope) {
  // Note: crop values are percentages (%)

  // Initial state
  // $('#thumbEditor').hide();
  $scope.image = {
    'ID'	 : null,
    'path' : "",
    'crop' : {
      'left' 		: "0",
      'top' 		: "0",
      'width' 	: "100",
      'height' 	: "100"
    }
  };

  // Set values when dialog called
  $scope.$on( "editThumb", function ( event, image ) {
    if( image.crop ) {
      for( var i in $scope.image.crop ) {
        $scope.image.crop[i] = image.crop[i] || "0";
      }
    } else {
      $scope.image.crop = {
        'left' 		: "0",
        'top' 		: "0",
        'width' 	: "100",
        'height' 	: "100"
      }
    }
    $scope.image.ID 	= image.ID;
    $scope.image.path = image.fileName;
    $scope.showEditor();
  } );

  // Show the editor
  $scope.showEditor = function() {
    $('#thumbEditor').show();
    $('#adminOverlay').fadeIn();
  }

  // Hide the editor
  $scope.hideEditor = function() {
    $("#adminOverlay").fadeOut( { "complete": function() {
      // Hide editor when overlay is hidden
      $('#thumbEditor').hide();
      $scope.$apply( function() {
        /* Reset ng-src and src (doesn't change with blank ng-src)
            so that .load even will still fire if same image is used immediately after
        */
        $scope.image.path = "";
        $image.attr('src', '');
      } );
    } } );
  }

  // Save the edit by sending an event with the data
  $scope.saveEdit = function() {
    $rootScope.$emit( 'saveCropData', { ID: $scope.image.ID, data: angular.copy( $scope.image.crop ) } );
    $scope.hideEditor();
  }

  $scope.cancelEdit = function() {
    $scope.hideEditor();
  }

  /* Configurable values */
  var forced_ratio = 0; // disable
  var forced_ratio = 1.0; // w/h

  // Minimum selection size in pixels ( ideally minimum 1:1 thumbnail size to avoid stretching )
  var min_crop_width = 100;
  var min_crop_height = min_crop_width * (forced_ratio || 1); // Prevent divide by zero if forced_ratio is off

  /* Working Values (non-configurable) */
  var tmp_vars = {};

  var crop = {
    'top'	: 0,
    'left'	: 0,
    'width'	: 0,
    'height': 0
  };
  var crop_percent = {
    'top'	: 0,
    'left'	: 0,
    'width'	: 0,
    'height': 0
  };
  var start_x, start_y,
      origin_data = {},
      resizing		= {
        'right' 	: false,
        'bottom' 	: false,
        'left'		: false,
        'top'			: false
      },
      moving			= false;

  var x_axis = {
    size : 'width',
    pos	: 'left'
  };
  var y_axis = {
    size : 'height',
    pos	: 'top'
  }
  var $image = $( '#thumbEditor .crop_image' );

  $image.load( function() {
    // Invoke some calls to ensure proper setup
    get_origin_data();
    moving = true;
    update_crop( 0, 0 );
    moving = false;
    resizing.right = true;
    update_crop( 0, 0 );
    resizing.right = false;
  } );


  function get_origin_data() {
    origin_data = {
      'left' 		: 1*$scope.image.crop.left,
      'top' 		: 1*$scope.image.crop.top,
      'width'		: 1*$scope.image.crop.width,
      'height'	: 1*$scope.image.crop.height
    };
    // Convert to pixels
    origin_data = _px( origin_data );
  }

  function mousedown(event) {
    // Changes to $scope don't affect it, implying a child scope

    // Prevent default dragging of selected content
    event.preventDefault();

    // Get initial data before manipulation
    start_x = event.pageX;
    start_y = event.pageY;
    get_origin_data();

    // Reset some values
    moving = false;
    resizing = {
      'right' 	: false,
      'bottom' 	: false,
      'left'		: false,
      'top'			: false
    };

    // Determine which part was clicked
    $target = $( event.target );
    // If clicked on handle icon, pretend it's the parent handle
    if( $target.hasClass( 'handle_icon' ) ) {
      $target = $target.parent();
    }

    if( $target.hasClass( 'crop_area' ) ) {
      // Clicked inside crop area, Start move operation
      moving = true;

    } else if( $target.hasClass( 'crop_handle' ) ) {
      // Clicked on a handle, Start resize operation
      if( $target.hasClass( 'p_left' ) ) {
        resizing.left = true;
      }

      if( $target.hasClass( 'p_right' ) ) {
        resizing.right = true;
      }

      if( $target.hasClass( 'p_top' ) ) {
        resizing.top = true;
      }

      if( $target.hasClass( 'p_bottom' ) ) {
        resizing.bottom = true;
      }
    }

    // Turn on additional event listeners
    $document.on('mousemove', mousemove);
    $document.on('mouseup', mouseup);
  }

  function mousemove(event) {
    // Calculate changes relative to origin
    var dx = event.pageX - start_x;
    var dy = event.pageY - start_y;

    var new_data = update_crop( dx, dy );


  }

  function update_crop( dx, dy ) {
    // Prepare some vars
    var new_data = {};

    // Apply delta changes
    if( moving ) {
      /* Apply delta values */

      var new_values = {
        left	: origin_data.left + dx,
        top		: origin_data.top + dy
      };

      var constraints = {
        left 	: { min: 0, max: image_size( 'width' ) - origin_data.width },
        top 	: { min: 0, max: image_size( 'height' ) - origin_data.height }
      };

      new_data = constrain( origin_data, new_values, constraints );

    } else if( resizing ) {
      if( resizing.right || resizing.bottom ) {
        // Change value

        var constraints = {
          width 	: { min: min_crop_width, max: image_size( 'width' ) - origin_data.left },
          height 	: { min: min_crop_height, max: image_size( 'height' ) - origin_data.top }
        };

        var new_values = {
          width	: origin_data.width + dx,
          height: origin_data.height + dy
        };

        if( forced_ratio ) {
          // Change complementary axis to maintain proportions
          if( resizing.right ) {
            new_values.height = new_values.width / forced_ratio;
          } else {
            new_values.width = new_values.height * forced_ratio;
          }
        } else {
          // Not constrained to ratio, so don't affect sides not actively resizing
          if( ! resizing.right ) {
            delete new_values.width;
          }
          if( ! resizing.bottom ) {
            delete new_values.height;
          }
        }

        // Apply constraints to new values to keep within canvas bounds
        new_data = constrain( origin_data, new_values, constraints );

      }
      else if( resizing.left || resizing.top ) {
        // Change values

        var constraints = {
          width 	: { min: min_crop_width, max: origin_data.width + origin_data.left },
          height 	: { min: min_crop_height, max: origin_data.height + origin_data.top }
        };

        var new_values = {
          width	: origin_data.width - dx,
          height: origin_data.height - dy
        };

        if( forced_ratio ) {
          // Change complementary axis to maintain proportions
          if( resizing.left ) {
            new_values.height = new_values.width / forced_ratio;
          } else {
            new_values.width = new_values.height * forced_ratio;
          }
        } else {
          // Not constrained to ratio, so don't affect sides not actively resizing
          if( ! resizing.left ) {
            delete new_values.width;
          }
          if( ! resizing.top ) {
            delete new_values.height;
          }
        }

        // Apply constraints to new values to keep within canvas bounds
        new_data = constrain( origin_data, new_values, constraints );
        // Offset position to effectively anchor in lower right corner
        new_data.left -= (new_data.width - origin_data.width );
        new_data.top -= (new_data.height - origin_data.height );
      }

      // Special cases
      // Pin bottom-left corner when resizing top-right in forced-ratio mode
      if( forced_ratio && resizing.top && resizing.right ) {
        new_data.top -= (new_data.height - origin_data.height);
      }
      // Pin top-right corner when resizing bottom-left in forced-ratio mode
      else if( forced_ratio && resizing.bottom && resizing.left ) {
        new_data.left -= (new_data.width - origin_data.width);
      }

    }

    // Send percents back to AngularJS scope
    $scope.$apply(function() {
      $scope.image.crop = _pc( new_data );
    });

    return new_data;

  } /* update_crop() */

  //** Logistical functions **//
  function constrain( source, target, constraint ) {
    var value;
    if( typeof source == "object" && typeof target == "object" ) {
      // Expect all to be objects
      value = angular.copy( source );
      var snap = [];
      for( var i in target ) {
        value[i] = Math.min( Math.max( target[i], constraint[i].min ), constraint[i].max );
        // Enforce ratio if enabled
        if( forced_ratio && value[i] == constraint[i].max ) {
          if( i == "width" ) {
            // value["height"] = value[i] * forced_ratio;
            snap.push( { key: "height", value: value[i] / forced_ratio } );
          }
          else if( i == "height" ) {
            // value["width"] = value[i] / forced_ratio;
            snap.push( { key: "width", value: value[i] * forced_ratio } );
          }
        }
      }

      // Check if we have snaps
      if( snap.length > 0 ) {
        /* Calculate which of the constraints hit last (minimum overflow)
            This method is to prevent the secondary axis from taking priority and
            expanding the primary axis off the canvas to main proportions
        */
        var min = {};
        var overflow;
        for( var i in snap ) {
          overflow = target[snap[i].key] - constraint[snap[i].key].max;
          if( ! min.overflow || overflow <= min.overflow ) {
            min.key = snap[i].key;
            min.value = snap[i].value;
            min.overflow = overflow;
          }
        }
        // And override it with the snap value to keep it in proportion
        value[min.key] = min.value;
      }
    } else {
       value = Math.min( Math.max( target, constraint.min ), constraint.max );
    }
    return value;
  }

  //** Conversion functions **//

  function _px( percent, dim ) {
    if( typeof percent == "object" ) {
      var pixels = {};
      for( var i in percent ) {
        pixels[i] = _px( percent[i], i );
      }
      return pixels;
    } else {
      if( 'left' == dim )	dim = 'width';
      else if( 'top' == dim ) dim = 'height';
      return Math.ceil( ( percent / 100 ) * image_size(dim) ) / 1;
    }
  }

  function _pc( pixels, dim ) {
    if( typeof pixels == "object" ) {
      var percent = {};
      for( var i in pixels ) {
        percent[i] = _pc( pixels[i], i );
      }
      return percent;
    } else {
      if( 'left' == dim )	dim = 'width';
      else if( 'top' == dim ) dim = 'height';
      return Math.floor( ( pixels / image_size(dim) ) * 100 * 10 ) / 10;
    }
  }

  function set_crop_pixels( input ) {
    if( input ) {
      for( var i in input ) {
        // Set new pixel values
        crop[i] = input[i];
      }

      // Propagate to percents
      for( var i in crop ) {
        // Convert from internal pixel values
        crop_percent[i] = _pc( crop[i], i );
      }


    } else {
      crop = _px( crop_percent );
      // for( var i in crop_percent ) {
      // 	// Convert from internal percent values
      // 	crop[i] = _px( crop_percent[i], i );
      // }
    }
  }

  //** **//

  function image_size( dim ) {
    if( dim == "width" ) {
      return $image.width();
    } else if( dim == "height" ) {
      return $image.height();
    }
  }

  function mouseup(event) {
    // Turn off unnecessary event listeners
    $document.off('mousemove', mousemove);
    $document.off('mouseup', mouseup);
  }

  $('#thumbEditor .crop_area').on('mousedown', mousedown );

  $scope.$broadcast( "editThumb", "http://placehold.it/450x550" );
} );
