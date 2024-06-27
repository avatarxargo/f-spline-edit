
var points = [];
var point_colors = [ "#facb5f","#77bfc7","#9f59c2","#599f52" ];
var graph;
var graphDOM;
var fieldArea

var dataArea = { x: {min: -10, max: 10 },
                 y: {min: -10, max: 10 },
                 z: {min: -10, max: 10 },
                 w: {min: -10, max: 10 }};
var displayArea = { x: {min: 0, max: 800 },
                    y: {min: 0, max: 800 },
                    z: {min: 0, max: 800 },
                    w: {min: 0, max: 800 }};

$( document ).ready(function() {
	graph = $("#graph");
  graphDOM = graph.get(0);
  fieldArea = $("#field-area");

  for (var i = 0; i < 3; ++i)
    addPoint();
  console.log(points);

  $( window ).on( "resize", function() { points.forEach(refreshPointHandle); paintGraph(); } );
  $( "#x-dimensions input" ).on('input', function(){ resizeDataArea(); paintGraph(); });
  $( "#y-dimensions input" ).on('input', function(){ resizeDataArea(); paintGraph(); });

  $("#button-add").click( function() { addPoint(); paintGraph(); });
  $("#import").click( function() { importString(); paintGraph(); });
  $("#export").click( function() { exportString(); });

  resizeDataArea();
	paintGraph();
});

function addPointControl()
{
  var newPanel = $( '<div class="panel narrow-field"> <p><a class="button micro-button">X</a> point <label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"><label>y:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p> <p>tangent <label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"><label>y:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p></div>');
  var pointx = newPanel.find( "input" ).eq(0);
  var pointy = newPanel.find( "input" ).eq(1);
  var tangentx = newPanel.find( "input" ).eq(2);
  var tangenty = newPanel.find( "input" ).eq(3);
  var removeButton = newPanel.find( "a" ).eq(0);
  fieldArea.append(newPanel);
  return { panel: newPanel, remove: removeButton, point: { x: pointx, y: pointy }, tangent: { x: tangentx, y: tangenty } };
}

function addPoint()
{
  var pointHandle = $( '<div class="ctrl-point"></div>' ).first();
  var tangentHandle = $( '<div class="ctrl-point"></div>' ).first();
  $("#graph-area").append( pointHandle );
  $("#graph-area").append( tangentHandle );
  var controls = addPointControl();
  var entry = { index: points.length,
                point: { x: points.length, y: 0, z: 0, w: 0 },
                tangent: { x: 1, y: -1, z: 1, w: 1 },
                point_handle: pointHandle,
                tangent_handle: tangentHandle,
                controls: controls }
  points.push(entry);
	dragElement(entry);
  controls.point.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.point.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.remove.click(function() { removePoint(entry.index); paintGraph(); });

  controls.point.x.val(entry.point.x);
  controls.point.y.val(entry.point.y);
  controls.tangent.x.val(entry.tangent.x);
  controls.tangent.y.val(entry.tangent.y);

  refreshPointEntry(entry, true)
  return entry;
}

function removePoint(index)
{
  if (index > points.length)
    return;
  points[index].controls.panel.remove();
  points[index].point_handle.remove();
  points[index].tangent_handle.remove();
  points.splice(index, 1);
  for (var i = 0; i < points.length; ++i)
    points[i].index = i;
}

function clearPoints()
{
  for (var i = points.length; i > 0; --i)
    removePoint(0);
}

function resizeDataArea()
{
  dataArea.x.min = parseFloat($( "#x-dimensions input" ).eq(0).val());
  dataArea.x.max = parseFloat($( "#x-dimensions input" ).eq(1).val());
  dataArea.y.min = parseFloat($( "#y-dimensions input" ).eq(0).val());
  dataArea.y.max = parseFloat($( "#y-dimensions input" ).eq(1).val());
  points.forEach(refreshPointHandle);
}

function refreshPointEntry(entry, dataOnly = false)
{
  if (!dataOnly)
  {
    var point = { x: entry.point_handle.offset().left + entry.point_handle.width()/2 - graph.offset().left,
                  y: entry.point_handle.offset().top + entry.point_handle.height()/2 - graph.offset().top };
    var tangent = { x: entry.tangent_handle.offset().left + entry.tangent_handle.width()/2 - graph.offset().left,
                    y: entry.tangent_handle.offset().top + entry.tangent_handle.height()/2 - graph.offset().top };

    entry.point = displayToData(point);
    entry.tangent = displayToData(tangent);

    entry.tangent.x = entry.tangent.x - entry.point.x;
    entry.tangent.y = entry.tangent.y - entry.point.y;
  }

  entry.controls.point.x.val( roundDecimals(entry.point.x, 2) );
  entry.controls.point.y.val( roundDecimals(entry.point.y, 2) );
  entry.controls.tangent.x.val( roundDecimals(entry.tangent.x, 2) );
  entry.controls.tangent.y.val( roundDecimals(entry.tangent.y, 2) );
  refreshPointHandle(entry); // propagate rounding back to the handle
}

