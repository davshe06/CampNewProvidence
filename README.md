# Carolina War History Interactive Map

An interactive map of Revolutionary War and Civil War history across North and
South Carolina. The header switches between three areas:

- **Charlotte area**, centred on Camp New Providence, the Southern Continental
  Army's encampment on Six Mile Creek (Providence Road / NC 16, at the
  Mecklenburg–Union county line) from about October 20 to mid-December 1780, with
  the 1780–81 campaign around it and Civil War Charlotte.
- **Charleston area**: Sullivan's Island 1776, the sieges of 1779–80 and the
  occupation; Fort Sumter, Secessionville, Fort Wagner, the Planter, the Hunley,
  and the shipwrecks of the blockade.
- **Carolinas**: both whole states. About 50 more sites, from the Regulators at
  Alamance (1771) and Moores Creek (1776) through Marion's partisan war and Eutaw
  Springs, to Hatteras, Roanoke Island, New Bern, Plymouth and the CSS Albemarle,
  Port Royal and the Combahee River raid, Fort Fisher, Sherman's march, Bentonville
  and Bennett Place. The Story, People, Detecting, Visit and Library tabs cover
  both states.

The map shows every site of the selected war in all three areas; the area choice
sets the starting view and what the tabs list.

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
- **Army and ship movements**, with ½×, 1× and 2× playback, in 13 timelines. Revolution:
  North Carolina 1775–76 (Moores Creek), Sullivan's Island 1776, the Siege of Charleston
  1780, the Southern Campaign 1780–81, North Carolina 1781 (Guilford, Pyle's Defeat,
  Fanning) and South Carolina 1781 (Greene, Marion and Lee to Eutaw Springs). Civil War:
  Fort Sumter 1860–61, Port Royal and the Sea Islands 1861–63, the North Carolina coast
  1861–62, the Charleston harbor war 1862–65, Plymouth and the Albemarle 1864, Fort Fisher
  and Wilmington 1864–65, and Sherman's march and the end in the Carolinas, 1865.
  **The slider follows the map**: each timeline has a geographic box, and as you pan or
  zoom it switches to the timeline with the most going on in view. Selecting a site
  jumps to its timeline and date. The drop-down lists every timeline of the war; one
  picked by hand stays until you move out of its region. Ships are drawn as boats. The
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
15,000+ with 2020 populations (towns appear by size as you zoom), about 40 named major
rivers, lakes and sounds over 25 km², state boundaries, and the ocean (everything
outside the state outlines).

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
