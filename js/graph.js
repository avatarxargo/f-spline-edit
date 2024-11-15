
var points = [];
var point_colors = [ "#facb5f","#77bfc7","#9f59c2","#599f52" ];
var graph;
var graphDOM;
var fieldArea
var dimension = 2;

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

  $(window).on( "resize", function() { points.forEach(refreshPointHandle); paintGraph(); } );
  $("#dimension").on('change', setDimension);
  $("#x-dimensions input").on('input', function(){ resizeDataArea(); paintGraph(); });
  $("#y-dimensions input").on('input', function(){ resizeDataArea(); paintGraph(); });

  $("#button-play").click(function() { togglePlayback(!playbackStatus); })
  simulationPoint = $("#simulation-point");
  $("#time-slider").on("input", function() { if(playbackStatus) return; onSliderChanged(); });
  $("#time-text").on("change", function() { if(playbackStatus) return; onTimeTextChanged(); });
  $("#time-slider").on("mousedown", function() { togglePlayback(false); });
  $("#time-text").on("mousedown", function() { togglePlayback(false); });

  $("#fit").click( function() { fitBoundsToData(); });
  $("#flipx").click( function() { flipBoundsX(); });
  $("#flipy").click( function() { flipBoundsY(); });
  $("#button-add").click( function() { addPoint(); paintGraph(); });
  $("#export-lua").click( function() { exportLua(); });
  $("#download").click( function() { downloadString(); });
  $("#export").click( function() { exportString(); });
  $("#import").click( function() { importString(); paintGraph(); });

  resizeDataArea();
	paintGraph();
  togglePlayback(false);
  setDimension();
});

function setDimension()
{
  var optionSelected = $("#dimension").find("option:selected");
  var valueSelected  = optionSelected.val();
  var ogDimension = dimension;
  if (valueSelected == "1D")
    dimension = 1;
  else if (valueSelected == "2D")
    dimension = 2;
  else if (valueSelected == "4D")
    dimension = 4;
  applyDimension();
  if (ogDimension != dimension)
  {
    resizeDataArea();
    paintGraph();
  }
}
function applyDimension()
{
  if (dimension >= 2)
    $(".2d").show();
  else
    $(".2d").hide();

  if (dimension >= 4)
  {
    $(".4d").show();
    $(".n4d").hide();
    $("#flipy").addClass('disabled-button');
  }
  else
  {
    $(".4d").hide();
    $(".n4d").show();
    $("#flipy").removeClass('disabled-button');
  }
}

function addPointControl()
{
  var newPanel = $( '<div class="panel narrow-field"> <p><a class="button micro-button" title="Remove point (cannot be undone)">X</a> point ' +
                    '<label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*">'+
                    '<label class="2d">y:</label> <input class="2d" type="text" inputmode="numeric" pattern="[0-9]*">'+
                    '<br/ class="4d"><label class="4d">z:</label> <input class="4d" type="text" inputmode="numeric" pattern="[0-9]*">'+
                    '<label class="4d">a:</label> <input class="4d" type="text" inputmode="numeric" pattern="[0-9]*"></p>'+
                    '<p>tangent <label>x:</label> <input type="text" inputmode="numeric" pattern="[0-9]*">'+
                    '<label class="2d">y:</label> <input class="2d" type="text" inputmode="numeric" pattern="[0-9]*">'+
                    '<br/ class="4d"><label class="4d">z:</label> <input class="4d" type="text" inputmode="numeric" pattern="[0-9]*">'+
                    '<label class="4d">a:</label> <input class="4d" type="text" inputmode="numeric" pattern="[0-9]*"></p>'+
                    '<p><label>timestamp:</label> <input type="text" inputmode="numeric" pattern="[0-9]*"></p></div>');
  var pointx = newPanel.find( "input" ).eq(0);
  var pointy = newPanel.find( "input" ).eq(1);
  var pointz = newPanel.find( "input" ).eq(2);
  var pointa = newPanel.find( "input" ).eq(3);

  var tangentx = newPanel.find( "input" ).eq(4);
  var tangenty = newPanel.find( "input" ).eq(5);
  var tangentz = newPanel.find( "input" ).eq(6);
  var tangenta = newPanel.find( "input" ).eq(7);

  var timestamp = newPanel.find( "input" ).eq(8);
  var removeButton = newPanel.find( "a" ).eq(0);
  fieldArea.append(newPanel);
  return { panel: newPanel,
           remove: removeButton,
           point: { x: pointx, y: pointy, z: pointz, a: pointa },
           tangent: { x: tangentx, y: tangenty, z: tangentz, a: tangenta },
           timestamp: timestamp };
}

