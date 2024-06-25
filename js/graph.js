
var points = [];
var pointHandles = [];
var tangentHandles = [];
var point_colors = [ "#facb5f","#77bfc7","#9f59c2","#599f52" ];

$( document ).ready(function() {
	let graph = $("#graph").get(0);
	const ctx = graph.getContext("2d");

  for (var i = 0; i < 8; ++i)
    addPoint();
  console.log(points);

	paintGrid(ctx);
});

function addPoint()
{
  var pointHandle = $( '<div class="ctrl-point"></div>' ).first();
  var tangentHandle = $( '<div class="ctrl-point"></div>' ).first();
  $("#graph-area").append( pointHandle );
  $("#graph-area").append( tangentHandle );
	dragElement(pointHandle, tangentHandle);
  var entry = { point: { x: 0, y: 0, z: 0, w: 0 },
                tangent: { x: 1, y: 1, z: 1, w: 1 },
                point_handle: pointHandle,
                tangent_handle: tangentHandle }
  points.push(entry);
	pointHandle.css({top: pointHandle.offset().top - 400, left: pointHandle.offset().left + 200 + points.length * 50, position:'absolute'});
	tangentHandle.css({top: tangentHandle.offset().top - 450, left: tangentHandle.offset().left + 250 + points.length * 50, position:'absolute'});
  return entry;
}

function getPosX(jqele) { return jqele.offset().left - $("#graph").offset().left + jqele.width()/2; }
function getPosY(jqele) { return jqele.offset().top - $("#graph").offset().top + jqele.height()/2; }
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

	// bezier curve
  for (var i = 1; i < points.length; ++i)
    paintBezier(ctx, getPoint(points.at(i-1).point_handle), getPoint(points.at(i-1).tangent_handle), getPoint(points.at(i).point_handle), getPoint(points.at(i).tangent_handle));

	// control points
  for (var i = 0; i < points.length; ++i)
    paintControl(ctx, getPoint(points.at(i).point_handle), getPoint(points.at(i).tangent_handle), point_colors[i % point_colors.length]);
}

function dragElement(elmntM, elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmntM.on( "mousedown", dragMouseDownM );
    elmnt.on( "mousedown", dragMouseDown );
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

   function dragMouseDownM(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDragM;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
	elmnt.css({top: elmnt.offset().top - pos2, left: elmnt.offset().left - pos1, position:'absolute'});

	let graph = $("#graph").get(0);
	const ctx = graph.getContext("2d");
	paintGrid(ctx);
  }

  function elementDragM(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
	elmnt.css({top: elmnt.offset().top - pos2, left: elmnt.offset().left - pos1, position:'absolute'});
	elmntM.css({top: elmntM.offset().top - pos2, left: elmntM.offset().left - pos1, position:'absolute'});

	let graph = $("#graph").get(0);
	const ctx = graph.getContext("2d");
	paintGrid(ctx);
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}