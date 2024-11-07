csrftoken = getCookie('csrftoken');


function redirectToUrlWithParams(basePath, params) {
    // implicit parameter that tell calee that it was called with redirect
    params["fr"] = 1

    if (!params.hasOwnProperty('next')) params["next"] = window.location.pathname;

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = basePath;
  
    var csrfToken = csrftoken;
    var csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);
  
    Object.keys(params).forEach(function(key) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    });
  
    document.body.appendChild(form);
    form.submit();
  }

function redirectToUrlWithPathAndParams(basePath, params) {
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }
  redirectToUrlWithParams(basePath,params);
}  
    
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


function preventNonAlphaNumKeys(event) {
  const charCode = event.which || event.keyCode; 
  if (!(charCode >= 65 && charCode <= 90) && // A-Z
    !(charCode >= 97 && charCode <= 122) && // a-z
    !(charCode >= 48 && charCode <= 57) && // 0-9
    charCode !== 95)  // underscore
  event.preventDefault();
}