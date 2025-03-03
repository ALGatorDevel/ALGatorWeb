
$(document).ready(function() {
    makeDraggable();
    
    $('#checkbox').click(function(){
        makeDraggable();
    });
});

function makeDraggable() {
    if($.isFunction($.fn.draggable)) {
        $('.draggable').each(function() {
            var $this = $(this);
            if ($this.data('ui-draggable') || $this.data('draggable')) {
                $this.draggable('destroy');
            }
        });
    }

    if(isEditMode){
        $('.draggable').draggable({
            revert: "invalid",
            start: function(event, ui) {
                var draggedElement = $(this); 
                draggedElement.css('opacity', 0.5);
        
                var draggedRow = draggedElement.closest('.w3-row');
                var presenter = draggedElement.data('presenter-name');
        
                var container = $('.' + draggedElement.data('presenter-name'));
                var rows = container.find('.w3-row');
                var lastRow = rows.last();
                rows.each(function(index) {
                    var currentRow = $(this); 
                    // v vrstico iz katere smo vzeli stolpec ne dodamo nov stolpec
                    if (!currentRow.is(draggedRow)) {
                        addDropableCol(currentRow, presenter); 
                        updateColClassesAndIds(currentRow, presenter);
                    }
                });
                if (draggedRow.is(lastRow)) {
                    if(draggedRow.find('.w3-col').length != 1)
                        addNewRow(presenter);
                }
                else{
                    addNewRow(presenter);
                }
    
        
            },
            stop: function(event, ui) {
                $(this).css('opacity', 1); 
                var closestPresenter = $(this).closest("[data-presenter-name]"); 
                removeColsWithoutIconsContainer(closestPresenter.data('presenter-name'))
            },
            zIndex: 10000
        });
    
        initializeDroppables('.drop-target');
    }
}

function swapElements($elem1, $elem2) {
    var temp = $('<div>');
    $elem1.before(temp);
    $elem2.before($elem1);
    temp.before($elem2).remove();
}


function findRowAndCell(element) {
    var rowElement = element.closest('.w3-row');
    var cellElement = element.closest('.w3-col');

    if (rowElement && cellElement) {
        var cellIndex = cellElement.index();
        var rowIndex = rowElement.index();

        return {
            rowIndex: rowIndex,
            cellIndex: cellIndex
        };
    }

    return null;
}

function getNewLayout(presenter){
    var newLayout = [[]];
    var row = 0;
    $('.' + presenter).find('div[id*="' + presenter + '"]').each(function() {

        var divId = $(this).attr('id');
        let divOK = false; AView.registeredViews.forEach(function(rv){if (divId.includes(rv)) divOK = true});
        if (divOK) {
            var position = findRowAndCell($(this));
            if (position.rowIndex != newLayout.length-1) {
                newLayout.push([]);
                newLayout[position.rowIndex][position.cellIndex] = divId.split('_').slice(2, 4).join('_');
                row += 1;
            } else {
                newLayout[position.rowIndex][position.cellIndex] = divId.split('_').slice(2, 4).join('_');
            }
        }
    });
    return newLayout;
}

function addNewRow(presenter) {
    var container = $('.' + presenter);
    var lastRow = container.find('.w3-row').last();
    var lastCol = lastRow.find('.w3-col');

    // Check if the last row has only one column and this column does not have 'icons-container'
    var shouldAddRow = lastCol.length !== 1 || lastCol.find('.icons-container').length !== 0;

    if (shouldAddRow) {
        var newRow = $('<div>').addClass('w3-row');
        var newCol = $('<div>').addClass('w3-col s12');
        var dropTarget = $('<div>').addClass('drop-target presenterBox').attr('data-presenter-name', presenter).css('margin', '10px');
        var draggable = $('<div>').addClass('draggable').attr('data-presenter-name', presenter);
        var presenterBox = $('<div>').addClass('');

        draggable.append(presenterBox);
        dropTarget.append(draggable);
        newCol.append(dropTarget);
        newRow.append(newCol);

        container.append(newRow);
        initializeDroppables(container.find('.w3-row').last().find('.drop-target'));
    }
}

// Dodamo stolpec v katerega lahko spustimo layout cell
function addDropableCol(row, presenter){

    var newCol = $('<div>').addClass('w3-col');
    var dropTarget = $('<div>').addClass('drop-target presenterBox').attr('data-presenter-name', presenter).css('margin', '10px');
    var draggable = $('<div>').addClass('draggable').attr('data-presenter-name', presenter);
    var presenterBox = $('<div>').addClass('');

    draggable.append(presenterBox);
    dropTarget.append(draggable);
    newCol.append(dropTarget);
    row.append(newCol);
    initializeDroppables(row.find('.drop-target').last());
    
}