function addPoint()
{
  var pointHandle = $( '<div class="ctrl-point"></div>' ).first();
  var tangentHandle = $( '<div class="ctrl-point n4d"></div>' ).first();
  $("#graph-area").append( pointHandle );
  $("#graph-area").append( tangentHandle );
  var controls = addPointControl();
  var entry = { index: points.length,
                point: { x: points.length, y: 0, z: 0, a: 255 },
                tangent: { x: 1, y: 1, z: 0, a: 0 },
                point_handle: pointHandle,
                tangent_handle: tangentHandle,
                timestamp: points.length == 0 ? 0 : points.at(points.length-1).timestamp + 100,
                controls: controls }
  points.push(entry);
	dragElement(entry);
  controls.point.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.point.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.point.z.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.point.a.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.x.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.y.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.z.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.tangent.a.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.timestamp.on('input', function(){ refreshPointHandle(entry); paintGraph(); });
  controls.remove.click(function() { removePoint(entry.index); paintGraph(); });

  controls.point.x.val(entry.point.x);
  controls.point.y.val(entry.point.y);
  controls.tangent.x.val(entry.tangent.x);
  controls.tangent.y.val(entry.tangent.y);
  controls.timestamp.val(entry.timestamp);

  refreshPointEntry(entry, false, true);
  applyDimension();
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
  refreshPlaybackBounds();
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
  if (dimension < 4)
  {
    dataArea.y.min = parseFloat($( "#y-dimensions input" ).eq(0).val());
    dataArea.y.max = parseFloat($( "#y-dimensions input" ).eq(1).val());
  }
  else
  {
    dataArea.y.min = 2;
    dataArea.y.max = -1;
  }
  points.forEach(refreshPointHandle);
}
function flipBoundsX()
{
  var tmp = $( "#x-dimensions input" ).eq(0).val();
  $( "#x-dimensions input" ).eq(0).val($( "#x-dimensions input" ).eq(1).val());
  $( "#x-dimensions input" ).eq(1).val(tmp);
  resizeDataArea();
  paintGraph();
}
function flipBoundsY()
{
  if (dimension >= 4)
    return;
  var tmp = $( "#y-dimensions input" ).eq(0).val();
  $( "#y-dimensions input" ).eq(0).val($( "#y-dimensions input" ).eq(1).val());
  $( "#y-dimensions input" ).eq(1).val(tmp);
  resizeDataArea();
  paintGraph();
}
function fitBoundsToData()
{
  var minx = 10000000.0;
  var miny = 10000000.0;
  var maxx = -10000000.0;
  var maxy = -10000000.0;

  if (dimension == 1)
    for (var i = 0; i < points.length; ++i)
    {
      var x1 = points[i].timestamp;
      var y1 = points[i].point.x;
      var y2 = y1 + points[i].tangent.x;
      if (minx > x1) minx = x1;
      if (maxx < x1) maxx = x1;
      if (miny > y1) miny = y1;
      if (maxy < y1) maxy = y1;
      if (miny > y2) miny = y2;
      if (maxy < y2) maxy = y2;
    }
  else if (dimension == 2)
    for (var i = 0; i < points.length; ++i)
    {
      var x1 = points[i].point.x;
      var x2 = x1 + points[i].tangent.x;
      var y1 = points[i].point.y;
      var y2 = y1 + points[i].tangent.y;
      if (minx > x1) minx = x1;
      if (maxx < x1) maxx = x1;
      if (minx > x2) minx = x2;
      if (maxx < x2) maxx = x2;
      if (miny > y1) miny = y1;
      if (maxy < y1) maxy = y1;
      if (miny > y2) miny = y2;
      if (maxy < y2) maxy = y2;
    }
  else if (dimension == 4)
    for (var i = 0; i < points.length; ++i)
    {
      var x1 = points[i].timestamp;
      if (minx > x1) minx = x1;
      if (maxx < x1) maxx = x1;
    }
  else
    return;

  $( "#x-dimensions input" ).eq(0).val(roundDecimals(minx - 1, 0));
  $( "#x-dimensions input" ).eq(1).val(roundDecimals(maxx + 1, 0));
  if (dimension != 4)
  {
    $( "#y-dimensions input" ).eq(0).val(roundDecimals(maxy + 1, 0)); // y swapped to put positive axis upward
    $( "#y-dimensions input" ).eq(1).val(roundDecimals(miny - 1, 0));
  }
  resizeDataArea();
  paintGraph();
}

