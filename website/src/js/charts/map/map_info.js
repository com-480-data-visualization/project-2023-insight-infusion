/* the code for the infobar showing information about a country */

let viewTimer = null

export const viewCountryInfo = (countryName, manufacturingScore = undefined, originScore = undefined) => {
  const infoElement = document.getElementById("map-info")
  const infoTitle = document.getElementById("map-info-name")

  infoTitle.innerHTML = countryName

  // make info box visible and start timer to hide it again
  infoElement.style.opacity = 1

  if (viewTimer != null) {
    clearTimeout(viewTimer)
    viewTimer = null
  }

  viewTimer = setTimeout(() => {
    infoElement.style.opacity = 0
    viewTimer = null
  }, 1000)
}