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
        const [pattern, opRaw] = r.split(":");
      
        let op = opRaw.trim();
        let cond = null;
      
        const m = op.match(/^(\w+)(@\((.*)\))?$/);
        if (m) {
          op = m[1].toUpperCase();
          if (m[3]) cond = buildCondFn(m[3], header);
        }
      
        return { pattern: pattern.trim(), op, cond };
      });
      
      // map columns to rules
      const colRules = header.map((h,i) => {
     	  //if (!isNumeric(rows[0][i])) return { op: "FIRST", cond: null }; // for strings

        for (let r of rules) {
          if (matchPattern(h, r.pattern)) return r;
        }
        return { op: "FIRST", cond: null }; // default
      });

      const groups = new Map();

      for (let row of rows) {
        const key = row[groupIdx];

        if (!groups.has(key)) {
          const g = {
            values: row.map((v,i) => i==groupIdx ? v : null), //isNumeric(v) ? Number(v) : v),
            sum: Array(row.length).fill(0),
            countArr: Array(row.length).fill(0)
          };
        
          for (let i = 0; i < row.length; i++) {
            const { op, cond } = colRules[i];
            const prefix = getPrefix(header[i]);
        
            // allpy condition also for first row
            if (cond && !cond(row, prefix)) continue;
  
            g.values[i] = isNumeric(row[i]) ? Number(row[i]) : row[i];

            if (op == "SUM" || op == "AVG") {
              if (isNumeric(row[i])) {
                const value = Number(row[i]);
                g.sum[i] = value;
                g.countArr[i] = 1;
              }
            }
          }
      
          groups.set(key, g);
        } else {
          const g = groups.get(key);
          g.count++;
          for (let i = 0; i < row.length; i++) {
            if (i === groupIdx) continue;
          
            const { op, cond } = colRules[i];
          
            const colName = header[i];
            const prefix = getPrefix(colName);
          
            // apply condition if exists
            if (cond && !cond(row, prefix)) continue;
          
            let value = Number(row[i]);
            value = Number.isFinite(value) ? value : 0;
 
            switch (op) {         
              case "FIRST": if (g.values[i] == null) g.values[i] = row[i];                            break;
              case "LAST":  g.values[i] = row[i];                                                     break;
              case "CAT" :  g.values[i] = (g.values[i] ? g.values[i] + " " : "") + row[i];            break;
              case "MIN":   g.values[i] = g.values[i] == null ? value : Math.min(g.values[i], value); break;
              case "MAX":   g.values[i] = g.values[i] == null ? value : Math.max(g.values[i], value); break;
              case "AVG":
              case "SUM":   g.sum[i] += value;g.countArr[i]++;                                        break;
            }
          }          
        }
      }

      // finalize rows
      const newRows = [];
      for (let g of groups.values()) {
        const row = g.values.slice();
        for (let i = 0; i < row.length; i++) {
          if (i==groupIdx) continue;
          if (colRules[i].op === "AVG") 
            row[i] = g.countArr[i] ? g.sum[i] / g.countArr[i] : null;
          if (colRules[i].op === "SUM") 
            row[i] = g.countArr[i] ? g.sum[i] : null;
        }
        newRows.push(row);
      }

      rows = newRows;
    }
  }

  return [header, ...rows];
}


// =====================
// 🔹 Helper: Builds function for groupby condition 
//            Example: expr = "Check == 'OK'"
// =====================
function buildCondFn(expr, header) {
  return function(row, prefix) {
    let jsExpr = expr;

    header.forEach((h, i) => {
      const suffixIdx = h.lastIndexOf(".");
      if (suffixIdx === -1) return;

      const suffix = h.slice(suffixIdx + 1);

      // replace suffix with prefixed column
      const fullName = prefix ? `${prefix}.${suffix}` : h;

      const colIdx = header.indexOf(fullName);
      if (colIdx !== -1) {
        const regex = new RegExp(`\\b${suffix}\\b`, "g");
        jsExpr = jsExpr.replace(regex, `row[${colIdx}]`);
      }
    });

    return new Function("row", `return ${jsExpr}`)(row);
  };
}