function refreshPointEntry(entry, nested = false, dataOnly = false)
{
  if (!dataOnly)
  {
    var point = { x: entry.point_handle.offset().left + entry.point_handle.width()/2 - graph.offset().left,
                  y: entry.point_handle.offset().top + entry.point_handle.height()/2 - graph.offset().top };
    var tangent = { x: entry.tangent_handle.offset().left + ((dimension==1 ? -1 : 1) * entry.tangent_handle.width()/2) - graph.offset().left,
                    y: entry.tangent_handle.offset().top + entry.tangent_handle.height()/2 - graph.offset().top };
    if (dimension == 1)
    {
      var point1d = displayToData(point);
      var tangent1d = displayToData(tangent);

      entry.point.x = point1d.y;
      entry.timestamp = point1d.x;
      entry.tangent.x = tangent1d.y - entry.point.x;
    }
    else if (dimension == 2)
    {
      entry.point = displayToData(point);
      var tangent2d = displayToData(tangent);

      entry.tangent.x = tangent2d.x - entry.point.x;
      entry.tangent.y = tangent2d.y - entry.point.y;
    }
    else if (dimension == 4)
    {
      var point1d = displayToData(point);
      entry.timestamp = point1d.x;
    }
  }
  if (nested)
    return;

  entry.controls.point.x.val( roundDecimals(entry.point.x, 2) );
  entry.controls.point.y.val( roundDecimals(entry.point.y, 2) );
  entry.controls.point.z.val( roundDecimals(entry.point.z, 2) );
  entry.controls.point.a.val( roundDecimals(entry.point.a, 2) );
  entry.controls.tangent.x.val( roundDecimals(entry.tangent.x, 2) );
  entry.controls.tangent.y.val( roundDecimals(entry.tangent.y, 2) );
  entry.controls.tangent.z.val( roundDecimals(entry.tangent.z, 2) );
  entry.controls.tangent.a.val( roundDecimals(entry.tangent.a, 2) );
  entry.controls.timestamp.val( Math.trunc(entry.timestamp) );
  refreshPlaybackBounds();
  refreshPointHandle(entry, true); // propagate rounding back to the handle
}