// popravimo sirino stolpcev in njihove id-je
function updateColClassesAndIds(row, presenter) {
    var colElements = row.find('.w3-col');
    var numberCol = colElements.length;
    var newClass = 'w3-col s' + (12 / numberCol).toFixed(0);
    colElements.each(function(index) {
        var cellIndex = index;
        $(this).removeClass().removeAttr('id');
        $(this).addClass(newClass);
        $(this).attr('id', presenter + '_' + (row.index()+1) + '_' + (cellIndex+1));
    });
}


function initializeDroppables(selector) {
    $(selector).droppable({
        accept: ".draggable",
        over: function(event, ui) {
            var target = $(this);
            var draggable = ui.draggable;
    
            if (draggable.data('presenter-name') === target.data('presenter-name')) {
                target.addClass('dropHover'); 
            }
        },
        out: function(event, ui) {
            $(this).removeClass('dropHover');
        },
        drop: function(event, ui) {
            var droppedItem = ui.draggable;
            var originalDropTarget = droppedItem.parent();
            var target = $(this);
            
            if (originalDropTarget.hasClass('drop-target') && droppedItem.data('presenter-name') === target.data('presenter-name')) {
                target.removeClass('dropHover');
                target.append(droppedItem);
                originalDropTarget.append(target.children('.draggable').first());
                
                var presenter = droppedItem.data('presenter-name');
                removeColsWithoutIconsContainer(presenter)
                var newLayout = getNewLayout(presenter);

                // change names of outer divs so they correspond to their (new) content
                let name1 = target[0].parentNode.getAttribute('name');
                let name2 = originalDropTarget[0].parentNode.getAttribute('name');
                target[0].parentNode.setAttribute('name',name2);
                originalDropTarget[0].parentNode.setAttribute('name',name1);


                let pJSON = pp.presenterJSONs.get(presenter);
                pJSON.Layout = newLayout;
                updatePresenterLayout(pJSON, presenter);
            }
    
            droppedItem.css({
                top: '0px',
                left: '0px'
            });
        }
    });
}

async function updatePresenterLayout(presenterDataJSON, presenter){

    return new Promise((resolve, reject) => {
        var param = {
            csrfmiddlewaretoken: window.CSRF_TOKEN, 
            q: `alter {"Action":"SavePresenter", "ProjectName":"${projectName}", "PresenterName":"${presenter}",  "PresenterData":${JSON.stringify(presenterDataJSON)}}`
        };
        $.post(url, param, function(response) {
            var answer = response.answer; //!response->answer
    
            if(answer.includes('"Status":0')) {
                let data = presenterData.get(presenter);
                populatePresenterDiv(data, presenterDataJSON);
                repaintViews();
            } else
                console.log("Napaka pri alter storitvi!")

            resolve();
        }).fail(reject);

    });
}

// ce stolpec nima vsebine ga odstranimo, enako velja za vrstico
function removeColsWithoutIconsContainer(presenter) {

    $('.' + presenter).each(function() {
        $(this).find('.w3-row').each(function() {
            $(this).find('.w3-col').each(function() {
                var hasNoIconsContainer = $(this).find('.icons-container').length === 0;
                
                if (hasNoIconsContainer) {
                    $(this).remove();
                }
            });

            if ($(this).find('.w3-col').length === 0) {
                $(this).remove();
            } else {
                updateColClassesAndIds($(this), presenter);
            }
        });
    });
}

function  removeColWithId(presenter, view) {
    $(`div[name="${presenter}_${view}_outer"]`).remove() ;
    $('.' + presenter).each(function() {
        $(this).find('.w3-row').each(function() {
            if ($(this).find('.w3-col').length === 0) {
                $(this).remove();
            } else {
                updateColClassesAndIds($(this), presenter);
            }
        });
    });
    repaintViews();
}


function replaceStringInArray(arr, searchString, replacementString) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr[i].length; j++) {
        if (arr[i][j] === searchString) {
          arr[i][j] = replacementString;
        }
      }
    }
    return arr;
  }


  
function updateColIds(presenterName) {
    var container = $('.' + presenterName);

    container.find('.w3-row').each(function() {
        var row = $(this);
        var colElements = row.find('.w3-col');

        colElements.each(function(index) {
            var cellIndex = index + 1; 
            var newId = presenterName + '_' + (row.index() + 1) + '_' + cellIndex;
            $(this).attr('id', newId);
        });
    });

}