function getPrefix(colName) {
  const idx = colName.lastIndexOf(".");
  return idx === -1 ? "" : colName.slice(0, idx);
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

function createCountTable(table, criteria, group = null, func = 'COUNT', col = '') {
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
      const lastDot = header.lastIndexOf('.');
      const algo = header.substring(0, lastDot);
      const ind = header.substring(lastDot + 1);
      algoMap.add(algo);
      indicatorMap.add(ind);
    }
  });

  const algorithms = Array.from(algoMap);
  const indicators = Array.from(indicatorMap);
  // Plain columns: no dot in header — same value for every algorithm
  const plainCols = headerRow.filter(h => typeof h === 'string' && !h.includes('.'));

  // Helper: reduce collected values with the chosen function
  const applyFunc = (vals) => {
    if (func === 'COUNT') return vals.length;
    if (vals.length === 0) return 0;
    if (func === 'FIRST') return vals[0];
    if (func === 'LAST')  return vals[vals.length - 1];
    const nums = vals.map(Number).filter(v => !isNaN(v));
    if (nums.length === 0) return 0;
    switch (func) {
      case 'SUM': return parseFloat(nums.reduce((a, b) => a + b, 0).toFixed(4));
      case 'MIN': return Math.min(...nums);
      case 'MAX': return Math.max(...nums);
      case 'AVG': return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4));
      default:    return null;
    }
  };

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

  // Detect simple condition field (field op value) for threshold column
  const rawCondTemplate = iterations[0]?.rawCriteria ?? '';
  const condFieldMatch = rawCondTemplate.match(/^\s*(\w+)\s*(==|!=|<=|>=|<|>)\s*/);
  const condFieldForHdr = (condFieldMatch && condFieldMatch[1] !== (group || ''))
    ? condFieldMatch[1] : null;

  const resultRows = [];
  let rowId = 1;

  // 4. AGGREGATION LOGIC
  iterations.forEach(iter => {
    // Resolve ${i} once per iteration (before per-row algo substitution)
    let resolvedCriteria = iter.rawCriteria;
    if (iter.i !== null) {
      resolvedCriteria = resolvedCriteria.replace(/\$\{(.*?)\}/g, (_, expr) => {
        try { return new Function(iter.varName, `return ${expr}`)(iter.i); }
        catch { return 0; }
      });
    }

    // Extract threshold value from resolved simple condition
    let condThreshold = null;
    if (condFieldForHdr) {
      const thMatch = resolvedCriteria.match(/^\s*\w+\s*(?:==|!=|<=|>=|<|>)\s*(.+?)\s*$/);
      if (thMatch) {
        const v = thMatch[1].trim();
        condThreshold = isNaN(Number(v)) ? v : Number(v);
      }
    }

    const uniqueGroups = group ? [...new Set(normalizedTable.map(r => r[group]))].sort((a,b) => a-b) : [null];

    uniqueGroups.forEach(groupVal => {
      const rowResult = { ID: rowId++ };
      if (iter.i !== null) rowResult[iter.varName] = iter.i;
      if (group) rowResult[group] = groupVal;
      if (condFieldForHdr) rowResult['cond'] = condThreshold;

      const subset = group ? normalizedTable.filter(r => r[group] === groupVal) : normalizedTable;

      // Step 1: compute aggregated values per algo (matchedRows is algo-specific)
      const algoAgg = {}; // algo -> { ind/col -> value }
      algorithms.forEach(algo => {
        const matchedRows = subset.filter(row => {
          let evalStr = resolvedCriteria; // ${i} already resolved
          // Substitute plain (algorithm-independent) column values first
          plainCols.forEach(col => {
            const value = row[col];
            const formattedValue = typeof value === 'string' ? `'${value}'` : value;
            evalStr = evalStr.replace(new RegExp(`\\b${col}\\b`, 'g'), formattedValue);
          });
          // Then substitute algo-specific indicator values
          indicators.forEach(ind => {
            const actualKey = Object.keys(row).find(k => k.toLowerCase() === `${algo}.${ind}`.toLowerCase());
            const value = row[actualKey];
            const formattedValue = typeof value === 'string' ? `'${value}'` : value;
            evalStr = evalStr.replace(new RegExp(`\\b${ind}\\b`, 'gi'), formattedValue);
          });
          try { return !evalStr.trim() || new Function(`return ${evalStr}`)(); }
          catch { return false; }
        });

        algoAgg[algo] = {};
        if (func === 'COUNT') {
          algoAgg[algo]['count'] = matchedRows.length;
        } else if (col) {
          const vals = matchedRows.map(row => {
            const colKey = Object.keys(row).find(k => k.toLowerCase() === `${algo}.${col}`.toLowerCase());
            return colKey !== undefined ? row[colKey] : null;
          });
          algoAgg[algo][col] = applyFunc(vals);
        } else {
          indicators.forEach(ind => {
            const vals = matchedRows.map(row => {
              const indKey = Object.keys(row).find(k => k.toLowerCase() === `${algo}.${ind}`.toLowerCase());
              return indKey !== undefined ? row[indKey] : null;
            });
            algoAgg[algo][ind] = applyFunc(vals);
          });
        }
      });

      // Step 2: write into rowResult in indicator-first order (matches input column order)
      if (func === 'COUNT') {
        algorithms.forEach(algo => { rowResult[`${algo}.count`] = algoAgg[algo]['count']; });
      } else if (col) {
        algorithms.forEach(algo => { rowResult[`${algo}.${col}.${func.toLowerCase()}`] = algoAgg[algo][col]; });
      } else {
        indicators.forEach(ind => {
          algorithms.forEach(algo => {
            rowResult[`${algo}.${ind}.${func.toLowerCase()}`] = algoAgg[algo][ind];
          });
        });
      }
      resultRows.push(rowResult);
    });
  });

  // 5. CONVERT RESULT OBJECTS BACK TO 2D ARRAY
  if (resultRows.length === 0) return [];

  const finalHeaders = Object.keys(resultRows[0]);
  const finalTable = [finalHeaders];
  resultRows.forEach(obj => finalTable.push(finalHeaders.map(h => obj[h])));

  return finalTable;
}