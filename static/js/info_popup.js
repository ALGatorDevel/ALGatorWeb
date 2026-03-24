let messages = {

'testsets_common_files': `
  To access these files in test case generators, use the <span class="pre-text">commonResourcesPath</span> obtained by

  <pre style="background-color:lightgray">
    String commonResourcesPath  = getCommonResourcesPath (generatingParameters);<pre>
`,

'tests':`Example of multi-test description line: <pre>

  $for{i,0,100,10}:Type0:test\${i+1}:\${1000+ i}:RND

</pre>
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

  @CMP+@SWAP AS X1
  0.15*@N AS LIN1 
  0.01*@N*log(@N) AS LIN 
  floor(10*sin(@JavaSort.Tmin)) AS KN
<pr>

Supported operators and functions:

<pre>
  Addition: '2 + 2',        Subtraction: '2 - 2'
  Multiplication: '2 * 2',  Division: '2 / 2'
  Exponential: '2 ^ 2',     Modulo: '2 % 2'
  
  <b>abs</b>: absolute value
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
`,

'groupby':`Example: to group by r and retain minimal of Tmins and average of Tmaxs, write <pre>r;Tmin:MIN;Tmax:AVG</pre>`,

'labels_list_x':`<pre>
  Change or transform x labels.

  1) Define semi-column delimited list of labels to be used
  Example: a;;b  ... will replace first and third label to 'a' abd 'b'; other labels will remain unchanged.

  2) Define a function to transform labels; use x for label or idx (if category) for label index 
  Example: =x+1     ... increace label by 1
           =log2(x) ... transform label to log(label)
           =2^idx   ... use 1,2,4,8, ...  as labels 
`,
'labels_list_y':`<pre>
  Change or transform y labels.

  Define a function to transform y labels; use y for label
  Example: =y+1           ... increace label by 1
           =log2(y)       ... transform label to log(label)
           =round(y/1000, 2) ... change from milli seconds to seconds; use two decimal places
`,

'fxilterX':`<pre>
  This field defines, how data obtained from query should be filtered and groupd. Field can 
  contain several  entries of type "filter:" and "groupby:".  

  Example: filter:(N>10000) && (N<15000) ... retains only rows in which N is between (10000,15000)
           filter:Testset='TestSet0'     ... retains only rows of TestSet1
           groupby:N                     ... all lines with same N groups into single line; dafault 
                                             value calculation for grouped fields: FIRST
           groupby:N;Tmin:AVG            ... group by N; for fileds *.Tmin calculate average of all 
                                             rows with same N; for other filed take FIRST value
           groupby:N;Tmin:MIN;*:AVG      ... group by N; for fileds *.Tmin take the minimal value of 
                                             rows with same N; for other filed calculate average value

</pre>
`, 

'filterX':`<pre>
  This field defines how the data returned by the query is filtered and grouped for use 
  in this graph. It can contain multiple entries of type 'filter:'' and 'groupby:'.

  Examples:

    filter:(N > 10000) && (N < 15000)
      → keeps only rows where N is between 10,000 and 15,000
    
    filter:Testset == 'TestSet0'
      → keeps only rows where Testset equals 'TestSet0'
    
    groupby:N
      → groups all rows with the same N into one row
      → default aggregation for other fields: FIRST (take the first value)
    
    groupby:N; Tmin:AVG
      → group by N
      → for Tmin, compute the average (AVG)
      → for other fields, use FIRST
    
    groupby:N; Tmin:MIN; *:AVG
      → group by N
      → for Tmin, take the minimum (MIN) value
      → for all other fields (*), compute the average (AVG)

    Valid aggregation functions: MIN, MAX, AVG, SUM, FIRST or LAST
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