/* the code for the infobar showing information about a country */

let viewTimer = null

export const viewCountryInfo = (countryName, transportationLength = undefined, manufacturingScore = undefined, originScore = undefined) => {
  const infoElement = document.getElementById("map-info")
  const infoTitle = document.getElementById("map-info-name")
  const infoLength = document.getElementById("map-info-length")
  
  if (infoTitle.innerHTML != countryName || infoLength.innerHTML == "") {
    infoTitle.innerHTML = countryName
    
    if (transportationLength != undefined) {
      infoLength.innerHTML = `Typical transportation length of ${transportationLength.toFixed(0)} km`
    } else {
      infoLength.innerHTML = ""
    }
    // make info box visible and start timer to hide it again
    infoElement.style.opacity = 1
  }
  
  
  
  if (viewTimer != null) {
    clearTimeout(viewTimer)
    viewTimer = null
  }
  
  const length_changed = transportationLength != undefined || infoTitle.innerHTML != countryName && infoLength.innerHTML == ""

  viewTimer = setTimeout(() => {
    infoElement.style.opacity = 0
    viewTimer = null
  }, length_changed ? 9999999 : 1000)
}