
document.addEventListener("DOMContentLoaded", function() {
  setEditCheckBox();
}); 

function setEditCheckBox() {
    var editCB = document.getElementById('isEditCheckbox');
    if( editCB != null) editCB.checked = isEditMode;
    enableEditMode(isEditMode);
} 

function toggleEditModeBoolean(){
    isEditMode = !isEditMode;
    enableEditMode(isEditMode);
    makeDraggable();
}


flexEditButtons = new Set();
flexEditButtons.add("navBarElNewPresenter");

function enableEditMode(isEditMode){
    var slimElements = document.querySelectorAll('.editMode');

    slimElements.forEach(function(element) {
        if (isEditMode) {
            if (flexEditButtons.has(element.id))
              element.style.display = 'flex'; 
            else
              element.style.display = 'block'; 
        } else {
            element.style.display = 'none'; 
        }
    });
}