function refreshPointHandle(entry)
{
  entry.point = { x: parseFloat(entry.controls.point.x.val()),
                  y: parseFloat(entry.controls.point.y.val()) };
  entry.tangent = { x: parseFloat(entry.controls.tangent.x.val()),
                    y: parseFloat(entry.controls.tangent.y.val()) };

  var tangent = { x: entry.point.x + entry.tangent.x, y: entry.point.y + entry.tangent.y };
  var point = dataToDisplay(entry.point);
  tangent = dataToDisplay(tangent);

  entry.point_handle.css({left: graph.offset().left - entry.point_handle.width()/2 + point.x,
                          top: graph.offset().top - entry.point_handle.height()/2 + point.y,
                          position:'absolute'});

  entry.tangent_handle.css({left: graph.offset().left - entry.tangent_handle.width()/2 + tangent.x,
                            top: graph.offset().top - entry.tangent_handle.height()/2 + tangent.y,
                            position:'absolute'});
}

function dataToDisplay(position)
{
  var x = ((position.x - dataArea.x.min) / (dataArea.x.max - dataArea.x.min)) * (displayArea.x.max - displayArea.x.min) + displayArea.x.min;
  var y = ((position.y - dataArea.y.min) / (dataArea.y.max - dataArea.y.min)) * (displayArea.y.max - displayArea.y.min) + displayArea.y.min;
  var z = 0;
  var w = 0;
  return { x, y, z, w };
}
function displayToData(position)
{
  var x = ((position.x - displayArea.x.min) / (displayArea.x.max - displayArea.x.min)) * (dataArea.x.max - dataArea.x.min) + dataArea.x.min;
  var y = ((position.y - displayArea.y.min) / (displayArea.y.max - displayArea.y.min)) * (dataArea.y.max - dataArea.y.min) + dataArea.y.min;
  var z = 0;
  var w = 0;
  return { x, y, z, w };
}

function roundDecimals(value, decimals) { return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals) }
function getPosX(jqele) { return jqele.offset().left - graph.offset().left + jqele.width()/2; }
function getPosY(jqele) { return jqele.offset().top - graph.offset().top + jqele.height()/2; }
function getPoint(jqele) {
	var x = getPosX(jqele);
	var y = getPosY(jqele);
	return {x, y};
}

function exportString()
{
  var string = '[\n';
  for (var i = 0; i < points.length; ++i)
  {
    string += '  { "value": { "x":' + points[i].point.x + ', "y":' + points[i].point.y + ' }, "tangent" : { "x":' + points[i].tangent.x + ', "y":' + points[i].tangent.y + ' }}';
    if (i+1 < points.length)
      string += ',\n';
    else
      string += '\n';
  }
  string+=']';
  $("#iostring").val(string);
}

function importString()
{
  clearPoints();

  var string = $("#iostring").val();
  var inputTree = jQuery.parseJSON(string);
  for (var i = 0; i < inputTree.length; i++) {
    addPoint();
    var newie = points[points.length - 1];
    newie.point.x = parseFloat(inputTree[i].value.x);
    newie.point.y = parseFloat(inputTree[i].value.y);
    newie.tangent.x = parseFloat(inputTree[i].tangent.x);
    newie.tangent.y = parseFloat(inputTree[i].tangent.y);
    refreshPointEntry(newie, true);
  }
  // }
  // for (var i = 0; i < inputTree.length; ++i)
  //   console.log(inputTree[i].value.x);

  if (points.length == 0)
    addPoint();
}

function bezier( A, B, C, D, t )
{
	var mt = 1 - t;
	//var x = A.x * mt * mt + (C.x + 2 * (C.x - D.x)) * 2 * mt * t + C.x * t * t;
	//var y = A.y * mt * mt + (C.y + 2 * (C.y - D.y)) * 2 * mt * t + C.y * t * t;
  var projB = { x: A.x + B.x ,
                y: A.y + B.y  };
  var projD = { x: C.x - D.x,
                y: C.y - D.y };
	var x = A.x * mt * mt * mt + projB.x * 3 * mt * mt * t + projD.x * 3 * mt * t * t + C.x * t * t * t;
	var y = A.y * mt * mt * mt + projB.y * 3 * mt * mt * t + projD.y * 3 * mt * t * t + C.y * t * t * t;
	return {x, y};
}

