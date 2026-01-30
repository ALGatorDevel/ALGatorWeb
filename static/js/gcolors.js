// 21 default colors for first 21 algorithms
const c3_series_colors = [
  { hex: "-1",      name: "(default)" },
  { hex: "#1f77b4", name: "blue" },
  { hex: "#ff7f0e", name: "orange" },
  { hex: "#2ca02c", name: "green" },
  { hex: "#d62728", name: "red" },
  { hex: "#9467bd", name: "purple" },
  { hex: "#8c564b", name: "brown" },
  { hex: "#e377c2", name: "pink" },
  { hex: "#7f7f7f", name: "gray" },
  { hex: "#bcbd22", name: "olive" },
  { hex: "#17becf", name: "teal" },
  { hex: "#aec7e8", name: "light blue" },
  { hex: "#ffbb78", name: "light orange" },
  { hex: "#98df8a", name: "light green" },
  { hex: "#ff9896", name: "light red" },
  { hex: "#c5b0d5", name: "lavender" },
  { hex: "#c49c94", name: "tan" },
  { hex: "#f7b6d2", name: "light pink" },
  { hex: "#c7c7c7", name: "light gray" },
  { hex: "#dbdb8d", name: "khaki" },
  { hex: "#9edae5", name: "light teal" }
];

// Helper: choose white or black text depending on background brightness
function getTextColor(hex) {
  const rgb = parseInt(hex.slice(1), 16); // convert hex to int
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return hex<0 || brightness > 128 ? "black" : "white";
}


// default color for i-th series == i-th unused color
function getDefaultColorByIndex(idx, usedColors) {
  const availableColors = c3_series_colors.filter(item => !usedColors.has(item.hex));

  return availableColors[1 + idx % (availableColors.length-1)].hex;
}

/**
 * Creates HTML string for a color select element.
 * @param {Array} colors - array of objects {hex: "#xxxxxx", name: "color name"}
 * @param {string} selectId - optional id for the <select>
 * @returns {string} HTML of <select> with colored options
 */
function createColorSelect(key, usedColors, selectId = "c3-colors", selected="-1") {
  let html = `<select class="almostW sEdit" disabled own="${key}" id="${selectId}" style="padding:4px;">\n`;

  var algIndex     = getAlgorithmIndex(key); 
  var numOfNonDef  = getNumberOfNonDefaultsBefore(algIndex);
  var defaultColor = getDefaultColorByIndex(algIndex - numOfNonDef, usedColors);

  c3_series_colors.forEach(c => {
    const bgColor   = c.hex == -1 ? defaultColor : c.hex; 
    const textColor = getTextColor(bgColor);
    html += `  <option value="${c.hex}" ${c.hex == selected ? "selected" : ""} style="background:${bgColor}; color:${textColor};">` +
            `${c.name}</option>\n`;
  });

  html += `</select>`;
  return html;
}

function updateColorSelectPreview(selectId = "c3-colors") {
  var select = document.getElementById(selectId);

  const selectedOption = select.options[select.selectedIndex];
  const bgColor = selectedOption.style.background;
  const textColor = selectedOption.style.color;

  select.style.background = bgColor;
  select.style.color = textColor;
}