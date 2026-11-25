# Carolina War History Interactive Map

An interactive map of Revolutionary War and Civil War history in two Carolina
areas, switched with the toggle in the header:

- **Charlotte area**, centred on Camp New Providence, the Southern Continental
  Army's encampment on Six Mile Creek (Providence Road / NC 16, at the
  Mecklenburg–Union county line) from about October 20 to mid-December 1780, with
  the 1780–81 campaign around it and Civil War Charlotte.
- **Charleston area**: Sullivan's Island 1776, the sieges of 1779–80 and the
  occupation; Fort Sumter, Secessionville, Fort Wagner, the Planter, the Hunley,
  and the shipwrecks of the blockade.

Serve the folder from any static web server (GitHub Pages does this) and open
`index.html`. It needs no build step and no map tiles: everything is drawn as SVG.
The page loads two data files next to it, so opening it straight from disk
(`file://`) shows the map without homes or the Charleston coastline:

- `homes.json`: homes near North Carolina sites, one record per line.
- `charleston-water.json`: Charleston-area water polygons.
- `basemap.json`: the regional base map (interstates, US highways, towns, major
  rivers, large lakes and sounds, state lines).

Contents:

- **Two eras**: a toggle switches the map, story, people and tour between the
  Revolutionary War (the 1780 camp and the Charlotte area) and Civil War Charlotte.
- **Library** tab: original letters (Founders Online, American Revolution
  Institute), Library of Congress maps and fort plans, articles, documentaries and
  podcasts, filtered by area and war.
- **Army and ship movements** for every area and war, with ½×, 1× and 2× playback and a
  picker where an area has more than one timeline: the Southern Campaign 1780–81
  (Charlotte), Sullivan's Island 1776 and the Siege of Charleston 1780, Fort Sumter
  1860–61 and the harbor war 1862–65 (Charleston), and 1865 in the Carolinas: Sherman,
  Johnston, Stoneman and Davis's flight (Charlotte). Ships are drawn as boats. The
  original Charlotte timeline: April 20, 1780 to June 20, 1781, six months either
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

**Regional base map**: U.S. Census Bureau TIGERweb (public domain): interstates and
US highways, incorporated places of 2,500+ people and census-designated places of
15,000+ with 2020 populations (towns appear by size as you zoom), 33 named major
rivers, lakes and sounds over 25 km², and state boundaries.

**Charleston water**: U.S. Census Bureau TIGER areal hydrography (harbor, rivers,
creeks, sounds and the ocean to about 3 nautical miles, public domain), with open
ocean added beyond that line. Wreck positions are approximate.
Charleston has detecting zones but no homes, because the state parcel service used
for homes covers North Carolina only.

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

- **Charleston homes**: 1,852 residential parcels (class 1xx with a building value) near
  14 Charleston-area sites, from Charleston County's assessor-joined parcel map
  (`gisccapps.charlestoncounty.org`, CDC_ParcelMap). The county doesn't publish year built,
  so those show "not recorded". Owner names are never requested.

Site points (the marker, the creek crossing, the church) are placed from
published descriptions against that base. The marker stands on NC 16 between
Belicourt Drive and the creek. Regional rivers, the state line and the 1780
road beyond the camp area are simplified sketches. The camp layout and
detecting zones are inferences from period camp practice, not from survey or
reported finds.

Note: the camp dates to the Revolutionary War, not the Civil War, despite
some online listings.