function paintBezier(ctx,A,B,C,D)
{
	ctx.beginPath();
	var delta = 0.05;
	for (let x = delta; true; x += delta)
	{
		var last = false;
		if (x > 1)
		{
			last = true;
			x = 1;
		}
		var prev = bezier(A,B,C,D,x - delta);
		var post = bezier(A,B,C,D,x);
    prev = dataToDisplay(prev);
    post = dataToDisplay(post);
		ctx.moveTo(prev.x, prev.y);
		ctx.lineTo(post.x, post.y);
		//console.log(prev.x + "" + prev.y + " to " + post.x + "," + post.y);
		if (last)
			break;
	}
	ctx.strokeStyle = "#ffaaff";
	ctx.lineWidth = 2;
	ctx.stroke();
}

function paintControl(ctx,A,B,color)
{
	ctx.beginPath();
	ctx.lineWidth = 3;
  var ptA = dataToDisplay({ x: (A.x - B.x), y: (A.y - B.y) });
  var ptB = dataToDisplay({ x: (A.x + B.x), y: (A.y + B.y) });
	ctx.moveTo(ptA.x, ptA.y);
	ctx.lineTo(ptB.x, ptB.y);
  ctx.strokeStyle = color;

  ctx.stroke();
}

function paintGrid(ctx)
{
  ctx.fillStyle = "black";
	ctx.fillRect(0, 0, 800, 800);

	ctx.beginPath();
	ctx.lineWidth = 1;
	for (var x = dataArea.x.min; x <= dataArea.x.max; x += 1)
	{
    var dataPointA = dataToDisplay({ x: x, y: dataArea.y.min });
    var dataPointB = dataToDisplay({ x: x, y: dataArea.y.max });
		ctx.moveTo(dataPointA.x, dataPointA.y);
		ctx.lineTo(dataPointB.x, dataPointB.y);
	}
	for (var y = dataArea.y.min; y <= dataArea.y.max; y += 1)
	{
    var dataPointA = dataToDisplay({ x: dataArea.x.min, y: y });
    var dataPointB = dataToDisplay({ x: dataArea.x.max, y: y });
		ctx.moveTo(dataPointA.x, dataPointA.y);
		ctx.lineTo(dataPointB.x, dataPointB.y);
	}
  ctx.strokeStyle = "white";
  ctx.stroke();

	ctx.beginPath();
	ctx.lineWidth = 2;
  var dataPointA = dataToDisplay({ x: dataArea.x.min, y: 0 });
  var dataPointB = dataToDisplay({ x: dataArea.x.max, y: 0 });
  ctx.moveTo(dataPointA.x, dataPointA.y);
  ctx.lineTo(dataPointB.x, dataPointB.y);
  var dataPointA = dataToDisplay({ x: 0, y: dataArea.y.min });
  var dataPointB = dataToDisplay({ x: 0, y: dataArea.y.max });
  ctx.moveTo(dataPointA.x, dataPointA.y);
  ctx.lineTo(dataPointB.x, dataPointB.y);
  ctx.strokeStyle = "yellow";
  ctx.stroke();
}

function paintGraph()
{
	const ctx = graphDOM.getContext("2d");
  paintGrid(ctx);
  for (var i = 1; i < points.length; ++i)
    paintBezier(ctx, points.at(i-1).point, points.at(i-1).tangent, points.at(i).point, points.at(i).tangent);
  for (var i = 0; i < points.length; ++i)
    paintControl(ctx, points.at(i).point, points.at(i).tangent, point_colors[i % point_colors.length]);
}

function dragElement(entry) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  entry.point_handle.on( "mousedown", dragMouseDownPoint );
  entry.tangent_handle.on( "mousedown", dragMouseDownTangent );

  function dragMouseDownTangent(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDragTangent;
  }

   function dragMouseDownPoint(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDragPoint;
  }

  function elementDragTangent(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    entry.tangent_handle.css({top: entry.tangent_handle.offset().top - pos2,
                              left: entry.tangent_handle.offset().left - pos1,
                              position:'absolute'});
    refreshPointEntry(entry);
    paintGraph();
  }

  function elementDragPoint(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    entry.point_handle.css({top: entry.point_handle.offset().top - pos2,
                            left: entry.point_handle.offset().left - pos1,
                            position:'absolute'});
    entry.tangent_handle.css({top: entry.tangent_handle.offset().top - pos2,
                              left: entry.tangent_handle.offset().left - pos1,
                              position:'absolute'});
    refreshPointEntry(entry);
    paintGraph();
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}