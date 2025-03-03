let messages = {

'testsets_common_files': `
  To access these files in test case generators, use the <span class="pre-text">commonResourcesPath</span> obtained by

  <pre style="background-color:lightgray">
    String commonResourcesPath  = getCommonResourcesPath (generatingParameters);<pre>
`,

'testset_files': `
  To access these files in test case generators, use the <span class="pre-text">testsetResourcesPath</span> obtained by

  <pre style="background-color:lightgray">
    String testsetResourcesPath  = getTestsetResourcesPath (generatingParameters);<pre>
`,

'project_jars': `
  The JAR files listed here are included in the <span class="pre-text">CLASSPATH</span> during both project compilation and execution, providing extended functionality throughout the build and runtime processes.
`,

'assigned_computers': 'Set this property to assign a computer family responsible for executing tasks (running algorithms) for this project. If the value is undefined, the most appropriate computer family will be assigned automatically.',

'indicators': `Enter a name of an existing indicator or create a new one. For example:

<pre>

  CMP+SWAP AS X1
  0.15*@N AS LIN1 
  0.01*@N*log(@N) AS LIN 
  floor(10*sin(@JavaSort.Tmin)) AS KN
<pr>

Supported operators and functions:

<pre>
  Addition: '2 + 2',        Subtraction: '2 - 2'
  Multiplication: '2 * 2',  Division: '2 / 2'
  Exponential: '2 ^ 2',     Modulo: '2 % 2'
  
  abs: absolute value
  acos: arc cosine
  asin: arc sine
  atan: arc tangent
  cbrt: cubic root
  ceil: nearest upper integer
  cos: cosine
  cosh: hyperbolic cosine
  exp: euler's number raised to the power (e^x)
  floor: nearest lower integer
  log: logarithmus naturalis (base e)
  log2: logarithm to base 2
  log10: logarithm to base 10
  sin: sine
  sinh: hyperbolic sine
  sqrt: square root
  tan: tangent
  tanh: hyperbolic tangent
  signum: signum of a value
</pre>
`
}


function infoButton(infoID, param1="", param2="") {
  return  `
    <img src="/static/images/info.png" width=18px onclick="showPopupMsg('${infoID}', '${param1}', '${param2}')">
  `;
}

function showPopupMsg(infoID, param1="", param2="") {
  let message = messages[infoID];
  message = message.replace(/__param1__/g, param1).replace(/__param2__/g, param2);
  return showInfoPopup(message);
}

function showInfoPopup(content) {
  // Create the popup elements
  const popupOverlay = document.createElement('div');
  const popupWindow = document.createElement('div');

  // Style the popup overlay
  popupOverlay.style.position = 'fixed';
  popupOverlay.style.top = 0;
  popupOverlay.style.left = 0;
  popupOverlay.style.width = '100%';
  popupOverlay.style.height = '100%';
  popupOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  popupOverlay.style.zIndex = 9999;

  // Style the popup window
  popupWindow.style.position = 'fixed';
  popupWindow.style.top = '50%';
  popupWindow.style.left = '50%';
  popupWindow.style.transform = 'translate(-50%, -50%)';
  popupWindow.style.padding = '20px';
  popupWindow.style.backgroundColor = '#fff';
  popupWindow.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  popupWindow.style.borderRadius = '8px';
  popupWindow.style.zIndex = 10000;

  // Add the content
  popupWindow.innerHTML = content;

  // Append elements to the document
  document.body.appendChild(popupOverlay);
  popupOverlay.appendChild(popupWindow);

  // Close the popup when clicking outside the popup window
  popupOverlay.addEventListener('click', function (e) {
    if (e.target === popupOverlay) closePopup();
  });

  // Close the popup on pressing the Esc key
  document.addEventListener('keydown', function handleEsc(e) {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', handleEsc);
    }
  });

  // Close popup function
  function closePopup() {
    popupOverlay.remove();
  }
}