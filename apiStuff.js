const fs = require('node:fs');
let axios = require("axios");
var gju = require("geojson-utils");
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const apiNWS = "https://api.weather.gov";
const apiSPC = "https://www.spc.noaa.gov/products";
const longCoordRegEx = new RegExp("(?:([^\\D]*)(-?)(\\d{0,3})\\.(\\d+))");
const shortCoordRegEx = new RegExp("\\d{8}", "g");
var xhr = new XMLHttpRequest();
xhr.responseType = "json";

function testThing(day, type, date, time) {
  if (typeof date !== "string") {
    date = "20230331";
  };
  if (typeof time !== "string") {
    time = "2000";
  };
  var thing = "./test/day" + day + "otlk_" + date + "_" + time + "_" + type + ".lyr.geojson";
  try {
    const data = JSON.parse(fs.readFileSync(thing, 'utf8')).features;
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
function requestData(url) {
  var apiUrl = apiNWS + url;
  xhr.open("GET", apiUrl, false);
  xhr.setRequestHeader("User-Agent", "(Oklahoma Weather Lab, owl@ou.edu)");
  xhr.send();
  return JSON.parse(xhr.responseText);
}

/**
 * Gets outlook data from spc.noaa.gov
 * @param {number|string} day - Day of outlook 1-8
 * @param {string} type - Type of outlook data
 * @returns {object} This is to get the name and other values for a county
 **/
function requestOutlookData(day, type) {
  if (day < 4) {
    var apiUrl = apiSPC + "/outlook/day" + day + "otlk_" + type + ".lyr.geojson";
  }
  if (day > 3) {
    var apiUrl = apiSPC + "/exper/day4-8/day" + day + "prob.lyr.geojson";
  }
  xhr.open("GET", apiUrl, false);
  xhr.setRequestHeader("User-Agent", "(Oklahoma Weather Lab, owl@ou.edu)");
  xhr.send();
  return JSON.parse(xhr.responseText).features;
}

//https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson

function checkCoordinates(latitude, longitude) {
  if (longCoordRegEx.test(longitude) && longCoordRegEx.test(latitude)) {
    return true;
  };
  if (!longCoordRegEx.test(longitude) || !longCoordRegEx.test(latitude)) {
    return false;
  };
}

module.exports = {
/**
 * Gets county from coordinates (Might be very useless)
 * @param {number|string} latitude - Latitude of the coordinate pair
 * @param {number|string} longitude - Longitude of the coordinate pair
 * @returns - This is to get the name and other values for a county
 **/
getCountyFromCoords: (latitude, longitude) => {
  var county = requestData("/zones?type=county&point=" + latitude + "," + longitude).features[0].properties;
  //var county = requestData("/zones?type=county&point=" + latitude + "," + longitude).features[0].properties;
  var obj = {
    /**
     * Gets the name of the county
     * @returns {string} County name
     **/
    getName: () => {
      return county.name;
    },
    /**
     * Gets the ID of the county
     * @returns {string} County ID
     **/
    getID: () => {
      return county.id;
    },
    /**
     * Gets the two letter state the county is in
     * @returns {string} State
     **/
    getState: () => {
      return county.state;
    },
    /**
     * Gets the WFO the county is in
     * @returns {string}
     **/
    getWFO: () => {
      return county.cwa[0];
    },
  };
  return obj;
},
//(Might be very useless)
getForecastZoneFromCoords: (latitude, longitude) => {
  var forecastZone = requestData("/zones?type=forecast&point=" + latitude + "," + longitude).features[0].properties;
  var obj = {
    getName: () => {
      return forecastZone.name;
    },
    getID: () => {
      return forecastZone.id;
    },
    getState: () => {
      return forecastZone.state;
    },
    getWFO: () => {
      return forecastZone.cwa[0];
    },
  };
  return obj;
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
getAlerts: (latitude, longitude, code) => {
  var alerts = requestData("/alerts?point=" + latitude + "," + longitude + "&code=" + code).features;
  var obj = {
    /**
     * Gets the number of alerts of the code specified
     * @returns {string}
     **/
    getFull: () => {
      return alerts[0];
    },
    /**
     * Gets the number of alerts of the code specified
     * @returns {string}
     **/
    getAmount: () => {
      return alerts.length;
    },
    /**
     * Gets the effective start time of the alert
     * @returns {string}
     **/
    getEffectiveTime: () => {
      return alerts[0].properties.effective;
    },
    /**
     * Gets the expiration time of the alert
     * @returns {string}
     **/
    getExpiresTime: () => {
      return alerts[0].properties.expires;
    },
    /**
     * Gets the name of the event like "Severe Thunderstorm Warning" or "Tornado Warning"
     * @returns {string}
     **/
    getEventName: () => {
      return alerts[0].properties.event;
    },
    /**
     * Gets the certainty of the warned weather happening from alert
     * @returns {string} Certainty (observed, likely, possible, unlikely, unknown)
     **/
    getCertainty: () => {
      return alerts[0].properties.certainty;
    },
    /**
     * Gets the severity of the warned weather happening from alert
     * @returns {string} (extreme, severe, moderate, minor, unknown)
     **/
    getSeverity: () => {
      return alerts[0].properties.severity;
    },
    /**
     * Gets the urgency of the warned weather happening from alert
     * @returns {string} Urgency (immediate, expected, future, past, unknown)
     **/
    getUrgency: () => {
      return alerts[0].properties.urgency;
    },
    /**
     * Gets the headline of the weather alert. this includes the name of the event, start time, end time and who sent it
     * @returns {string} Headline of the weather alert
     **/
    getHeadline: () => {
      return alerts[0].properties.headline;
    },
    /**
     * Gets the description of the storm, what hazards are coming with it and where it will impact
     * @returns {string} Description of alert
     **/
    getDescription: () => {
      return alerts[0].properties.description;
    },
    /**
     * Gets the instructions portion of the alert, tells you want to do if a tornado is coming
     * @returns {string} The very important instructions
     **/
    getInstructions: () => {
      return alerts[0].properties.instruction;
    },
    /**
     * Gets the what you should do from the alert. This could be "Shelter" or "Monitor"
     * @returns {string} Action you should take
     **/
    getResponse: () => {
      return alerts[0].properties.response;
    },
    /**
     * Gets how the hail threat was detected from alert if it applies
     * @returns {string} How the hail threat was detected
     **/
    getHailThreat: () => {
      if (alerts[0].properties.parameters.hasOwnProperty("hailThreat")) {
        return alerts[0].properties.parameters.hailThreat[0];
      } else {
        return "";
      };
    },
    /**
     * Gets the maximum hail size from alert if it applies
     * @returns {string} Maximum hail size
     **/
    getMaxHailSize: () => {
      if (alerts[0].properties.parameters.hasOwnProperty("maxHailSize")) {
        return alerts[0].properties.parameters.maxHailSize[0];
      } else {
        return "";
      };
    },
    /**
     * Gets how the tornado was detected or if one is possible from alert if it applies
     * @returns {string} How the tornado was detected or if one is possible
     **/
    getTornadoDetection: () => {
      if (alerts[0].properties.parameters.hasOwnProperty("tornadoDetection")) {
        return alerts[0].properties.parameters.tornadoDetection[0];
      } else {
        return "";
      };
    },
    /**
     * Gets how the wind threat was detected from alert if it applies
     * @returns {string} How the wind threat was detected
     **/
    getWindThreat: () => {
      if (alerts[0].properties.parameters.hasOwnProperty("windThreat")) {
        return alerts[0].properties.parameters.windThreat[0];
      } else {
        return "";
      };
    },
    /**
     * Gets the maximum wind gust from alert if it applies
     * @returns {string} Maximum wind gust
     **/
    getMaxWindGust: () => {
      if (alerts[0].properties.parameters.hasOwnProperty("maxWindGust")) {
        return alerts[0].properties.parameters.maxWindGust[0];
      } else {
        return "";
      };
    },
  };
  return obj;
  //Gonna add more stuff to these so we can get more specific with functions
},

/**
 * This gets the SPC outlook text, probablities and coordinates
 * @param {number} day - What day outlook you want. Days 4-8 should be entered as 48
 * @returns Returns both the probability points and outlook narrative
 **/
getSPCOutlook: (day) => {
  var obj = {
    /**
     * This gets the SPC outlook text
     * @returns {string} Returns outlook narrative
     **/
    getNarrative: () => {
      if (day >= 4) {
        outlookNarrativeId = JSON.parse(JSON.stringify(requestData("/products?wmoid=ACUS48&type=SWO&limit=1")).slice(86, -2)).id;
        outlookNarrative = requestData("/products/" + outlookNarrativeId).productText;
        return outlookNarrative;
      };
      if (day < 4) {
        outlookNarrativeId = JSON.parse(JSON.stringify(requestData("/products?wmoid=ACUS0" + day + "type=SWO&limit=1")).slice(86, -2)).id;
        outlookNarrative = requestData("/products/" + outlookNarrativeId).productText;
        return outlookNarrative;
      };
    },
    /**
     * This gets if a point is in a significant tornado risk area
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {boolean} Returns whether or not inputed point is in a significant tornado risk area
     **/
    inSigTornado: (latitude, longitude) => {
      var coordsIn = false;
      if (day > 2) {
        return false;
      } else {
        data = requestOutlookData(day, "sigtorn");
        data.forEach(feat => {
          if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry)) {
            coordsIn = true;
          };
        });
        return coordsIn;
      };
    },
    /**
     * This gets if a point is in a sig hail
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {boolean} Returns whether or not inputed point is in sig hail
     **/
    inSigHail: (latitude, longitude) => {
      var coordsIn = false;
      if (day > 2) {
        return false;
      } else {
        data = requestOutlookData(day, "sighail");
        data.forEach(feat => {
          if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry)) {
            coordsIn = true;
          };
        });
        return coordsIn;
      };
    },
    /**
     * This gets if a point is in a sig wind
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {boolean} Returns whether or not inputed point is in sig wind
     **/
    inSigWind: (latitude, longitude) => {
      var coordsIn = false;
      if (day > 2) {
        return false;
      } else {
        data = requestOutlookData(day, "sigwind");
        data.forEach(feat => {
          if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry)) {
            coordsIn = true;
          };
        });
        return coordsIn;
      };
    },
    /**
     * This gets if a point is in a sig for only Day 3
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {boolean} Returns whether or not inputed point is in sig for only Day 3
     **/
    inSig: (latitude, longitude) => {
      var coordsIn = false;
      if (day != 3) {
        return false;
      } else {
        data = requestOutlookData(3, "sigprob");
        data.forEach(feat => {
          if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry)) {
            coordsIn = true;
          };
        });
        return coordsIn;
      };
    },
    /**
     * This gets the maximum tornado risk of the point
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {number} Returns the maximum tornado risk of the point
     **/
    getTornadoRisk: (latitude, longitude) => {
      var maxRisk = 0;
      if (day > 2) {
        return false;
      } else {
        data = requestOutlookData(day, "torn");
        data.forEach(feat => {
          if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry) && maxRisk < feat.properties.DN) {
            maxRisk = feat.properties.DN;
          };
        });
        return maxRisk;
      };
    },
    /**
     * This gets the maximum wind risk of the point
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {number} Returns the maximum wind risk of the point
     **/
    getWindRisk: (latitude, longitude) => {
      var maxRisk = 0;
      if (day > 2) {
        return false;
      } else {
        data = requestOutlookData(day, "wind");
        data.forEach(feat => {
          if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry) && maxRisk < feat.properties.DN) {
            maxRisk = feat.properties.DN;
          };
        });
        return maxRisk;
      };
    },
    /**
     * This gets the maximum hail risk of the point
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {number} Returns the maximum hail risk of the point
     **/
    getHailRisk: (latitude, longitude) => {
      var maxRisk = 0;
      if (day > 2) {
        return false;
      } else {
        data = requestOutlookData(day, "hail");
        data.forEach(feat => {
          if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry) && maxRisk < feat.properties.DN) {
            maxRisk = feat.properties.DN;
          };
        });
        return maxRisk;
      };
    },
    /**
     * This gets the maximum probabilistic risk
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {string|number} Returns the maximum probabilistic risk of the point
     **/
    getProbRisk: (latitude, longitude) => {
      var maxRisk = 0;
      if (day != 3) {
        return 0;
      };
      data = requestOutlookData(3, "cat");
      data.forEach(feat => {
        if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry) && maxRisk < feat.properties.DN) {
          maxRisk = feat.properties.DN;
        };
      });
      return maxRisk;
    },
    /**
     * This gets the risk
     * @param {number} latitude - Latitude of point
     * @param {number} longitude - Longitude of point
     * @returns {string|number} Returns the categorical risk or probability of the point
     **/
    getRisk: (latitude, longitude) => {
      data = requestOutlookData(day, "cat");
      var maxRisk = 0;
      data.forEach(feat => {
        if (gju.pointInMultiPolygon({"type":"Point","coordinates":[longitude,latitude]}, feat.geometry) && maxRisk < feat.properties.DN) {
          maxRisk = feat.properties.DN;
        };
      });
      if (day < 4) {
        if (maxRisk == 0) {
          return "NONE";
        };
        if (maxRisk == 2) {
          return "TMST";
        };
        if (maxRisk == 3) {
          return "MRGL";
        };
        if (maxRisk == 3) {
          return "SLGT";
        };
        if (maxRisk == 3) {
          return "ENH";
        };
        if (maxRisk == 6) {
          return "MDT";
        };
        if (maxRisk == 8) {
          return "HIGH";
        };
      };
      if (day > 3) {
        return maxRisk;
      };
    },
  };
  return obj;
}
};