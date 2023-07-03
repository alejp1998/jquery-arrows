(function ($) {
  /**
   * jQuery Arrows Plugin
   * This plugin provides functionality to create and manage arrow connections between HTML elements.
   */

  
  // Unique arrow number (in case id is not specified)
  var n = 0;
  
  /**
   * arrows(options)
   * Initializes the arrows plugin on the selected elements.
   * @param {Object} options - Options for the arrows plugin.
   * @returns {jQuery} The jQuery object.
   */
  $.fn.arrows = function (options) {
    if (options === "update") {
      return processArrows(update, this);
    } else if (options === "remove") {
      return processArrows(destroy, this);
    } else {
      // Merge the provided options with the default options
      options = $.extend(
        true,
        {
          from: this,
          to: this,
          id: "arrow-" + n++,
          tag: "arrow",
          within: "body",
        },
        options
      );

      // Create arrows between the specified elements
      connect(options);

      return this;
    }
  };

  /**
   * arrows event
   * Custom event for the arrows plugin.
   */
  $.event.special.arrows = {
    teardown: function (namespaces) {
      // Destroy the arrows when the element is being removed
      processArrows(destroy, $(this));
    },
  };

  /**
   * connect(options)
   * Creates arrows between elements based on the provided options.
   * @param {object} options - Options for creating arrows.
   */
  var connect = function (options) {
    var end1 = $(options.from);
    var end2 = $(options.to);
    var tag = options.tag;
    var within = $(options.within);

    // Remove unnecessary options
    delete options.from;
    delete options.to;
    delete options.tag;
    delete options.within;

    $(":root").each(function () {
      var container = within;
      var done = new Array();
      end1.each(function () {
        var node = this;
        done.push(this);
        end2.not(done).each(function () {
          // Create an arrow between two elements
          createArrow(container, [node, this], tag, options);
        });
      });
    });
  };

  /**
   * createArrow(container, nodes, tag, options)
   * Creates an arrow element between two nodes within a container.
   * @param {Element} container - The container element to append the arrow to.
   * @param {Element[]} nodes - An array of two node elements to connect.
   * @param {string} options - Element defined tag.
   * @param {object} options - Additional options for the arrow element.
   */
  var createArrow = function (container, nodes, tag, options) {
    // Create the arrow canvas element and append to it to the container
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" id="${options.id}-svg" class="svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>`;
    const arrow = $("<"+ tag + ">", options).html(svgString);
    container.append(arrow);

    // Create arrow's associated data
    var data = {
      id: options.id,
      class: options.class,
      name: options.name,
      node_from: $(nodes[0]),
      node_to: $(nodes[1]),
      nodes_dom: nodes
    };

    // Store the arrow data using jQuery's data() method
    $.data(arrow.get(0), "arrow", data);
    $.data(arrow.get(0), "arrows", [arrow.get(0)]);

    // Update the arrows for the nodes
    for (var i = 0; i < 2; i++) {
      var arrows = arrow.add($.data(nodes[i], "arrows")).get();
      $.data(nodes[i], "arrows", arrows);

      // Trigger the "arrows.arrows" event on the nodes
      if (arrows.length == 1) {
        $(nodes[i]).on("arrows.arrows", false);
      }
    }

    update(arrow.get(0));
  };

  /**
   * destroy(arrow)
   * Destroys an arrow by removing it from the DOM and updating the arrows for the nodes.
   * @param {Element} connection - The arrow element to destroy.
   */
  var destroy = function (arrow) {
    var nodes = $.data(arrow, "arrow").nodes_dom;
    for (var i = 0; i < 2; i++) {
      var arrows = $($.data(nodes[i], "arrows")).not(arrow).get();
      $.data(nodes[i], "arrows", arrows);
    }
    $(arrow).remove();
  };

  /**
   * getState(data)
   * Retrieves the state of an arrow by comparing the current and cached positions of the connected nodes.
   * @param {object} data - The arrow data object containing node information and cached values.
   * @returns {boolean} - Indicates whether the arrow state has been modified or not.
   */
  var getState = function (data) {
    // Get the bounding rectangles of the connected nodes
    data.rect_from = data.nodes_dom[0].getBoundingClientRect();
    data.rect_to = data.nodes_dom[1].getBoundingClientRect();

    // Cache the current positions and store previous positions in cached variable
    var cached = data.cache;
    data.cache = [
      data.rect_from.top,
      data.rect_from.right,
      data.rect_from.bottom,
      data.rect_from.left,
      data.rect_to.top,
      data.rect_to.right,
      data.rect_to.bottom,
      data.rect_to.left,
    ];

    // Determine if the arrow is hidden based on node positions
    data.hidden =
      0 === (data.cache[0] | data.cache[1] | data.cache[2] | data.cache[3]) ||
      0 === (data.cache[4] | data.cache[5] | data.cache[6] | data.cache[7]);

    // Assume the arrow is unmodified until proven otherwise
    data.unmodified = true;

    // Check if the cached positions exist
    if (cached === undefined) {
      return (data.unmodified = false);
    }

    // Compare the cached positions with the current positions
    for (var i = 0; i < 8; i++) {
      if (cached[i] !== data.cache[i]) {
        return (data.unmodified = false);
      }
    }

    // The arrow state has not been modified
    return data.unmodified;
  };

  // Calculate intersection of line from (x,y) to the center of a rectange defined by (minX,maxX,minY,maxY) with the border of the rectangle
  var pointOnRect = function (x, y, minX, minY, maxX, maxY) {
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const m = (midY - y) / (midX - x);

    if (x <= midX && minY <= m * (minX - x) + y && m * (minX - x) + y <= maxY)
      return { x: minX, y: m * (minX - x) + y };
    if (x >= midX && minY <= m * (maxX - x) + y && m * (maxX - x) + y <= maxY)
      return { x: maxX, y: m * (maxX - x) + y };
    if (y <= midY && minX <= (minY - y) / m + x && (minY - y) / m + x <= maxX)
      return { x: (minY - y) / m + x, y: minY };
    if (y >= midY && minX <= (maxY - y) / m + x && (maxY - y) / m + x <= maxX)
      return { x: (maxY - y) / m + x, y: maxY };
    if (x === midX && y === midY) return { x, y };
  };

  // Modify canvas when updating arrows
  var modifyCanvas = function (id, minX, minY, width, height) {
    var svg = document.getElementById(id + "-svg");
    svg.setAttribute("style", `position: absolute; top: ${minY}px; left: ${minX}px; z-index: -10;`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    return svg;
  };

  // Add triangle markers definition for arrow heads
  var addTriangleMarkerDef = function (svg, id, className) {
    if (svg.querySelector("defs")) return;
    // Add triangle marker definition to SVG
    svg.innerHTML += `
    <defs>
      <marker id="${id}-triangle" class="${className}" viewBox="0 0 10 10" refX="10" refY="5"
        markerUnits="strokeWidth" markerWidth="5" markerHeight="8" orient="auto">
        <path class="svg-line-triangle" d="M 0 0 L 10 5 L 0 10"></path>
      </marker>
    </defs>
  `;
  };

  // Add arrow line path
  var addArrowLine = function (svg, id, x1, y1, x2, y2) {
    // Remove previous arrow path if it exists
    var prevLine = document.getElementById(id + "-svg" + "-line");
    if (prevLine) prevLine.remove();
    // Bezier curve parameters computation
    var path = "M " + x1 + " " + y1 + " C " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + x2 + " " + y2;
    // Add new line to svg
    svg.innerHTML += `<path id="${id}-svg-line" class="svg-line" d="${path}" marker-end="url(#${id}-triangle)"></path>`;
  };
  
  // Add arrow name text
  var addArrowName = function (svg, id, name) {
    if (!name) return;
    // Remove previous name text if it exists
    var prevText = document.getElementById(id + "-svg" + "-text");
    if (prevText) prevText.remove();
    // Add new name text to svg
    svg.innerHTML += `<text id="${id}-svg-text" class="svg-text" dy="15px" text-anchor="middle" font-size="16px">
      <textPath href="#${id}-svg-line" startOffset="50%">${name}</textPath>
    </text>`;
  };

  /*
   */
  var drawArrow = function (id, category, name, x1, y1, x2, y2) {
    // Get arrow SVG canvas
    var svg = document.getElementById(id + "-svg");
    // Add triangle marker def if it doesn't exist already
    addTriangleMarkerDef(svg, id, category);
    // Update line conneciton path
    addArrowLine(svg, id, x1, y1, x2, y2);
    // Update name text path
    addArrowName(svg, id, name);
  };

  /**
   * Updates the appearance of an arrow element based on its data.
   * @param {HTMLElement} connection - The arrow element to update.
   */
  var update = function (arrow) {
    // Retrieve arrow data using jQuery's data() method
    var data = $.data(arrow, "arrow");
    const { id, category, name } = data;

    // Get the state of the data
    getState(data);

    // If the data is unmodified or hidden, return without making any updates
    if (data.unmodified || data.hidden) return;

    // Calculate center coordinates of from and to rectangles
    const from_cx = (data.rect_from.left + data.rect_from.right) / 2;
    const from_cy = (data.rect_from.bottom + data.rect_from.top) / 2;
    const to_cx = (data.rect_to.left + data.rect_to.right) / 2;
    const to_cy = (data.rect_to.bottom + data.rect_to.top) / 2;

    // Modify size of svg canvas depending on location of from and to rectangles
    // Increase width and height to prevent singularities when from and to rectangles are aligned in one of the axis
    const PADDING = 20;
    const minX = Math.min(from_cx, to_cx) - PADDING;
    const minY = Math.min(from_cy, to_cy) - PADDING;
    const width = Math.abs(from_cx - to_cx) + PADDING * 2;
    const height = Math.abs(from_cy - to_cy) + PADDING * 2;
    modifyCanvas(id, minX, minY, width, height);

    // Compute intersections with the from and to rectangles
    const to_int = pointOnRect(
      from_cx,
      from_cy,
      data.rect_to.left,
      data.rect_to.top,
      data.rect_to.right,
      data.rect_to.bottom
    );
    const from_int = pointOnRect(
      to_cx,
      to_cy,
      data.rect_from.left,
      data.rect_from.top,
      data.rect_from.right,
      data.rect_from.bottom
    );

    // Draw the line connecting the intersections
    drawArrow(id, category, name, from_int.x - minX, from_int.y - minY, to_int.x - minX, to_int.y - minY);
  };

  /**
   * Process arrows by applying a given method to each arrow element.
   * @param {function} method - The method to be applied to each arrow element.
   * @param {jQuery} elements - The jQuery collection of elements containing arrows.
   * @returns {jQuery} - The modified jQuery collection of elements.
   */
  var processArrows = function (method, elements) {
    return elements.each(function () {
      // Retrieve the arrows associated with the current element
      var arrows = $.data(this, "arrows");

      // Check if arrows exist and apply the method to each arrow
      if (arrows instanceof Array) {
        for (var i = 0, len = arrows.length; i < len; i++) {
          method(arrows[i]);
        }
      }
    });
  };
})(jQuery);
