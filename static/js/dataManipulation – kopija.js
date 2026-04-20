/// *********************
//  Tools for data manipulation
/// *********************


// ************* filtering row (keep only those, that satisfy filter conditions)
//
// filterStr = "n==2500 && m<100"
function createFilterFn(filterStr, headers) {
  let expr = filterStr; // .replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");

  // replace header names with row.<header>
  headers.forEach(h => {
    const re = new RegExp(`\\b${h}\\b`, "g");
    expr = expr.replace(re, `row.${h}`);
  });

  return new Function("row", `return ${expr};`);
}


// do the filtering
function filterRows(data, filterFn) {
  if (!Array.isArray(data) || data.length === 0) return data;

  const headers = data[0];
  const result = [headers];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // convert row to object using headers
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx];
    });

    if (filterFn(obj)) {
      result.push(row);
    }
  }

  return result;
}


// vrednost v vseh celicah, ki vsebujejo podatke, ločene z vejico, pretvorim v tabelo ("1,2,3" -> [1,2,3])
function valuesToArray(newData) {
  for (var i = 0; i < newData.length; i++) {
    for(var j=0; j < newData[i].length; j++) {
      if ((typeof newData[i][j] === "string") && newData[i][j].includes(","))
        newData[i][j] = newData[i][j].split(",");
    }
  }
}



// ======================
// Presenter JSON cleaner
// ====================== 
// Function returns string representation on presenter JSON with all 
// "data" fields removed (data represents chart data which is used for 
// chart rendering)
function presenterToCleanString(presenterJSON) {
  let json = JSON.stringify(presenterJSON, (key, value) => { 
    // remove "data" from chart since it is useless information and to prevent large json file
    if (key === "data") return undefined;
    return value;
  });
  return json;
}




// ************* do groupby and filter on array of data
/*
We have an array of data. First row is a header, for example: 
   ["ID","Testset","DIST","N","BSort.Tfirst","ISort.Tfirst","BSort.Tmin","ISort.Tmin"]. 
Other rows are pure data, for example: 
   [1,"TestSet0","SOR",10,322,315,258, 251].

Function gets two parameters: data (array) and ops (rules, how array should change).
  First parameter is array of data (header + raw data)
  Second parameter (ops) is an array of rules, for example: ops = ["groupby: N;Tmin:AVG", "filter: N>=100 && N<100", "groupby: DIST"]
    - Each op in ops is of format: opName: opParam
    - Ops should be applaied on array one after each other. 
    - There are two opNames: groupby and filter.  
      - opName groupby: group rows of data together so that row with same value of parameter are joined ( grouped) in to single line. opParam for groupby is composed of paramName;rule1;rule2... Each rule defines, how values of different rows with same param value should be combined toherher. For example: "groupby: N;Tmin:AVG" means: group together all lines with same value of N; columns with name "*.Tmin" (like ISort.Tmin or BSort.Tmin) should be grouped by AVG (average). Other valid values (instead of AVG) are: MIN, MAX, FIRST. 
      - opName filter: filters out lines of data ther do not satisfy conditions in opParam. For example: "filter: (DIST=='RND') || (N>=100 && N<1000)" should obtain only lines with value DIST==RND or with N>=100 && N<1000.
*/

function groupbyFilterData(data, ops) {
  if (!data || data.length === 0) return data;

  const header = data[0];
  let rows = data.slice(1);

  for (let op of ops) {
    // Split only on first ":" to avoid losing inner ":" like Tmin:AVG
    const idx = op.indexOf(":");
    if (idx === -1) continue;

    const opName = op.slice(0, idx).trim();
    const rawParam = op.slice(idx + 1).trim();

    // =====================
    // 🔹 FILTER
    // =====================
    if (opName === "filter") {
      const fn = buildFilterFn(rawParam, header);
      rows = rows.filter(r => fn(r));
    }

    // =====================
    // 🔹 GROUPBY
    // =====================
    if (opName === "groupby") {
      const parts = rawParam.split(";").map(s => s.trim());
      const groupCol = parts[0];
      const groupIdx = header.indexOf(groupCol);
      if (groupIdx === -1) continue;

      // parse rules
      const rules = parts.slice(1).map(r => {
        const [pattern, op] = r.split(":");
        return { pattern: pattern.trim(), op: op.trim().toUpperCase() };
      });

      // map columns to rules
      const colOps = header.map((h,i) => {
     	  if (!isNumeric(rows[0][i])) return "FIRST"; // for strings

        for (let r of rules) {
          if (matchPattern(h, r.pattern)) return r.op;
        }
        return "FIRST"; // default
      });

      const groups = new Map();

      for (let row of rows) {
        const key = row[groupIdx];

        if (!groups.has(key)) {
          const g = {
            count: 1,
            values: row.map(v => isNumeric(v) ? Number(v) : v),//row.slice(),
            sum: row.map((v, i) => 
            	((colOps[i] === "SUM") || (colOps[i] === "AVG") ? (isNumeric(v) ? Number(v) : v) : 0))
          };
          groups.set(key, g);
        } else {
          const g = groups.get(key);
          g.count++;
          for (let i = 0; i < row.length; i++) {
            if (i === groupIdx) continue;

            let value = Number(row[i]); 
            value = Number.isFinite(value) ? value : 0;

            const op = colOps[i];
            if      (op === "FIRST") continue;
            if      (op === "LAST")  g.values[i] = value;
            else if (op === "MIN")   g.values[i] = Math.min(g.values[i], value);
            else if (op === "MAX")   g.values[i] = Math.max(g.values[i], value);
            else if ((op === "AVG") 
            	  ||(op === "SUM"))  g.sum[i]   += value;
          }
        }
      }

      // finalize rows
      const newRows = [];
      for (let g of groups.values()) {
        const row = g.values.slice();
        for (let i = 0; i < row.length; i++) {
          if (colOps[i] === "AVG") row[i] = g.sum[i] / g.count;
          if (colOps[i] === "SUM") row[i] = g.sum[i];
        }
        newRows.push(row);
      }

      rows = newRows;
    }
  }

  return [header, ...rows];
}




