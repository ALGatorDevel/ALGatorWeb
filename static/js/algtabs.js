function addTabPane(paneID) {
  const paneContent = `
    <div class="fixed-tab" id="fixedtabContainer_${paneID}"></div>
    <div class="tab-marker left" id="markerLeft_${paneID}" title="Scroll left" aria-hidden="false">&#8249;</div>
    <div class="tab-container" id="tabContainer_${paneID}"></div>
    <div class="tab-marker right" id="markerRight_${paneID}" title="Scroll right" aria-hidden="false">&#8250;</div-->
  `;
  const paneWrapper = document.getElementById("tabwrapper_" + paneID);
  if (paneWrapper) paneWrapper.innerHTML = paneContent;
}
                                                // where to add:
                                                // 0  ... default (at end), 
                                                // 1: at begining ("Add new" tab)
                                                // -1 ... as pen-ultimate element (left to the last element)
function addTab(paneID, tabID, title, callback, possition=0) {
  const span = document.createElement('span');
  span.className = 'tab'; 
  span.dataset.tabid = paneID; // attribute data-tabid=paneID
  span.id = `tab-${paneID}_${tabID}`;
  span.innerHTML = title || ('Tab_' + tabID);
  span.onclick = () => {
    if (callback) callback(paneID, tabID); else selectTab(paneID, tabID);
  };

  var containerID = 'tabContainer_';
  // for first tab (tab on fixed, non-scrollable panel) change some properties
  if (possition==1) {
    containerID = 'fixedtabContainer_';
    span.className += "-new"
  }
  const tabs = document.getElementById(containerID + paneID);
  if (possition >= 0)
    tabs.appendChild(span); // insert at the end
  else 
    tabs.insertBefore(span, tabs.lastElementChild);  // pen-ultimum insert: left to the last element 
  return span;
}

function removeTab(paneID, tabID) {
  const fixedContainer = document.getElementById('fixedtabContainer_' + paneID);
  const scrollContainer = document.getElementById('tabContainer_' + paneID);

  const tabEl = document.getElementById(`tab-${paneID}_${tabID}`);
  if (!tabEl) return -1; // tab not found

  const parent = tabEl.parentElement;
  if (!(parent === fixedContainer || parent === scrollContainer)) return -1;

  const index = Array.from(parent.children).indexOf(tabEl);

  parent.removeChild(tabEl);

  if (tabEl.classList.contains('selected')) {
    const newSelected = parent.children[index - 1] || parent.children[0];
    if (newSelected) {
      const newTabID = newSelected.id.split('_')[1]; // extract tabID from id like 'tab-<paneID>_<tabID>'
      return newTabID;
    }
  } else {
    updateMarkers(paneID);
  }

  return "";
}


function selectTab(paneID, tabID) {
  const tabs = document.getElementById('tabContainer_' + paneID);
  tabs.querySelectorAll(`.tab[data-tabid="${paneID}"]`).forEach(t => t.classList.remove('selected'));

  const tabEl = document.getElementById(`tab-${paneID}_${tabID}`);
  if (tabEl) {
    tabEl.classList.add('selected');
    tabEl.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
  }
  updateMarkers(paneID);
}

function changeTabTitle(paneID, tabID, newTitle) {
  const tabEl = document.getElementById(`tab-${paneID}_${tabID}`);
  if (tabEl) {
    tabEl.textContent = newTitle;
  }  
}

function recolorTab(paneID, tabID, newColor) {
  const tabEl = document.getElementById(`tab-${paneID}_${tabID}`);
  if (tabEl) {
    tabEl.style.color=newColor;
  }
}

function updateMarkers(paneID) {
  const tabs        = document.getElementById('tabContainer_' + paneID);
  const leftMarker  = document.getElementById('markerLeft_'   + paneID);
  const rightMarker = document.getElementById('markerRight_'  + paneID);

  if (!(tabs && leftMarker && rightMarker)) return;

  // small tolerance to ignore micro rounding
  const tol = 2;
  const scrollLeft = tabs.scrollLeft;
  const maxScrollLeft = tabs.scrollWidth - tabs.clientWidth;
  const canScroll = tabs.scrollWidth > tabs.clientWidth + tol;
 
  leftMarker.style.opacity = (scrollLeft > tol) ? '1' : '0';
  rightMarker.style.opacity = (maxScrollLeft - scrollLeft > tol) ? '1' : '0';
}


function scrollTab(tabs, direction) {
  tabs.scrollBy({ left: direction*Math.max(80, Math.round(tabs.clientWidth * 0.4)), behavior: 'smooth' });
}

function wireTabs(paneID) {
  const tabs        = document.getElementById('tabContainer_' + paneID);
  const leftMarker  = document.getElementById('markerLeft_'   + paneID);
  const rightMarker = document.getElementById('markerRight_'  + paneID);

  if (!(tabs && leftMarker && rightMarker)) return;

  tabs.addEventListener  ('scroll', () => updateMarkers(paneID));
  window.addEventListener('resize', () => updateMarkers(paneID));

  //const mo = new MutationObserver(() => updateMarkers(paneID));
  //mo.observe(tabs, { childList: true, subtree: false });

  updateMarkers(paneID);

  //make markers clickable to scroll a bit (optional, user-friendly) 
  leftMarker.addEventListener ('click', () => {scrollTab(tabs, -1)});
  rightMarker.addEventListener('click', () => {scrollTab(tabs, 1)});
}

