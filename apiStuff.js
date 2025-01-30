//const fs = require('node:fs');
//let axios = require("axios");
//import { response } from "express";
//import gju from "geojson-utils";
//import fileDownloader from "nodejs-file-downloader";

const apiNWS = "https://api.weather.gov";
const apiSPC = "https://www.spc.noaa.gov/products";
const longCoordRegEx = new RegExp("(?:([^\\D]*)(-?)(\\d{0,3})\\.(\\d+))");
const shortCoordRegEx = new RegExp("\\d{8}", "g");
//var xhr = new XMLHttpRequest();
//xhr.responseType = "json";

function testThing() {
  try {
    const data = JSON.parse(fs.readFileSync("./test/KWNSPTSDY1_20130531200", 'utf8'));
    return data;
  } catch (err) {
    console.error(err);
  }
}

/**
 * Gets data from api.weather.gov
 * @param {number|string} url - Latitude of the coordinate pair
 * @returns {object} Returns data in json form from API
 **/
async function requestData(url) {
  var apiUrl = apiNWS + url;
  let request = await fetch(apiUrl);
  return request.json();
}

/**
 * Gets outlook data from spc.noaa.gov
 * @param {number|string} day - Day of outlook 1-8
 * @param {string} type - Type of outlook data
 * @returns {object} This is to get the name and other values for a county
 **/
async function requestOutlookPoints(day) {
  var apiUrl;
  if (day < 4) {
    apiUrl = apiNWS + "/products?wmoid=WUUS0" + day + "&type=PTS&limit=1";
  };
  if (day > 3) {
    apiUrl = apiNWS + "/products?wmoid=WUUS48&type=PTS&limit=1";
  };
  let baseCall = await fetch(apiUrl);
  let base = await baseCall.json();
  let id = JSON.parse(JSON.stringify(base).slice(86, -2)).id;
  let call = await fetch(apiNWS + "/products/" + await id);
  let response = await call.json();
  let data = await response.productText;
  let list = await data.split(" ");

  list.forEach(element => console.log(element))
/* 
  console.log(list); */
  //return data;
  /*
  xhr.open("GET", apiUrl, true);
  xhr.setRequestHeader("User-Agent", "(Oklahoma Weather Lab, owl@ou.edu)");
  xhr.send();
  return JSON.parse(xhr.responseText).features;*/
};

//https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson

function checkCoordinates(latitude, longitude) {
  if (longCoordRegEx.test(longitude) && longCoordRegEx.test(latitude)) {
    return true;
  };
  if (!longCoordRegEx.test(longitude) || !longCoordRegEx.test(latitude)) {
    return false;
  };
};