// =====================
// 🔹 Helper: check if value is number
// =====================
function isNumeric(val) {
  if (typeof val === "number") {
    return Number.isFinite(val);
  }
  if (typeof val === "string") {
    const v = val.trim().replace(",", "."); // support "3,14"
    return v !== "" && Number.isFinite(Number(v));
  }
  return false;
}

// =====================
// 🔹 Helper: wildcard matching
// =====================
function matchPattern(colName, pattern) {
  if (pattern === "*") return true;
  if (colName.endsWith("." + pattern)) return true;
  return colName === pattern;
}

// =====================
// 🔹 Helper: build filter function
// =====================
function buildFilterFnOLD(expr, header) {
  let jsExpr = expr;
  header.forEach((h, i) => {
    const regex = new RegExp(`\\b${h}\\b`, "g");
    jsExpr = jsExpr.replace(regex, `row[${i}]`);
  });
  return new Function("row", `return ${jsExpr}`);
}
// spodnja funkcija v filtru dovoljuje tudi vzorce (npr: Tmin, pomeni: *.Tmin)
function buildFilterFn(expr, headers) {
  let jsExpr = expr;

  // Match all tokens in the filter string (simple words)
  const tokens = expr.match(/\b\w+\b/g) || [];

  tokens.forEach(token => {
    // Find all headers whose last part matches this token
    const matchingIndexes = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter(({ header }) => header.split('.').pop() === token)
      .map(({ index }) => index);

    if (matchingIndexes.length === 1) {
      // Single match → replace token with row[index]
      jsExpr = jsExpr.replace(new RegExp(`\\b${token}\\b`, 'g'), `row[${matchingIndexes[0]}]`);
    } else if (matchingIndexes.length > 1) {
      // Multiple matches → replace with OR of all matching row[index]
      const replacement = matchingIndexes.map(i => `row[${i}]`).join(' && '); // VSI stolpci morajo zadoščati pogoju
      jsExpr = jsExpr.replace(new RegExp(`\\b${token}\\b`, 'g'), `(${replacement})`);
    }
    // If no match → leave token as-is (could be a literal or JS operator)
  });
  return new Function("row", `return ${jsExpr};`);
}






/******** COUNT table **************************
 * 
   
Having javascript table with header, for example like this: tab1 =

tab1=[["ID", "N", "A.x", "B.x", "C.x", "A.y", "B.y", "C.y", "A.Chk", "B.Chk", "C.Chk"],
      [ 1,   10,  10,    13,    15,    102,   201,   170,   "OK",    "OK",    "OK"  ],
      [ 2,   10,  12,    9,     14,    99,    107,   200,   "NOK",   "NOK",   "OK"  ],
      [ 3,   10,  13,    10,    12,    130,   111,   180,   "OK",    "OK",    "OK"  ],
      [ 4,   20,  20,    21,    23,    204,   206,   190,   "OK",    "NOK",   "OK"  ],
      [ 5,   20,  19,    23,    21,    195,   199,   206,   "NOK",   "OK",    "OK"  ],
      [ 6,   20,  21,    24,    19,    200,   185,   230,   "NOK",   "OK",    "OK"  ]
     ]

(here A, B and C are three algorithms and x, y and Chk are indicators).  Function 

  count(table, criteria, group) 

creates table of counts. 

Example 1: count(tab1, "Chk=='OK'") creates

ID  A   B   C
1   3   4   6

Example 2:  count(tab1, "Chk=='OK'", "N") creates

ID  N   A   B   C
1   10  2   2   3   
2   20  1   2   3

Example 3: count(tab1, "$for{i,0,10,5}:x>${10+i}") creates 

ID  i   A   B   C
1   0   6   5   6
2   5   3   3   5
3   10  1   3   2

Example 4: count(tab1, "$for{i,0,10,5}:x>${10+i}", "N") creates

ID  i   N   A   B   C
1   0   10  2   2   3
1   0   20  3   3   3
2   5   10  0   0   0
2   5   20  3   3   3
3   10  10  0   0   0
3   10  20  1   3   2
 */

