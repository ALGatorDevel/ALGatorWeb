var countryList = '["South Georgia","Grenada","Switzerland","Sierra Leone","Hungary","Taiwan","Wallis and Futuna","Barbados","Pitcairn Islands",\
"Ivory Coast","Tunisia","Italy","Benin","Indonesia","Cape Verde","Saint Kitts and Nevis","Laos","Caribbean Netherlands","Uganda",\
"Andorra","Burundi","South Africa","France","Libya","Mexico","Gabon","Northern Mariana Islands","North Macedonia","China","Yemen",\
"Saint Barthélemy","Guernsey","Solomon Islands","Svalbard and Jan Mayen","Faroe Islands","Uzbekistan","Egypt","Senegal",\
"Sri Lanka","Palestine","Bangladesh","Peru","Singapore","Turkey","Afghanistan","Aruba","Cook Islands","United Kingdom","Zambia",\
"Finland","Niger","Christmas Island","Tokelau","Guinea-Bissau","Azerbaijan","Réunion","Djibouti","North Korea","Mauritius","Montserrat",\
"United States Virgin Islands","Colombia","Greece","Croatia","Morocco","Algeria","Antarctica","Netherlands","Sudan","Fiji","Liechtenstein",\
"Nepal","Puerto Rico","Georgia","Pakistan","Monaco","Botswana","Lebanon","Papua New Guinea","Mayotte","Dominican Republic","Norfolk Island",\
"Bouvet Island","Qatar","Madagascar","India","Syria","Montenegro","Eswatini","Paraguay","El Salvador","Ukraine","Isle of Man","Namibia",\
"United Arab Emirates","Bulgaria","Greenland","Germany","Cambodia","Iraq","French Southern and Antarctic Lands","Sweden","Cuba","Kyrgyzstan",\
"Russia","Malaysia","São Tomé and Príncipe","Cyprus","Canada","Malawi","Saudi Arabia","Bosnia and Herzegovina","Ethiopia","Spain","Slovenia",\
"Oman","Saint Pierre and Miquelon","Macau","San Marino","Lesotho","Marshall Islands","Sint Maarten","Iceland","Luxembourg","Argentina",\
"Turks and Caicos Islands","Nauru","Cocos (Keeling) Islands","Western Sahara","Dominica","Costa Rica","Australia","Thailand","Haiti",\
"Tuvalu","Honduras","Equatorial Guinea","Saint Lucia","French Polynesia","Belarus","Latvia","Palau","Guadeloupe","Philippines","Gibraltar",\
"Denmark","Cameroon","Guinea","Bahrain","Suriname","DR Congo","Somalia","Czechia","New Caledonia","Vanuatu","Saint Helena, Ascension and Tristan da Cunha",\
"Togo","British Virgin Islands","Kenya","Niue","Heard Island and McDonald Islands","Rwanda","Estonia","Romania","Trinidad and Tobago","Guyana",\
"Timor-Leste","Vietnam","Uruguay","Vatican City","Hong Kong","Austria","Antigua and Barbuda","Turkmenistan","Mozambique","Panama","Micronesia","Ireland",\
"Curaçao","French Guiana","Norway","Åland Islands","Central African Republic","Burkina Faso","Eritrea","Tanzania","South Korea","Jordan","Mauritania",\
"Lithuania","United States Minor Outlying Islands","Slovakia","Angola","Kazakhstan","Moldova","Mali","Falkland Islands","Armenia","Samoa","Jersey",\
"Japan","Bolivia","Chile","United States","Saint Vincent and the Grenadines","Bermuda","Seychelles","British Indian Ocean Territory","Guatemala",\
"Ecuador","Martinique","Tajikistan","Malta","Gambia","Nigeria","Bahamas","Kosovo","Kuwait","Maldives","South Sudan","Iran","Albania","Brazil","Serbia",\
"Belize","Myanmar","Bhutan","Venezuela","Liberia","Jamaica","Poland","Cayman Islands","Brunei","Comoros","Guam","Tonga","Kiribati","Ghana","Chad",\
"Zimbabwe","Saint Martin","Mongolia","Portugal","American Samoa","Republic of the Congo","Belgium","Israel","New Zealand","Nicaragua","Anguilla"]';

countryDataListValue = "";

async function loadCountriesWeb() {
  const response = await fetch('https://restcountries.com/v3.1/all');
  const data = await response.json();
  data.forEach(country => {
    countryDataListValue += `<option value='${country.name.common}'></option>`;
  });
}

async function loadCountries() {
  let countries = JSON.parse(countryList);
  countries.forEach(country => {
    countryDataListValue += `<option value='${country}'></option>`;
  });
}