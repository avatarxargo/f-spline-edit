
var points = [];
var point_colors = [ "#facb5f","#77bfc7","#9f59c2","#599f52" ];
var graph;
var graphDOM;
var fieldArea

const millsPerTick = 16 // 60 ticks per second -> 1000ms/60ticks = 16 at shortest.

var simulationT = 0;
var simulationStartTime;
var simulationPoint;
var simulationInterval;
var playbackStatus = false;

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

  $("#button-play").click(function() { togglePlayback(!playbackStatus); })
  simulationPoint = $("#simulation-point");
  
  $("#button-add").click( function() { addPoint(); paintGraph(); });
  $("#import").click( function() { importString(); paintGraph(); });
  $("#export").click( function() { exportString(); });

  resizeDataArea();
	paintGraph();
  togglePlayback(false);
});

function addPointControl()
{
  var newPanel = $( '<div class="panel narrow-field"> <p><a class="button micro-button">X</a> point <label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"><label>y:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p> <p>tangent <label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"><label>y:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p> <p><label>timestamp:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p></div>');
  var pointx = newPanel.find( "input" ).eq(0);
  var pointy = newPanel.find( "input" ).eq(1);
  var tangentx = newPanel.find( "input" ).eq(2);
  var tangenty = newPanel.find( "input" ).eq(3);
  var timestamp = newPanel.find( "input" ).eq(4);
  var removeButton = newPanel.find( "a" ).eq(0);
  fieldArea.append(newPanel);
  return { panel: newPanel, remove: removeButton, point: { x: pointx, y: pointy }, tangent: { x: tangentx, y: tangenty }, timestamp: timestamp };
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
                timestamp: 0,
                controls: controls }
  points.push(entry);
	dragElement(entry);
  controls.point.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.point.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.timestamp.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.remove.click(function() { removePoint(entry.index); paintGraph(); });

  controls.point.x.val(entry.point.x);
  controls.point.y.val(entry.point.y);
  controls.tangent.x.val(entry.tangent.x);
  controls.tangent.y.val(entry.tangent.y);
  controls.timestamp.val(entry.timestamp);

  refreshPointEntry(entry, false, true);
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

function refreshPointEntry(entry, nested = false, dataOnly = false)
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
  entry.controls.timestamp.val( Math.trunc(parseFloat(entry.timestamp)) );
  refreshPlaybackBounds();
  if (!nested)
    refreshPointHandle(entry, true); // propagate rounding back to the handle
}

