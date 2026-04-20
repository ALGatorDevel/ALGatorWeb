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
      → default aggregation function: FIRST 
    
    groupby:N; Tmin:AVG
      → group by N
      → for Tmin, compute the average (AVG)
      → for other fields, use FIRST
    
    groupby:N; Tmin:MIN; *:AVG
      → group by N
      → for Tmin, take the minimum (MIN) value
      → for all other fields (*), compute the average (AVG)

    groupby:N; Tmin:AVG@(Check=='OK')
      → group by N
      → in AVG for Tmin field take only values where Check=='OK'

    groupby:N; Tmin:AVG@(Status=='DONE'); TID:CAT@(Status=='DONE'); *:MIN;
      → group by N
      → for values of Tmin in each group, calculate AVG of Tmins, but take
        only those lines for which Status=='DONE'
      → in TID field collects names of all tests for which Status=='DONE'

      

    Valid aggregation functions: MIN, MAX, AVG, SUM, FIRST, LAST, CAT
</pre>`,

'countTable':`<pre>
  This field transforms the processed data (i.e., the data returned by the query 
  and modified by the filter and groupby options) into an array of counts.

  Examples:

  Check == 'OK'
    → For each algorithm, counts the number of rows where the Check field equals 'OK'.

  Check != 'OK' @N
    → For each value of N and for each algorithm, counts the number of rows 
      where the Check field is not 'OK'.

  Tmin < 1000
    → For each algorithm, counts the number of rows where Tmin < 1000.

  $for{i,1,10,1}:Tmin < \${i*10000}
    → For each algorithm, counts the number of rows where 
      Tmin < 10000, 20000, ..., 100000.

  $for{i,1,10,1}:Tmin < \${i*10000} @N
    → For each value of N and for each algorithm, counts the number 
      of rows where Tmin < 10000, 20000, ..., 100000.
</pre>`

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