# Camp New Providence interactive map

A single-file interactive map of Camp New Providence, the Southern Continental
Army's encampment on Six Mile Creek (Providence Road / NC 16, at the
Mecklenburg–Union county line) from about October 20 to mid-December 1780.

Open `index.html` in a browser. It needs no build step and no map tiles:
everything is drawn as SVG from data embedded in the page, and every site links
out to Google Maps for imagery.

Contents:

- **Two eras**: a toggle switches the map, story, people and tour between the
  Revolutionary War (the 1780 camp and the Charlotte area) and Civil War Charlotte.
- **Time slider** (Revolutionary War): April 20, 1780 to June 20, 1781, six months either
  side of the camp. Ten forces move along dated waypoints with trails; battles pulse as
  the date passes. Routes between waypoints are straight lines.
- **Address lookup**: type any North Carolina address to drop a pin and see its distance
  to the camp, the nearest site, and whether it sits on the camp ground. Uses the State's
  AddressNC geocoder from the browser; where that is unreachable it searches the built-in
  home addresses only.
- **Portraits** load from Wikimedia Commons (public domain or freely licensed, credited
  per image). People with no known or verified likeness get a lettered placeholder.

- **Map views**: the camp vicinity, uptown Charlotte, and the 1780–81 Southern Campaign.
- **Layers**: creeks and the 1780 road, a conjectural camp layout, campaign sites,
  metal-detecting potential zones, modern roads and towns, Civil War and later
  Charlotte sites, and a lat/long graticule.
- **Panel tabs**: site details, timeline, important figures, a detecting guide with
  legal notes and a musket-ball calculator, a driving tour, and sources.

## Data

Around the camp the base map is real geometry from NC OneMap
(`services.gis.nc.gov`), fetched November 2026 and embedded in the page:

- **Six Mile Creek**: traced from the Mecklenburg–Union county line (voting
  precinct boundaries), which follows the creek west of NC 16. East of NC 16
  the line is a straight survey line and the creek leaves it.
- **Roads**: NG911 street centrelines for NC 16, I-485, Ardrey Kell, Rea,
  Ballantyne Commons, Weddington, Marvin, New Town and Tilley Morris roads.
- **Creeks**: McAlpine, Twelve Mile and Sugar creeks from major hydrography.
- **Homes on the camp ground**: 901 parcels with a recorded year built whose lot
  centre falls inside the conjectural camp layout or a detecting zone. Each has
  its site address, year built and subdivision. Owner names are deliberately
  left out. Lot lines are parcel boundaries, not building footprints.

Site points (the marker, the creek crossing, the church) are placed from
published descriptions against that base. The marker stands on NC 16 between
Belicourt Drive and the creek. Regional rivers, the state line and the 1780
road beyond the camp area are simplified sketches. The camp layout and
detecting zones are inferences from period camp practice, not from survey or
reported finds.

Note: the camp dates to the Revolutionary War, not the Civil War, despite
some online listings.
