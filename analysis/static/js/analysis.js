alert("Nalagam");

class Okna {
  constructor() {}

  function getDIV(id) {
    return "bla";/* `<div   id="${id}"       class="mbox" style="top:40px; left:40px;">
               <div id="${id}Header" class="mboxheader">Click here to move - 4 </div>
               <div>Div 4 content</div>
             </div>"`;*/
  }

  function addWindow(id) {
    alert(getDIV(id));
  }
}

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "Header")) {
    document.getElementById(elmnt.id + "Header").onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY; 
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top  = Math.max(0,(elmnt.offsetTop - pos2)) + "px";
    elmnt.style.left = Math.max(0,(elmnt.offsetLeft - pos1)) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}