function createCountTable(table, criteria, group = null) {
  if (!table || table.length < 2) return [];

  // 1. CONVERT INPUT 2D ARRAY TO OBJECTS FOR PROCESSING
  const [headerRow, ...dataRows] = table;
  const normalizedTable = dataRows.map(row => {
    let obj = {};
    headerRow.forEach((key, index) => obj[key] = row[index]);
    return obj;
  });

  // 2. DYNAMIC HEADER PARSING
  const algoMap = new Set();
  const indicatorMap = new Set();
  headerRow.forEach(header => {
    if (typeof header === 'string' && header.includes('.')) {
      // const [algo, ind] = header.split('.');
      const lastDot = header.lastIndexOf('.');
      const algo = header.substring(0, lastDot);
      const ind = header.substring(lastDot + 1);
      algoMap.add(algo);
      indicatorMap.add(ind.toLowerCase());
    }
  });

  const algorithms = Array.from(algoMap);//.sort();
  const indicators = Array.from(indicatorMap);

  // 3. DSL LOOP PARSING ($for)
  let iterations = [{ i: null, varName: 'i', rawCriteria: criteria }];
  const forMatch = criteria.match(/^\$for\{(\w+),(\d+),(\d+),(\d+)\}:(.*)/);
  if (forMatch) {
    const [_, varName, start, end, step, expression] = forMatch;
    iterations = [];
    for (let i = parseInt(start); i <= parseInt(end); i += parseInt(step)) {
      iterations.push({ i, varName, rawCriteria: expression });
    }
  }

  const resultRows = [];
  let rowId = 1;

  // 4. AGGREGATION LOGIC
  iterations.forEach(iter => {
    const uniqueGroups = group ? [...new Set(normalizedTable.map(r => r[group]))].sort((a,b) => a-b) : [null];

    uniqueGroups.forEach(groupVal => {
      const rowResult = { ID: rowId++ };
      if (iter.i !== null) rowResult[iter.varName] = iter.i;
      if (group) rowResult[group] = groupVal;

      const subset = group ? normalizedTable.filter(r => r[group] === groupVal) : normalizedTable;

      algorithms.forEach(algo => {
        rowResult[algo] = subset.reduce((acc, row) => {
          let evalStr = iter.rawCriteria;

          indicators.forEach(ind => {
            const actualKey = Object.keys(row).find(k => k.toLowerCase() === `${algo}.${ind}`.toLowerCase());
            const value = row[actualKey];
            const formattedValue = typeof value === 'string' ? `'${value}'` : value;
            evalStr = evalStr.replace(new RegExp(`\\b${ind}\\b`, 'gi'), formattedValue);
          });

          if (iter.i !== null) {
            evalStr = evalStr.replace(/\$\{(.*?)\}/g, (_, expr) => {
              const scopeFunc = new Function(iter.varName, `return ${expr}`);
              return scopeFunc(iter.i);
            });
          }

          // this is not safe and it is slow:
          // try { return acc + (eval(evalStr) ? 1 : 0); } catch (e) { return acc; }
          try {
            // Create a function that returns the result of the logic string
            const checker = new Function(`return ${evalStr}`);
            return acc + (checker() ? 1 : 0);
          } catch (e) {
            return acc;
          }
        }, 0);
      });
      resultRows.push(rowResult);
    });
  });

  // 5. CONVERT RESULT OBJECTS BACK TO 2D ARRAY
  if (resultRows.length === 0) return [];
  
  //const finalHeaders = Object.keys(resultRows[0]);
  const finalHeaders = Object.keys(resultRows[0]).map(h => 
    algorithms.includes(h) ? `${h}.count` : h
  );  

  const finalTable = [finalHeaders]; // First row is headers
  
  resultRows.forEach(obj => {
    finalTable.push(Object.values(obj));
    //finalTable.push(finalHeaders.map(h => obj[h]));
  });

  return finalTable;
}