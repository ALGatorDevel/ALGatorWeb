class PageData {
  services = {}

  constructor() {
    this.dataLoaded                = {};
    this.dataLoadingInitiated      = {};
  }

  // to be overriden
  setVar(type, value) {}

  async loadData(typesToLoad, params=null) {
    typesToLoad.forEach((ttl) => {
      this.dataLoaded[ttl] = false;
      this.dataLoadingInitiated[ttl] = true;
    });

    let requests = [];
    typesToLoad.forEach((ttl) => {
      if (this.services.hasOwnProperty(ttl)) {
        requests.push(sendRequest(this.services[ttl].endpoint, params, this.services[ttl].method));
      }
    });                   
    Promise.all(requests).then((result) => {
      for(let idx = 0; idx<typesToLoad.length; idx++) {
        try {
          let jres =  JSON.parse(result[idx]);
          this.setVar(typesToLoad[idx],  (jres.Status==0) ? jres.Answer : {});
        } catch (e) {}
        this.dataLoaded[typesToLoad[idx]] = true;
      } 
    });  
  }

  async waitForDataToLoad(dataToLoad, reload = false, params={}, timeout = 5000) {
    // If reload is true, trigger the loading of all data in dataToLoad.
    // Otherwise, only load theyy data that hasn't been loaded yet.
     
    let dataToLoadX = dataToLoad;
    if (!reload) {
      dataToLoadX = [];
      for (let dt of dataToLoad)
        if (!this.dataLoadingInitiated[dt]) dataToLoadX.push(dt);
    }
    if (dataToLoadX.length > 0) this.loadData(dataToLoadX, params);
    
    return new Promise((resolve, reject) => {
      const start = Date.now();
  
      const interval = setInterval(() => {
        let hasData = true;
        
        // Check if all required data is loaded
        dataToLoad.forEach(dt => {
          hasData = hasData && this.dataLoaded.hasOwnProperty(dt) && this.dataLoaded[dt];
        });
  
        if (hasData) {
          clearInterval(interval); // Stop checking
          resolve(); // Resolve the promise when data is loaded
        }
  
        // Check for timeout
        if (Date.now() - start >= timeout) {
          clearInterval(interval);
          reject(new Error('Data loading timed out')); // Reject the promise if timeout is reached
        }
      }, 100); // Polling interval
    });
  }

}

// runs a service and returns JSON
function runService(endpoint, method, dataToSend, callback) {
  sendRequest(endpoint, dataToSend, method).then((result) => {
      var res = {"Status":10};  // 10 = can not parse result
      try {
        var jres = JSON.parse(result);
        res = jres;
      } catch (e) {
        res["Answer"] = e.message + "; (result = " + result + ")";
      }
      if (!("Status" in res)) res["Status"] = 11;
      if (!("Answer" in res)) res["Answer"] = "Unknown answer.";
    callback(res);
  });
}

function runNamedService(services, name, dataToSend, callback) {
  var service = services[name];
  if (service)
    runService(service.endpoint, service.method, dataToSend, callback);
}

function sendRequest(endpoint, dataToSend, method){
    return new Promise(function(resolve, reject) {
        if (!dataToSend) dataToSend={};
        dataToSend.csrfmiddlewaretoken = window.CSRF_TOKEN;
        $.ajax({
            url: endpoint,
            data: dataToSend,
            type: method,
            success: (data) => {resolve(data)},
            error: (err) => {reject(err)}
        });
    });
}



// returns a html select element with services as options 
function getServiceListAsSelect(services) {
    // Create a select element
    const selectElement      = document.createElement('select');
    selectElement.style.width= "200px";
    selectElement.id         = "service_select_list"; 

    // Iterate over the keys of the JSON object and add each key as an option to the select element
    Object.keys(services).forEach(key => {
        const optionElement = document.createElement('option');
        optionElement.value = key;
        optionElement.textContent = key;
        selectElement.appendChild(optionElement);
    });

    // Return the select element
    return selectElement;
}
