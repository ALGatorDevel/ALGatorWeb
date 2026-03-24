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


// vrednost v vseh celicah, ki vsebujejo podatke, ločene z vejico, pretvorim v tabelo ("1,2,3" -> [1,2,3])
function valuesToArray(newData) {
  for (var i = 0; i < newData.length; i++) {
    for(var j=0; j < newData[i].length; j++) {
      if ((typeof newData[i][j] === "string") && newData[i][j].includes(","))
        newData[i][j] = newData[i][j].split(",");
    }
  }
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
function buildFilterFn(expr, header) {
  let jsExpr = expr;
  header.forEach((h, i) => {
    const regex = new RegExp(`\\b${h}\\b`, "g");
    jsExpr = jsExpr.replace(regex, `row[${i}]`);
  });
  return new Function("row", `return ${jsExpr}`);
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