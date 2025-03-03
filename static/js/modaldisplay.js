// open modal dialog with a question
function openDialog(question, checker, inputElement=undefined) {
    return new Promise((resolve) => {
        // Create modal elements
        const modal = document.createElement('div');
        const dialog = document.createElement('div');
        const questionText = document.createElement('p');
        const buttonContainer = document.createElement('div');
        const okButton = document.createElement('button');
        const cancelButton = document.createElement('button');

        // Style modal (basic styles)
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '1000';

        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        dialog.style.minWidth = '300px';

        questionText.textContent = question;
        questionText.style.marginBottom = '10px';

        if (!inputElement) {
          inputElement = document.createElement('input');
          inputElement.type = 'text';
          inputElement.style.width = '100%';
          inputElement.style.marginBottom = '10px';
        }

        const okClicked = () => {
            resolve(inputElement.value);
            document.body.removeChild(modal);
        };
        const cancelClicked = () => {
            resolve(null);
            document.body.removeChild(modal);
        }

        inputElement.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            okClicked();
          } else if (event.key === "Escape") {
            cancelClicked();
          } 
        });


        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '10px';

        okButton.textContent = 'OK';
        okButton.style.padding = '5px 10px';
        okButton.style.minWidth = "80px";

        cancelButton.textContent = 'Cancel';
        cancelButton.style.padding = '5px 10px';
        cancelButton.style.minWidth = "80px";

        // Append elements
        buttonContainer.appendChild(okButton);
        buttonContainer.appendChild(cancelButton);
        dialog.appendChild(questionText);
        dialog.appendChild(inputElement);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        inputElement.addEventListener('keypress', checker);  

        // Button click handlers
        okButton.addEventListener('click', okClicked);

        cancelButton.addEventListener('click', cancelClicked);

        inputElement.focus();
    });
}





// Function to open the modal and display the string content as plain text
// two types of display: 0 ... text, 1 ... html 
    function showModalDisplay(title, content, type=0) {
        const modalTemplate = document.getElementById("modal-template");
        const modal = modalTemplate.cloneNode(true); // Clone the modal template

        // Add the 'modal' class to the cloned element to apply the modal styles
        modal.classList.add("modal");

        modal.style.display = "flex"; // Make the modal visible

        // Insert content into the modal body as plain text
        const modalBody = modal.querySelector("#modal-body");

        if (type == 0) {
          // Ensure the content is treated as plain text, not HTML
          modalBody.textContent = content;  // Use textContent to prevent HTML interpretation
        } else if (type==1) {
          modalBody.innerHTML = content;  
        }

        // Insert a title (optional, can be customized as needed)
        const modalTitle = modal.querySelector("#modal-title");
        modalTitle.textContent = title; // Customize the title here

        // Append the modal to the body
        document.body.appendChild(modal);

        // Close the modal when the close button is clicked
        const closeButton = modal.querySelector("#close-btn");
        closeButton.onclick = function() {
            modal.remove(); // Remove the modal from the DOM
        }

        // Close the modal if the user clicks outside of the modal content
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.remove(); // Remove the modal from the DOM
            }
        }

        window.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') { // If the ESC key is pressed
                modal.remove(); // Remove the modal from the DOM
            }
        });

        return modalBody;
    }