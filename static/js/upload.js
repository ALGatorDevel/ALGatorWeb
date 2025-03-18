let filesList = new Map();

function getUploadComponet(componentID, key) {
  return `
    <div class="almostW">
    <div id="upload-panel-${componentID}" class="upload-panel sEdit" own='${key}' disabled style="position: relative;">
       <span style="text-align:center"><b>Upload: drag files here or click to browse</b></span>
       <ul style="text-align:left" id="file-list-${componentID}" class="upload-list"></ul>
    </div>
    <input id="file-input-${componentID}" type="file" multiple  style="display: none;">
    <button id="upload-button-${componentID}" class="upload-button xEdit" own='${key}' disabled>Upload Files</button>
    </div>
  `; 
}

function registerUploadPanel(componentID, context, uploadHandler) {
  let uploadPanel  = document.getElementById("upload-panel-"  + componentID);
  let fileInput    = document.getElementById("file-input-"    + componentID);
  let fileList     = document.getElementById("file-list-"     + componentID);
  let uploadButton = document.getElementById("upload-button-" + componentID);

  let files = [];
  filesList.set(componentID, files);

  // Handle drag-and-drop
  uploadPanel.addEventListener("dragover", (event) => {
      event.preventDefault();
      uploadPanel.classList.add("dragover");
  });
  uploadPanel.addEventListener("dragleave", () => {
      uploadPanel.classList.remove("dragover");
  });
  uploadPanel.addEventListener("drop", (event) => {
      event.preventDefault();
      uploadPanel.classList.remove("dragover");
      addFiles(componentID, event.dataTransfer.files);
  });

  uploadPanel.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => addFiles(componentID, fileInput.files));

  uploadButton.addEventListener("click", async function() {
    const response = await uploadFiles(files, context);
    if (typeof response === 'object'  && response.Status==0) {
      // tu bi moral še bolj natančno preveriti, če je bil res vse upload OK! Jaz kar 
      // predpostavim, da če je response.Status == O, potem je bilo vse OK
      files.forEach(file => uploadHandler(file));
      files.length = 0;
      fileList.innerHTML = "";
      uploadButton.disabled = true;
    } else if (response) showPopup(response.Message + " " + response.Answer);
  });
}

function updateUploadButtonState(componentID) {
  let button = document.getElementById("upload-button-" + componentID);
  if (button)
    button.disabled = filesList.get(componentID).length == 0;
}

function removeFileFromList(event, componentID,  no) {
  filesList.get(componentID).splice(no, 1);
  document.getElementById(`li-${componentID}-${no}`).remove();
  updateUploadButtonState(componentID);
  event.stopPropagation();
}

function removeAllFilesFromUploadList(componentID) {
  filesList.get(componentID).length=0;  
  document.getElementById("file-list-"+componentID).innerHTML = ""; 
  document.getElementById("upload-button-" + componentID).disable = true;
}


// Add files to the list
function addFiles(componentID, newFiles) {
  let fileList     = document.getElementById("file-list-"     + componentID);
  let uploadButton = document.getElementById("upload-button-" + componentID);

  let files = filesList.get(componentID);
  for (const file of newFiles) {
    if (!files.includes(file)) {
      files.push(file);
      let no = files.length-1;
      let liRemove = `<i class='fas fa-times icon' onclick='removeFileFromList(event, "${componentID}",  ${no})'></i>`;
      const listItem = document.createElement("li");
      listItem.id = `li-${componentID}-${no}`;
      listItem.innerHTML = `${file.name} (${(file.size / 1024).toFixed(2)} KB) ${liRemove} `;
      fileList.appendChild(listItem);
    }
  }
  uploadButton.disabled = files.length === 0;
}

async function uploadFiles(files, context) {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file, index) => {
         formData.append(`file${index}`, file); 
    });
    formData.append("ProjectName", projectName); 
    if (context) for (const [key, value] of context) {
      formData.append(key, value);
    }
    formData.append("uid", current_user_uid); 
 
    try {
       // const response = await fetch(ALGatorServerURL + "uploadmulti", {
        const response = await fetch("/projects/uploadmulti", {
            method: "POST",
            body: formData,
            headers: {
              "X-CSRFToken": window.CSRF_TOKEN, 
            },            
        });

        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            return {"Status":1, "Message":"Upload error", "Answer" : "Failed to upload files. Server responded with status: " + response.status};
        }
    } catch (error) {
        return {"Status":2, "Message":"Upload error", "Answer" : "Error uploading files: " + error.message};
    }
}