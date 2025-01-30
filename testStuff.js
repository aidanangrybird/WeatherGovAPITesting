var gju = require("./geojson-utils");
var weatherGovAPI = require("./apiStuff.js");

//Need to add error handling so that in case there are no alerts available for an area, it tells you that there are none

//Yay a testing function thing
async function thing() {
  console.log(await weatherGovAPI.getWFO(35.246, -97.472));
  console.log(await weatherGovAPI.getAlertCountByState())
};

thing()

//For sure add option to switch between OWL and SPC convective forecasts

//Create functions that can deconstruct the api data so each part of the zone or alert can be individually addressed
//This will be better than having to do the pain of what I had to do in coordinateSelectionHelper
//Also another part that will need to be done is decontructing the product text in a way where
//we can pull out coordinates and probabilities


//API documentation: https://www.weather.gov/documentation/services-web-api
//Some important NWS API Product Type Code:
//WWP: Severe Thunderstorm / Tornado Watch Probabilities
//PWO: Public Severe Weather Outlook
//HWO: Hazardous Weather Outlook
//PTS: Probabilistic Outlook Points (More notes on this below)
//This is the coordinates and probabilities for each of the convective outlooks.
//The wmoCollectiveID within each of them is how we would get which day that product is for
//WUUS01 is day 1 outlook, WUUS02 is day 2 outlook, WUUS03 is day 3 outlook, WUUS48 is days 4-8 outlook
//SWO: Severe Storm Outlook Narrative (AC)
//This is the text portion of the convective outlooks
//SEL: Severe Local Storm Watch and Watch Cancellation Msg
//The ones below will be handled with the active alerts section of the api:
//TOR: Tornado Warning
//SVR: Sever Thunderstorm Warning
//SVS: Special Weather Statement