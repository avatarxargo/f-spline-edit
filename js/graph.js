$( document ).ready(function() {
	let graph = $("#graph").get(0);
	const ctx = graph.getContext("2d");
	
	$("#pointA").css({top: $("#graph").offset().top + 300, left: $("#graph").offset().left + 100, position:'absolute'});
	$("#pointB").css({top: $("#graph").offset().top + 200, left: $("#graph").offset().left + 200, position:'absolute'});
	$("#pointC").css({top: $("#graph").offset().top + 200, left: $("#graph").offset().left + 400, position:'absolute'});
	$("#pointD").css({top: $("#graph").offset().top + 300, left: $("#graph").offset().left + 500, position:'absolute'});
	$("#pointE").css({top: $("#graph").offset().top + 700, left: $("#graph").offset().left + 600, position:'absolute'});
	$("#pointF").css({top: $("#graph").offset().top + 720, left: $("#graph").offset().left + 720, position:'absolute'});
	
	// Make the DIV element draggable:
	dragElement($("#pointA"), $("#pointB"));
	dragElement($("#pointC"), $("#pointD"));
	dragElement($("#pointE"), $("#pointF"));
	
	paintGrid(ctx);
});

function getPosX(jqele) { return jqele.offset().left - $("#graph").offset().left + jqele.width()/2; }
function getPosY(jqele) { return jqele.offset().top - $("#graph").offset().top + jqele.height()/2; }
function getPoint(name) {
	var x = getPosX($(name));
	var y = getPosY($(name));
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
		console.log(prev.x + "" + prev.y + " to " + post.x + "," + post.y);
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
	paintBezier(ctx, getPoint("#pointA"),getPoint("#pointB"),getPoint("#pointC"),getPoint("#pointD"));
	paintBezier(ctx, getPoint("#pointC"),getPoint("#pointD"),getPoint("#pointE"),getPoint("#pointF"));
	
	// control points
	paintControl(ctx, getPoint("#pointA"), getPoint("#pointB"), "#facb5f");
	paintControl(ctx, getPoint("#pointC"), getPoint("#pointD"), "#77bfc7");
	paintControl(ctx, getPoint("#pointE"), getPoint("#pointF"), "#9f59c2");
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