function refreshPointHandle(entry, nested = false)
{
  entry.point = { x: parseFloat(entry.controls.point.x.val()),
                  y: parseFloat(entry.controls.point.y.val()) };
  entry.tangent = { x: parseFloat(entry.controls.tangent.x.val()),
                    y: parseFloat(entry.controls.tangent.y.val()) };
  entry.timestamp = parseFloat(entry.controls.timestamp.val());

  var tangent = { x: entry.point.x + entry.tangent.x, y: entry.point.y + entry.tangent.y };
  var point = dataToDisplay(entry.point);
  tangent = dataToDisplay(tangent);

  entry.point_handle.css({left: graph.offset().left - entry.point_handle.width()/2 + point.x,
                          top: graph.offset().top - entry.point_handle.height()/2 + point.y,
                          position:'absolute'});

  entry.tangent_handle.css({left: graph.offset().left - entry.tangent_handle.width()/2 + tangent.x,
                            top: graph.offset().top - entry.tangent_handle.height()/2 + tangent.y,
                            position:'absolute'});
  if (!nested)
    refreshPointEntry(entry, true);
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

function togglePlayback(tgt)
{
  playbackStatus = tgt;
  if (tgt)
  {
    $("#button-play").text("\u25FC");
    simulationPoint.css("opacity", "1");
    simulationStartTime = Date.now() - (simulationT * millsPerTick); // compensate for the currently selected simulation time.
    simulationInterval = setInterval(updatePlayback, millsPerTick);
  }
  else
  {
    $("#button-play").text("\u25B6");
    simulationPoint.css("opacity", "0.5");
    window.clearInterval(simulationInterval);
  }
}

function moveSimulation(point)
{
  point = dataToDisplay(point);
  simulationPoint.css({left: graph.offset().left - simulationPoint.width()/2 + point.x,
                      top: graph.offset().top - simulationPoint.height()/2 + point.y,
                      position:'absolute'});
}

function updatePlayback()
{
  if (playbackStatus)
  {
    var millsElapsed = Date.now() - simulationStartTime;
    simulationT = Math.trunc(points.at(0).timestamp + millsElapsed/millsPerTick);
  }

  var point;
  if (simulationT <= points.at(0).timestamp)
  {
    moveSimulation(points.at(0).point);
    refreshPlaybackT();
    return;
  }
  if (simulationT >= points.at(points.length - 1).timestamp)
  {
    moveSimulation(points.at(points.length - 1).point);
    simulationT = points.at(0).timestamp; // reset loop
    simulationStartTime = Date.now();
    refreshPlaybackT();
    return;
  }
  if (points.length < 2)
  {
    refreshPlaybackT();
    return;
  }
    
  var i = 1;
  while (simulationT > points.at(i).timestamp && (i+1) < points.length)
    ++i;
  var t = points.at(i).timestamp != points.at(i-1).timestamp ? (simulationT - points.at(i-1).timestamp) / (points.at(i).timestamp - points.at(i-1).timestamp) : 0;
  var point = bezier(points.at(i-1).point, points.at(i-1).tangent, points.at(i).point, points.at(i).tangent, t);
  moveSimulation(point);
  refreshPlaybackT();
}

function refreshPlaybackT()
{
  $("#time-text").val(simulationT);
  $("#time-slider").val(simulationT);
}

function refreshPlaybackBounds()
{
  if (points.length < 1)
    return;
  $("#time-slider").prop("min", points.at(0).timestamp);
  $("#time-slider").prop("max", points.at(points.length - 1).timestamp);
}

function exportString()
{
  var string = '[\n';
  for (var i = 0; i < points.length; ++i)
  {
    string += '  { "timestamp": ' + points[i].timestamp + ', "value": { "x":' + points[i].point.x + ', "y":' + points[i].point.y + ' }, "tangent" : { "x":' + points[i].tangent.x + ', "y":' + points[i].tangent.y + ' }}';
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
    newie.timestamp = parseFloat(inputTree[i].timestamp);
    refreshPointEntry(newie, false, true);
  }

  if (points.length == 0)
    addPoint();
}

function bezier( A, B, C, D, t )
{
	var mt = 1 - t;
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

function paintGridLinesX(ctx, width, color, xmin, xmax, xdelta)
{
	ctx.beginPath();
	ctx.lineWidth = width;
  ctx.strokeStyle = color;
  for (var x = xmin; x <= xmax; x += xdelta)
  {
    var dataPointA = dataToDisplay({ x: x, y: dataArea.y.min });
    var dataPointB = dataToDisplay({ x: x, y: dataArea.y.max });
    ctx.moveTo(dataPointA.x, dataPointA.y);
    ctx.lineTo(dataPointB.x, dataPointB.y);
  }
  ctx.stroke();
}
function paintGridLinesY(ctx, width, color, ymin, ymax, ydelta)
{
	ctx.beginPath();
	ctx.lineWidth = width;
  ctx.strokeStyle = color;
	for (var y = ymin; y <= ymax; y += ydelta)
	{
    var dataPointA = dataToDisplay({ x: dataArea.x.min, y: y });
    var dataPointB = dataToDisplay({ x: dataArea.x.max, y: y });
		ctx.moveTo(dataPointA.x, dataPointA.y);
		ctx.lineTo(dataPointB.x, dataPointB.y);
	}
  ctx.stroke();
}

function paintGridLabelX(ctx, color, style, xmin, xmax, xdelta)
{
  ctx.font = style;
	ctx.fillStyle = color;
	for (var x = 0; x <= xmax; x += xdelta)
  {
    var dataPoint = dataToDisplay({ x: x, y: dataArea.y.min});
    ctx.fillText(x,dataPoint.x + 3, dataPoint.y + 15);
  }
  for (var x = -xdelta; x > xmin; x -= xdelta)
  {
    var dataPoint = dataToDisplay({ x: x, y: dataArea.y.min});
    ctx.fillText(x,dataPoint.x + 3, dataPoint.y + 15);
  }
}
function paintGridLabelY(ctx, color, style, ymin, ymax, ydelta)
{
  ctx.font = style;
	ctx.fillStyle = color;
	for (var y = 0; y <= ymax; y += ydelta)
  {
    var dataPoint = dataToDisplay({ x: dataArea.x.min, y: y });
    ctx.fillText(y,dataPoint.x + 3, dataPoint.y - 5);
  }
  for (var y = -ydelta; y > ymin; y -= ydelta)
  {
    var dataPoint = dataToDisplay({ x: dataArea.x.min, y: y });
    ctx.fillText(y,dataPoint.x + 3, dataPoint.y - 5);
  }
}

function paintGrid(ctx)
{
  ctx.fillStyle = "black";
	ctx.fillRect(0, 0, 800, 800);

  var xmin = dataArea.x.min < dataArea.x.max ? dataArea.x.min : dataArea.x.max;
  var xmax = dataArea.x.min > dataArea.x.max ? dataArea.x.min : dataArea.x.max;
  var xdelta = 1;
  if (xmax - xmin >= 30)
  {
    paintGridLinesX(ctx, 1, "#555555", xmin, xmax, xdelta);
    xdelta = 10;
  }
  paintGridLinesX(ctx, 1, "white", xmin, xmax, xdelta);
  paintGridLabelX(ctx, "white", "1em Arial", xmin, xmax, xdelta)

  var ymin = dataArea.y.min < dataArea.y.max ? dataArea.y.min : dataArea.y.max;
  var ymax = dataArea.y.min > dataArea.y.max ? dataArea.y.min : dataArea.y.max;
  var ydelta = 1;
  if (ymax - ymin >= 30)
  {
    paintGridLinesY(ctx, 1, "#555555", ymin, ymax, ydelta);
    ydelta = 10;
  }
  paintGridLinesY(ctx, 1, "white", ymin, ymax, ydelta);
  paintGridLabelY(ctx, "white", "1em Arial", ymin, ymax, ydelta)

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
  if (!playbackStatus)
    updatePlayback();
}

function dragElement(entry) {
  var mouseXdelta = 0, mouseYdelta = 0, mouseXstart = 0, mouseYstart = 0;
  entry.point_handle.on( "mousedown", dragMouseDownPoint );
  entry.tangent_handle.on( "mousedown", dragMouseDownTangent );

  function dragMouseDownTangent(e) {
    e = e || window.event;
    e.preventDefault();
    mouseXstart = e.clientX;
    mouseYstart = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDragTangent;
  }

   function dragMouseDownPoint(e) {
    e = e || window.event;
    e.preventDefault();
    mouseXstart = e.clientX;
    mouseYstart = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDragPoint;
  }

  function elementDragTangent(e) {
    e = e || window.event;
    e.preventDefault();
    mouseXdelta = mouseXstart - e.clientX;
    mouseYdelta = mouseYstart - e.clientY;
    mouseXstart = e.clientX;
    mouseYstart = e.clientY;
    entry.tangent_handle.css({left: entry.tangent_handle.offset().left - mouseXdelta,
                              top: entry.tangent_handle.offset().top - mouseYdelta,
                              position:'absolute'});
    refreshPointEntry(entry);
    paintGraph();
  }

  function elementDragPoint(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    mouseXdelta = mouseXstart - e.clientX;
    mouseYdelta = mouseYstart - e.clientY;
    mouseXstart = e.clientX;
    mouseYstart = e.clientY;
    entry.point_handle.css({left: entry.point_handle.offset().left - mouseXdelta,
                            top: entry.point_handle.offset().top - mouseYdelta,
                            position:'absolute'});
    entry.tangent_handle.css({left: entry.tangent_handle.offset().left - mouseXdelta,
                              top: entry.tangent_handle.offset().top - mouseYdelta,
                              position:'absolute'});
    refreshPointEntry(entry);
    paintGraph();
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}