function refreshPointHandle(entry, nested = false)
{
  var tmpx = parseFloat(entry.controls.point.x.val());
  var tmpy = parseFloat(entry.controls.point.y.val());
  var tmpz = parseFloat(entry.controls.point.z.val());
  var tmpa = parseFloat(entry.controls.point.a.val());

  var tmtx = parseFloat(entry.controls.tangent.x.val());
  var tmty = parseFloat(entry.controls.tangent.y.val());
  var tmtz = parseFloat(entry.controls.tangent.z.val());
  var tmta = parseFloat(entry.controls.tangent.a.val());

  if (isNaN(tmpx) || isNaN(tmpy) || isNaN(tmpz) || isNaN(tmpa) || isNaN(tmtx) || isNaN(tmty) || isNaN(tmtz) || isNaN(tmta))
    return;

  entry.point.x = tmpx;
  entry.point.y = tmpy;
  entry.point.z = tmpz;
  entry.point.a = tmpa;

  entry.tangent.x = tmtx;
  entry.tangent.y = tmty;
  entry.tangent.z = tmtz;
  entry.tangent.a = tmta;

  if (!nested) // to avoid stuttering while dragging time axis
    entry.timestamp = parseInt(entry.controls.timestamp.val());
  var tangent = { x: entry.point.x + entry.tangent.x,
                  y: entry.point.y + entry.tangent.y,
                  z: entry.point.x + entry.tangent.z,
                  a: entry.point.y + entry.tangent.a };

  if (dimension == 1)
  {
    var point1d = dataToDisplay({ x: entry.timestamp, y: entry.point.x });
    var tangent1d = dataToDisplay({ x: entry.timestamp, y: tangent.x });
    entry.point_handle.css({left: graph.offset().left - entry.point_handle.width()/2 + point1d.x,
                            top: graph.offset().top - entry.point_handle.height()/2 + point1d.y,
                            position:'absolute'});
    entry.tangent_handle.css({left: graph.offset().left + entry.tangent_handle.width()/2 + tangent1d.x,
                              top: graph.offset().top - entry.tangent_handle.height()/2 + tangent1d.y,
                              position:'absolute'});
  }
  else if (dimension == 2)
  {
    var point2d = dataToDisplay(entry.point);
    var tangent2d = dataToDisplay(tangent);
    entry.point_handle.css({left: graph.offset().left - entry.point_handle.width()/2 + point2d.x,
                            top: graph.offset().top - entry.point_handle.height()/2 + point2d.y,
                            position:'absolute'});
    entry.tangent_handle.css({left: graph.offset().left - entry.tangent_handle.width()/2 + tangent2d.x,
                              top: graph.offset().top - entry.tangent_handle.height()/2 + tangent2d.y,
                              position:'absolute'});
  }
  else if (dimension == 4)
  {
    var point1d = dataToDisplay({ x: entry.timestamp, y: 0.5 });
    entry.point_handle.css({left: graph.offset().left - entry.point_handle.width()/2 + point1d.x,
                            top: graph.offset().top - entry.point_handle.height()/2 + point1d.y,
                            position:'absolute'});
  }
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

function roundDecimals(value, decimals)
{
  var result = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return Number.isNaN(result) ? 0 : result;
}
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

function onSliderChanged()
{
  if (playbackStatus)
    return;
  simulationT = $("#time-slider").val();
  $("#time-text").val(simulationT);
  updatePlayback();
}
function onTimeTextChanged()
{
  if (playbackStatus)
    return;
  simulationT = parseInt($("#time-text").val());
  $("#time-slider").val(simulationT);
  updatePlayback();
}

function moveSimulation(point)
{
  if (dimension == 1)
  {
    point = dataToDisplay({ x: simulationT, y: point.x });
  }
  else if (dimension == 2)
  {
    point = dataToDisplay(point);
  }
  else if (dimension == 4)
  {
    point = dataToDisplay({ x: simulationT, y: 0.5 });
  }
  simulationPoint.css({left: graph.offset().left - simulationPoint.width()/2 + point.x,
                      top: graph.offset().top - simulationPoint.height()/2 + point.y,
                      position:'absolute'});
}

function updatePlayback()
{
  if (playbackStatus)
  {
    var millsElapsed = Date.now() - simulationStartTime;
    simulationT = Math.trunc(/*points.at(0).timestamp +*/ millsElapsed/millsPerTick);
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
    simulationT = 0;//points.at(0).timestamp; // reset loop
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

function getExportString()
{
  var keyword = $("#export-name").val();

  var string = '[\n';
  for (var i = 0; i < points.length; ++i)
  {
    string += '  { "timestamp": ' + parseInt(points[i].timestamp) + ', "'+ keyword +'": { "x":' + roundDecimals(points[i].point.x, 3);
                                              if (dimension > 1)     string +=  ', "y":' + roundDecimals(points[i].point.y, 3);
                                              if (dimension > 2)  {  string +=  ', "z":' + roundDecimals(points[i].point.z, 3) +
                                                                                ', "a":' + roundDecimals(points[i].point.a, 3); }
    string += ' }, '
    string +=                                                      '"'+ keyword +'_t" : { "x":' + roundDecimals(points[i].tangent.x, 3);
                                              if (dimension > 1)     string +=  ', "y":' + roundDecimals(points[i].tangent.y, 3);
                                              if (dimension > 2)  {  string +=  ', "z":' + roundDecimals(points[i].tangent.z, 3) +
                                                                                ', "a":' + roundDecimals(points[i].tangent.a, 3); }
    string += ' }}'
    if (i+1 < points.length)
      string += ',\n';
    else
      string += '\n';
  }
  string+=']';
  return string;
}
function getLuaExportString()
{
  var keyword = $("#export-name").val();

  var string = '{\n';
  for (var i = 0; i < points.length; ++i)
  {
    if (dimension == 1)
      string += '  { timestamp=' + parseInt(points[i].timestamp) + ', '+ keyword +' = ' + roundDecimals(points[i].point.x, 3) + " ";
    if (dimension == 2)
      string += '  { timestamp=' + parseInt(points[i].timestamp) + ', '+ keyword +' = {' + roundDecimals(points[i].point.x, 3) + ', ' + roundDecimals(points[i].point.y, 3) + '}';
    if (dimension > 2)
      string += '  { timestamp=' + parseInt(points[i].timestamp) + ', '+ keyword +' = { r=' + roundDecimals(points[i].point.x, 3) + ', g=' + roundDecimals(points[i].point.y, 3)+ ', b=' + roundDecimals(points[i].point.z, 3) + ', a=' + roundDecimals(points[i].point.a, 3) + '}';

    if (points[i].tangent.x != 0 ||
        (dimension > 1 && points[i].tangent.y != 0) ||
        (dimension > 2 && points[i].tangent.z != 0) ||
        (dimension > 2 && points[i].tangent.a != 0))
    {
      if (dimension == 1)
        string += ', '+ keyword + '_t = ' + points[i].tangent.x + " ";
      if (dimension == 2)
        string += ', '+ keyword +'_t = {' + roundDecimals(points[i].tangent.x, 3) + ', ' + roundDecimals(points[i].tangent.y, 3) + '}';
      if (dimension > 2)
        string += ', '+ keyword +'_t = { r=' + roundDecimals(points[i].tangent.x, 3) + ', g=' + roundDecimals(points[i].tangent.y, 3) + ', b=' + roundDecimals(points[i].tangent.z, 3) + ', a=' + roundDecimals(points[i].tangent.a, 3) + '}';
    }
    string += ' }';
    if (i+1 < points.length)
      string += ',\n';
    else
      string += '\n';
  }
  string+='}';
  return string;
}

function downloadString() {

  const a = document.createElement('a') // Create "a" element
  const blob = new Blob([getExportString()], {type: "text/plain"}) // Create a blob (file-like object)
  const url = URL.createObjectURL(blob) // Create an object URL from blob
  a.setAttribute('href', url) // Set "a" element link
  a.setAttribute('download', "factorio-graph.txt") // Set download filename
  a.click() // Start downloading
  a.remove();
}

function exportString()
{
  $("#iostring").val(getExportString());
}

function exportLua()
{
  $("#iostring").val(getLuaExportString());
}

function importString()
{
  clearPoints();
  var keyword = $("#export-name").val();
  var keywordTan = keyword + "_t";

  var string = $("#iostring").val();
  var inputTree = jQuery.parseJSON(string);
  for (var i = 0; i < inputTree.length; i++) {
    addPoint();
    var newie = points[points.length - 1];
    if (typeof inputTree[i][keyword] !== 'undefined') {
      if (typeof inputTree[i][keyword].x !== 'undefined') newie.point.x = parseFloat(inputTree[i][keyword].x);
      if (typeof inputTree[i][keyword].y !== 'undefined') newie.point.y = parseFloat(inputTree[i][keyword].y);
      if (typeof inputTree[i][keyword].z !== 'undefined') newie.point.z = parseFloat(inputTree[i][keyword].z);
      if (typeof inputTree[i][keyword].a !== 'undefined') newie.point.a = parseFloat(inputTree[i][keyword].a);
    }
    if (typeof inputTree[i][keywordTan] !== 'undefined') {
      if (typeof inputTree[i][keywordTan].x !== 'undefined') newie.tangent.x = parseFloat(inputTree[i][keywordTan].x);
      if (typeof inputTree[i][keywordTan].y !== 'undefined') newie.tangent.y = parseFloat(inputTree[i][keywordTan].y);
      if (typeof inputTree[i][keywordTan].z !== 'undefined') newie.tangent.z = parseFloat(inputTree[i][keywordTan].z);
      if (typeof inputTree[i][keywordTan].a !== 'undefined') newie.tangent.a = parseFloat(inputTree[i][keywordTan].a);
    }
    if (typeof inputTree[i].timestamp !== 'undefined')
      newie.timestamp = parseFloat(inputTree[i].timestamp);
    refreshPointEntry(newie, false, true);
  }

  if (points.length == 0)
    addPoint();
}

function bezier1D(A, At, B, Bt, C, Ct, t)
{
  return {x: ((A.x + B.x) * 0.5) * (1-t) + ((B.x + C.x) * 0.5) * t};
}

function bezier( A, B, C, D, t )
{
	var mt = 1 - t;
  if (dimension == 1)
  {
    return {x: A.x * mt + B.x * mt*mt + C.x * t + D.x *t*t,
            y: A.y * mt + B.y * mt*mt + C.y * t + D.y *t*t,
            z: A.z * mt + B.z * mt*mt + C.z * t + D.z *t*t,
            a: A.a * mt + B.a * mt*mt + C.a * t + D.a *t*t};
  }

  var projB = {};
  var projD = {};
  projB.x = A.x + B.x;
  projB.y = A.y + B.y;
  projB.z = A.z + B.z;
  projB.a = A.a + B.a;

  projD.x = C.x - D.x;
  projD.y = C.y - D.y;
  projD.z = C.z - D.z;
  projD.a = C.a - D.a;

	var x = A.x * mt * mt * mt + projB.x * 3 * mt * mt * t + projD.x * 3 * mt * t * t + C.x * t * t * t;
	var y = A.y * mt * mt * mt + projB.y * 3 * mt * mt * t + projD.y * 3 * mt * t * t + C.y * t * t * t;
	var z = A.z * mt * mt * mt + projB.z * 3 * mt * mt * t + projD.z * 3 * mt * t * t + C.z * t * t * t;
	var a = A.a * mt * mt * mt + projB.a * 3 * mt * mt * t + projD.a * 3 * mt * t * t + C.a * t * t * t;
	return {x, y, z, a};
}

// function paintBezier1D(ctx, pt1, pt2, pt3)
// {
// 	ctx.beginPath();
// 	var delta = dimension == 4 ? 0.01 : 0.05;
//   for (let x = delta; true; x += delta)
//   {
//     var last = false;
// 		if (x > 1)
// 		{
// 			last = true;
// 			x = 1;
// 		}
// 		var prev = bezier1D(pt1.point,pt1.tangent,pt2.point,pt2.tangent,pt3.point,pt3.tangent,x - delta);
// 		var post = bezier1D(pt1.point,pt1.tangent,pt2.point,pt2.tangent,pt3.point,pt3.tangent,x);
//     var mid12time = 0.5*(pt1.timestamp + pt2.timestamp);
//     var mid23time = 0.5*(pt2.timestamp + pt3.timestamp);
//     var t1 = mid12time + (mid23time - mid12time) * (x - delta);
//     var t2 = mid12time + (mid23time - mid12time) * x;
//     prev = dataToDisplay({x: t1, y: prev.x});
//     post = dataToDisplay({x: t2, y: post.x});
//     ctx.moveTo(prev.x, prev.y);
//     ctx.lineTo(post.x, post.y);
// 		if (last)
// 			break;
//   }
//   ctx.strokeStyle = "#ffaaff";
//   ctx.lineWidth = 2;
//   ctx.stroke();
// }

function paintBezier(ctx,pt1,pt2)
{
  var descendingD1 = [];
	ctx.beginPath();
	var delta = dimension == 4 ? 0.01 : 0.05;
	for (let x = delta; true; x += delta)
	{
		var last = false;
		if (x > 1)
		{
			last = true;
			x = 1;
		}
		var prev = bezier(pt1.point,pt1.tangent,pt2.point,pt2.tangent,x - delta);
		var post = bezier(pt1.point,pt1.tangent,pt2.point,pt2.tangent,x);
    if (dimension == 1)
    {
      var t1 = pt1.timestamp + (pt2.timestamp-pt1.timestamp) * (x - delta);
      var t2 = pt1.timestamp + (pt2.timestamp-pt1.timestamp) * x;
      if (prev.x > post.x)
        descendingD1.push(dataToDisplay({x: t1, y: prev.x}), dataToDisplay({x: t2, y: post.x}));
      prev = dataToDisplay({x: t1, y: prev.x});
      post = dataToDisplay({x: t2, y: post.x});
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(post.x, post.y);
    }
    else if (dimension == 2)
    {
      prev = dataToDisplay(prev);
      post = dataToDisplay(post);
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(post.x, post.y);
    }
    else if (dimension == 4)
    {
      var t1 = pt1.timestamp + (pt2.timestamp-pt1.timestamp) * (x - delta);
      var t2 = pt1.timestamp + (pt2.timestamp-pt1.timestamp) * x;
      var ptprev = dataToDisplay({x: t1, y: 0});
      var ptpost = dataToDisplay({x: t2, y: 1});
      ctx.fillStyle = "rgba(" + prev.x + "," + prev.y + "," + prev.z + "," + prev.a + ")";
      ctx.globalAlpha = (prev.a / 255.0);
      ctx.fillRect(ptprev.x, ptprev.y, ptpost.x - ptprev.x + 1, ptpost.y - ptprev.y);
      ctx.globalAlpha = 1.0;
    }
		if (last)
			break;
	}
  if (dimension < 4)
  {
    ctx.strokeStyle = "#ffaaff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (descendingD1.length > 0)
  {
    ctx.beginPath();
    for (var i = 1; i < descendingD1.length; i+=2)
    {
      ctx.moveTo(descendingD1[i-1].x, descendingD1[i-1].y);
      ctx.lineTo(descendingD1[i].x, descendingD1[i].y);
    }
    ctx.strokeStyle = "#ff5555";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function paintControl(ctx,entry,color)
{
	ctx.beginPath();
	ctx.lineWidth = 3;
  var ptA;
  var ptB;
  if (dimension == 1)
  {
    ptA = dataToDisplay({ x: entry.timestamp, y: entry.point.x });
    ptB = dataToDisplay({ x: entry.timestamp, y: entry.point.x + entry.tangent.x });
  }
  else if (dimension == 2)
  {
    var A = entry.point;
    var B = entry.tangent;
    ptA = dataToDisplay({ x: (A.x - B.x), y: (A.y - B.y) });
    ptB = dataToDisplay({ x: (A.x + B.x), y: (A.y + B.y) });
  }
  else if (dimension == 4)
  {
    ptA = dataToDisplay({ x: entry.timestamp, y: 0 });
    ptB = dataToDisplay({ x: entry.timestamp, y: 1 });
  }
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
  if (dimension != 4)
  {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 800, 800);
  }
  else
  {
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, 0, 800, 800);
    ctx.fillStyle = "#888888";
    var size = 20;
    var row = 800/size;
    var col = 800/size;
    for (var i = 0; i < row; ++i)
      for (var j = i%2; j < col; j += 2)
        ctx.fillRect(j * size, i * size, size, size);
  }

  var xmin = dataArea.x.min < dataArea.x.max ? dataArea.x.min : dataArea.x.max;
  var xmax = dataArea.x.min > dataArea.x.max ? dataArea.x.min : dataArea.x.max;
  var xdelta = 1;
  var xinterval = xmax - xmin;
  while (xinterval/xdelta > 20)
    xdelta *= 10;
  if (xdelta >= 10)
    paintGridLinesX(ctx, 1, "#555555", xmin, xmax, xdelta/10);
  paintGridLinesX(ctx, 1, "white", xmin, xmax, xdelta);
  paintGridLabelX(ctx, "white", "1em Arial", xmin, xmax, xdelta)

  var ymin = dataArea.y.min < dataArea.y.max ? dataArea.y.min : dataArea.y.max;
  var ymax = dataArea.y.min > dataArea.y.max ? dataArea.y.min : dataArea.y.max;
  var ydelta = 1;
  var yinterval = ymax - ymin;
  while (yinterval/ydelta > 20)
    ydelta *= 10;
  if (ydelta >= 10)
    paintGridLinesY(ctx, 1, "#555555", ymin, ymax, ydelta/10);
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
    paintBezier(ctx, points.at(i-1), points.at(i));
  for (var i = 0; i < points.length; ++i)
    paintControl(ctx, points.at(i), point_colors[i % point_colors.length]);
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