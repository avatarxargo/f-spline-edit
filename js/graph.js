
var points = [];
var pointHandles = [];
var tangentHandles = [];
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

  $("#button-add").click( function() { addPoint(); paintGraph(); });
	paintGraph();
});

function addPointControl()
{
  var newPanel = $( '<div class="panel narrow-field"> <p>point <label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"><label>y:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p> <p>tangent <label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"><label>y:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p></div>');
  var pointx = newPanel.find( "input" ).eq(0);
  var pointy = newPanel.find( "input" ).eq(1);
  var tangentx = newPanel.find( "input" ).eq(2);
  var tangenty = newPanel.find( "input" ).eq(3);
  fieldArea.append(newPanel);
  return { point: { x: pointx, y: pointy }, tangent: { x: tangentx, y: tangenty } };
}

function addPoint()
{
  var pointHandle = $( '<div class="ctrl-point"></div>' ).first();
  var tangentHandle = $( '<div class="ctrl-point"></div>' ).first();
  $("#graph-area").append( pointHandle );
  $("#graph-area").append( tangentHandle );
  var controls = addPointControl();
  var entry = { point: { x: 0, y: 0, z: 0, w: 0 },
                tangent: { x: 1, y: 1, z: 1, w: 1 },
                point_handle: pointHandle,
                tangent_handle: tangentHandle,
                controls: controls }
  points.push(entry);
	dragElement(entry);
  controls.point.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.point.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
	pointHandle.css({top: pointHandle.offset().top - 400, left: pointHandle.offset().left + 200 + points.length * 50, position:'absolute'});
	tangentHandle.css({top: tangentHandle.offset().top - 450, left: tangentHandle.offset().left + 250 + points.length * 50, position:'absolute'});
  refreshPointEntry(entry);
  return entry;
}

function refreshPointEntry(entry)
{
  var point = { x: entry.point_handle.offset().left + entry.point_handle.width()/2 - graph.offset().left,
                y: entry.point_handle.offset().top + entry.point_handle.height()/2 - graph.offset().top };
  var tangent = { x: entry.tangent_handle.offset().left + entry.tangent_handle.width()/2 - graph.offset().left,
                  y: entry.tangent_handle.offset().top + entry.tangent_handle.height()/2 - graph.offset().top };

  point = displayToData(point);
  tangent = displayToData(tangent);

  entry.controls.point.x.val( roundDecimals(point.x, 2) );
  entry.controls.point.y.val( roundDecimals(point.y, 2) );
  entry.controls.tangent.x.val( roundDecimals(tangent.x, 2) );
  entry.controls.tangent.y.val( roundDecimals(tangent.y, 2) );
  refreshPointHandle(entry); // propagate rounding back to the handle
}

function refreshPointHandle(entry)
{
  var point = { x: entry.controls.point.x.val(),
                y: entry.controls.point.y.val() };
  var tangent = { x: entry.controls.tangent.x.val(),
                  y: entry.controls.tangent.y.val() };

  point = dataToDisplay(point);
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

function bezier( A, B, C, D, t )
{
	var mt = 1 - t;
	//var x = A.x * mt * mt + (C.x + 2 * (C.x - D.x)) * 2 * mt * t + C.x * t * t;
	//var y = A.y * mt * mt + (C.y + 2 * (C.y - D.y)) * 2 * mt * t + C.y * t * t;
	var x = A.x * mt * mt * mt + B.x * 3 * mt * mt * t + (C.x + 2 * (C.x - D.x)) * 3 * mt * t * t + C.x * t * t * t;
	var y = A.y * mt * mt * mt + B.y * 3 * mt * mt * t + (C.y + 2 * (C.y - D.y)) * 3 * mt * t * t + C.y * t * t * t;
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
	ctx.moveTo(A.x - (B.x - A.x), A.y - (B.y - A.y));
	ctx.lineTo(B.x, B.y);
    ctx.strokeStyle = color;
    ctx.stroke();
}

function paintGrid(ctx)
{
  ctx.fillStyle = "black";
	ctx.fillRect(0, 0, 800, 800);

	ctx.beginPath();
	ctx.lineWidth = 1;
	for (let x = 0; x <= 10; x += 1)
	{
		ctx.moveTo(x * 80, 0);
		ctx.lineTo(x * 80, 800);
		ctx.moveTo(0, x * 80);
		ctx.lineTo(800, x * 80);
	}
  ctx.strokeStyle = "white";
  ctx.stroke();

	ctx.beginPath();
	ctx.lineWidth = 2;
  ctx.moveTo(400, 0);
  ctx.lineTo(400, 800);
  ctx.moveTo(0, 400);
  ctx.lineTo(800, 400); 
  ctx.stroke();
}

function paintGraph()
{
	const ctx = graphDOM.getContext("2d");
  paintGrid(ctx);
  for (var i = 1; i < points.length; ++i)
    paintBezier(ctx, getPoint(points.at(i-1).point_handle), getPoint(points.at(i-1).tangent_handle), getPoint(points.at(i).point_handle), getPoint(points.at(i).tangent_handle));
  for (var i = 0; i < points.length; ++i)
    paintControl(ctx, getPoint(points.at(i).point_handle), getPoint(points.at(i).tangent_handle), point_colors[i % point_colors.length]);
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