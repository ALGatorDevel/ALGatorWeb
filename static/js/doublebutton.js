document.addEventListener('click', function(event) {
  if (!event.target.classList.contains('button-lr'))
    closeAllDropdowns();
});

function closeAllDropdowns() {
  document.querySelectorAll('.db-dropdown-menu')?.forEach(dd => dd.style.display = 'none');
}

function disableButton(id) {
  document.getElementById(id).setAttribute('disabled', '');
}


/////////////  Double button with dropdown menu ////////////////////////////
function getDoubleButtonWithMenu(id, title, actions, disabable=false, disableOnClick=false) {
  let menuButton = `<button class="button-lr ${disabable ? "button-lr-dis" : ""} hc" ${disabable ? "disabled" : ""} onclick="toggleDBDropdown('${id}')" style="font-size:8px;">&#9660;</button>`;

  let doc = disableOnClick ? `disableButton('db-${id}');` : "";

  let button= `	
  <div id="db-${id}" class="double-button-wrapper">
    <div class="double-button" id="${id}_stsBtn">
        <button class="button-lr ${disabable ? "button-lr-dis" : ""}"    ${disabable ? "disabled" : ""} onclick="${doc} closeAllDropdowns(); ${actions[0][1]}('${actions[0][2]}', '${actions[0][3]}')">${title}</button>
        ${actions.length > 1 ? menuButton : ""}
    </div>
    <div class="db-dropdown-menu" id="dropdown_${id}">
  `;

  actions.forEach(act => {
    if (act.length > 1)
      button += `<a href="#" onclick="${doc} closeAllDropdowns(); ${act[1]}('${act[2]}', '${act[3]}');">${act[0]}</a>`;
  });

  button += `
    </div>
  </div>
  `;	
  return button;
}

function toggleDBDropdown(dropdown_id) {
  let db_dropdown = document.getElementById(`dropdown_${dropdown_id}`);
  let isVisible = db_dropdown.style.display === 'block';
  closeAllDropdowns();
  db_dropdown.style.display =  isVisible ? 'none' : 'block';
}
