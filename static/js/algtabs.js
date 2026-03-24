function addTabPane(paneID) {
  const paneContent = `
    <div class="tab-fixed" id="fixedtabContainer_${paneID}"></div>

    <div class="tab-scroll-wrapper">
      <div class="tab-marker left" id="markerLeft_${paneID}">&#8249;</div>
      <div class="tab-container" id="tabContainer_${paneID}"></div>
      <div class="tab-marker right" id="markerRight_${paneID}">&#8250;</div>
    </div>

    <div class="tab-dropdown" id="dropdown_${paneID}">&#9662;</div>
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

  updateDropdownVisibility(paneID);

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
  updateDropdownVisibility(paneID);

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

  const dropdown = document.getElementById('dropdown_' + paneID);
  if (dropdown) {
    dropdown.addEventListener('click', () => showTabDropdown(paneID));
}
}

function showTabDropdown(paneID) {
  const tabs = document.querySelectorAll(`#tabContainer_${paneID} .tab`);
  
  const menu = document.createElement("div");
  menu.className = "tab-dropdown-menu";

  // --- SEARCH BOX
  const search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Search tabs...";
  search.className = "tab-dropdown-search";
  menu.appendChild(search);

  // --- ITEMS CONTAINER
  const list = document.createElement("div");
  list.className = "tab-dropdown-list";
  menu.appendChild(list);

  // --- CREATE ITEMS
  const items = [];
  tabs.forEach(t => {
    const item = document.createElement("div");
    item.textContent = t.textContent;
    item.dataset.tabid = t.id.split('_')[1];

    item.onclick = () => {
      //selectTab(paneID, item.dataset.tabid);
      t.click();
      menu.remove();
    };

    list.appendChild(item);
    items.push(item);
  });

  // --- FILTER LOGIC
  search.addEventListener("input", () => {
    const q = search.value.toLowerCase();

    items.forEach(item => {
      const match = item.textContent.toLowerCase().includes(q);
      item.style.display = match ? "" : "none";
    });
  });

  document.body.appendChild(menu);

  // --- POSITIONING (same as before)
  const btn = document.getElementById("dropdown_" + paneID);
  const rect = btn.getBoundingClientRect();

  let left = rect.left;
  let top  = rect.bottom;

  const menuRect = menu.getBoundingClientRect();

  if (left + menuRect.width > window.innerWidth) {
    left = window.innerWidth - menuRect.width - 4;
  }
  if (left < 4) left = 4;

  menu.style.position = "absolute";
  menu.style.left = left + "px";
  menu.style.top = top + "px";

  // --- CLOSE ON OUTSIDE CLICK
  setTimeout(() => {
    function close(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", close);
      }
    }
    document.addEventListener("click", close);
  }, 0);

  // focus input immediately
  search.focus();
}

function updateDropdownVisibility(paneID) {
  const tabs = document.querySelectorAll(`#tabContainer_${paneID} .tab`);
  const dropdown = document.getElementById("dropdown_" + paneID);

  if (!dropdown) return;

  dropdown.style.display = (tabs.length >= 2) ? "flex" : "none";
}