module.exports = {
  //Just going to disable this for now
  /* 
  thing: async () => {
    requestOutlookPoints(1);
  }, */
  /**
   * Gets the name of the county 
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @returns {string} County name
   **/
  getCountyName: async (latitude, longitude) => {
    let county = await requestData("/zones?type=county&point=" + latitude + "," + longitude);
    //let county = await response.json();
    return county.features[0].properties.name;
  },
  /**
   * Gets the WFO of the point
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @returns {string} WFO code
   **/
  getWFO: async (latitude, longitude) => {
    let county = await requestData("/zones?type=county&point=" + latitude + "," + longitude);
    //let county = await response.json();
    let feature = await county.features[0];
    let property = await feature.properties;
    let office = await property.gridIdentifier;
    return office;
  },
  //(Might be very useless)
  getForecastZoneFromCoords: async (latitude, longitude) => {
    let forecastZone = await requestData("/zones?type=forecast&point=" + latitude + "," + longitude).features[0].properties;
    var obj = {
      getName: async () => {
        return forecastZone.name;
      },
      getID: async () => {
        return forecastZone.id;
      },
      getState: async () => {
        return forecastZone.state;
      },
      getWFO: async () => {
        return forecastZone.cwa[0];
      },
    };
    return obj;
  },

  getLocationInfo: async (latitude, longitude) => {
    let point = await requestData("/point" + latitude + "," + longitude);
    
  },
  //Will need to rework some portion of this so that in case there is more than
  // one alert of the same code that the amount of them can be checked and each one checked.
  //Might change this back to getAlertsFromCoordsByType in the future
  /**
   * Gets alerts of the code from coordinates
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns This is to get certain values from an alert
   **/
  getAlerts: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    let alerts = await response.json();
    if (alerts.features.length > 0) {
      return alerts.features[0].properties;
    } else {
      return "No alerts for " + latitude + ", " + longitude + " of type " + code;
    }
  },
  
  /**
   * Gets the number of alerts of the code specified
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string}
   **/
  getAlertCountByState: async (state) => {
    let data = await requestData("/alerts/active/count");
    if (data.areas.hasOwnProperty(state)) {
      return data.areas.state;
    } else {
      return 0;
    };
  },
  /**
   * Gets the number of alerts of the code specified
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string}
   **/
  getAlertCount: async (latitude, longitude, code) => {
    let alerts = await requestData("/alerts/active?point=" + latitude + "," + longitude + (typeof code !== "") ? "" : "&code=" + code);
    //let alerts = await response.json();
    if (alerts.features.length > 0) {
      return alerts.features.length;
    } else {
      return 0;
    }
  },
  /**
   * Gets the effective start time of the alert
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string}
   **/
  getAlertEffectiveTime: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    let alerts = await response.json();
    if (alerts.features.length > 0) {
      return alerts.features[0].properties.headline;
    } else {
      return "";
    }
  },
  /**
   * Gets the expiration time of the alert
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string}
   **/
  getAlertExpiresTime: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.expires;
  },
  /**
   * Gets the name of the event like "Severe Thunderstorm Warning" or "Tornado Warning"
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string}
   **/
  getAlertTitle: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.event;
  },
  /**
   * Gets the certainty of the warned weather happening from alert
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Certainty (observed, likely, possible, unlikely, unknown)
   **/
  getAlertCertainty: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.certainty;
  },
  /**
   * Gets the severity of the warned weather happening from alert
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} (extreme, severe, moderate, minor, unknown)
   **/
  getAlertSeverity: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.severity;
  },
  /**
   * Gets the urgency of the warned weather happening from alert
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Urgency (immediate, expected, future, past, unknown)
   **/
  getAlertUrgency: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.urgency;
  },
  /**
   * Gets the headline of the weather alert. this includes the name of the event, start time, end time and who sent it
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Headline of the weather alert
   **/
  getAlertHeadline: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.headline;
  },
  
  /**
   * Gets the headline of the weather alert. this includes the name of the event, start time, end time and who sent it
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Headline of the weather alert
   **/
  getAlertNWSHeadline: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.headline.parameters.NWSHeadline;
  },
  /**
   * Gets the description of the storm, what hazards are coming with it and where it will impact
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Description of alert
   **/
  getAlertDescription: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.description;
  },
  /**
   * Gets the instructions portion of the alert, tells you want to do if a tornado is coming
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} The very important instructions
   **/
  getAlertInstructions: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.instruction;
  },
  /**
   * Gets the what you should do from the alert. This could be "Shelter" or "Monitor"
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Action you should take
   **/
  getAlertResponse: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    return response.features[0].properties.response;
  },
  /**
   * Gets how the hail threat was detected from alert if it applies
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} How the hail threat was detected
   **/
  getAlertHailThreat: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    let alerts = await response.json();
    if(alerts.features[0].properties.parameters.hasOwnProperty("hailThreat")) {
      return alerts.features[0].properties.parameters.hailThreat[0];
    } else {
      return "";
    };
  },
  /**
   * Gets the maximum hail size from alert if it applies
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Maximum hail size
   **/
  getAlertMaxHailSize: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    if(response.features[0].properties.parameters.hasOwnProperty("maxHailSize")) {
      return response.features[0].properties.parameters.maxHailSize[0];
    } else {
      return "";
    };
  },
  /**
   * Gets how the tornado was detected or if one is possible from alert if it applies
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} How the tornado was detected or if one is possible
   **/
  getAlertTornadoDetection: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    if(response.features[0].properties.parameters.hasOwnProperty("tornadoDetection")) {
      return response.features[0].properties.parameters.tornadoDetection[0];
    } else {
      return "";
    };
  },
  /**
   * Gets how the wind threat was detected from alert if it applies
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} How the wind threat was detected
   **/
  getAlertWindThreat: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    if(response.features[0].properties.parameters.hasOwnProperty("windThreat")) {
      return response.features[0].properties.parameters.windThreat[0];
    } else {
      return "";
    };
  },
  /**
   * Gets the maximum wind gust from alert if it applies
   * @param {number|string} latitude - Latitude of the coordinate pair
   * @param {number|string} longitude - Longitude of the coordinate pair
   * @param {string} code - SAME code of event
   * @returns {string} Maximum wind gust
   **/
  getAlertMaxWindGust: async (latitude, longitude, code) => {
    let response = await requestData("/alerts/active?point=" + latitude + "," + longitude + "&code=" + code);
    if(response.features[0].properties.parameters.hasOwnProperty("maxWindGust")) {
      return response.features[0].properties.parameters.maxWindGust[0];
    } else {
      return "";
    };
  },
  /**
   * This gets the SPC outlook text
   * @returns {string} Returns outlook narrative
   **/
  getConvectiveNarrative: async (day) => {
    if(day >= 4) {
      outlookNarrativeId = JSON.parse(JSON.stringify(requestData("/products?wmoid=ACUS48&type=SWO&limit=1")).slice(86, -2)).id;
      outlookNarrative = requestData("/products/" + outlookNarrativeId).productText;
      return outlookNarrative;
    };
    if(day < 4) {
      outlookNarrativeId = JSON.parse(JSON.stringify(requestData("/products?wmoid=ACUS0" + day + "type=SWO&limit=1")).slice(86, -2)).id;
      outlookNarrative = requestData("/products/" + outlookNarrativeId).productText;
      return outlookNarrative;
    };
  },
  /**
   * This gets if a point is in sig hail
   * @param {number} day - Day to get sig hail for
   **/
  isInSigHail: async (day) => {
    let response = await requestOutlookData(day, "sighail");
    let data = await response.json();
    return data;
  },
  /**
   * This gets if a point is in a sig wind day 1
   * @param {number} day - Day to get sig wind for
   **/
  isInSigWind: async (day) => {
    let response = await requestOutlookData(day, "sigwind");
    let data = await response.json();
    return data;
  },
  /**
   * This gets the maximum probabilistic risk for only day 3
   **/
  getDay3ProbRisk: async () => {
    let response = await requestOutlookData(3, "cat");
    let data = await response.json();
    return data;
  },
  /**
   * This gets if a point is in a sig for only Day 3
   **/
  isInDay3Sig: async () => {
    let response = await requestOutlookData(3, "sigprob");
    let data = await response.json();
    return data;
  },
  /**
   * This gets the maximum tornado risk of the point on day 1
   * @param {number} day - Day to get convective risk on
   * @returns {number} Returns the maximum tornado risk of the point
   **/
  getTornadoRisk: async (day) => {
    let response = await requestOutlookData(day, "torn");
    let data = await response.json();
    return data;
  },
  /**
   * This gets the risk
   * @param {number} day - Day to get convective risk on
   **/
  getConvectiveRisk: async (day) => {
    let request = await requestOutlookData(day, "cat");
    let data = await request.json();
    return data;
  },
  /**
   * This gets the maximum wind risk of the point
   * @param {number} day - Day to get wind risk for
   **/
  getWindRisk: async (day) => {
    let request = await requestOutlookData(day, "wind");
    let data = await request.json();
    return data;
  },
  /**
   * This gets the maximum hail risk of the point
   * @param {number} day - Day to get hail risk for
   **/
  getHailRisk: async (day) => {
    let request = await requestOutlookData(day, "hail");
    let data = await request.json();
    return data;
  },
};