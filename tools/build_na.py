"""Build na.json: North America beyond the mapped states, with period borders for each war.

Geometry: Natural Earth 1:50m admin-0 countries, admin-1 states/provinces and lakes (public domain).
Political areas are assembled from modern units (split where a period line differs a lot), so they
are approximate. Each war has a list of rules: piece ids -> [(until ISO date, region name, class)].
"""
import json, sys
import shapely
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, box, mapping
from shapely.ops import unary_union, split

S = sys.argv[1]
NE = S + '/ne/'
OUT = sys.argv[2]
adm1 = json.load(open(NE + 'ne_50m_admin_1_states_provinces.geojson'))['features']
adm0 = json.load(open(NE + 'ne_50m_admin_0_countries.geojson'))['features']
lakes = json.load(open(NE + 'ne_50m_lakes.geojson'))['features']
cov_shapes = json.load(open(S + '/state_shapes.json'))
COVERED = set(cov_shapes)
NA_BOX = box(-170, 5, -10, 84)

def poly_parts(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if isinstance(g, MultiPolygon): return list(g.geoms)
    return [p for x in getattr(g, 'geoms', []) for p in poly_parts(x)]

pieces = {}
def add(pid, g):
    g = g.buffer(0)
    if not g.is_empty: pieces[pid] = unary_union([pieces[pid], g]) if pid in pieces else g

for f in adm1:
    p = f['properties']
    if p['admin'] == 'United States of America' and p['postal'] != 'HI':
        add('US-' + p['postal'], shape(f['geometry']))
    elif p['admin'] == 'Canada':
        add('CA-' + p['postal'], shape(f['geometry']))

CARIB_OK = None
for f in adm0:
    p = f['properties']; g = shape(f['geometry'])
    nm = p['NAME']
    if p['CONTINENT'] == 'North America' and nm not in ('United States of America', 'Canada'):
        add('C-' + nm, g)
    elif nm in ('France', 'Netherlands'):
        part = g.intersection(box(-75, 10, -55, 20))
        if not part.is_empty: add('C-' + nm + '-carib', part)
    elif p['CONTINENT'] == 'South America':
        part = g.intersection(box(-90, 5, -50, 15))
        if not part.is_empty: add('SA-' + nm, part)

def cut(pid, keep_a, keep_b, ida, idb):
    g = pieces.pop(pid)
    a = unary_union([q for q in poly_parts(g) if keep_a(q)]) if callable(keep_a) else g.intersection(keep_a)
    b = g.difference(a)
    pieces[ida] = a; pieces[idb] = b

# splits where a period line differs a lot from a modern one
cut('US-AL', box(-90, 31.0, -80, 36), None, 'US-AL_N', 'US-AL_S')
mn_east = Polygon([(-91.22, 43.5), (-92.0, 44.4), (-93.27, 44.98), (-94.3, 45.6), (-94.36, 46.4), (-94.2, 47.0), (-95.2, 47.24), (-95.2, 49.5), (-89, 49.5), (-89, 43.4)])
cut('US-MN', mn_east, None, 'US-MN_E', 'US-MN_W')
cut('CA-ON', box(-96, 40, -70, 50.0), None, 'CA-ON_S', 'CA-ON_N')
cut('CA-QC', box(-80, 40, -55, 50.5), None, 'CA-QC_S', 'CA-QC_N')
cut('CA-NS', lambda q: not (q.centroid.x > -61.65 and q.centroid.y > 45.55), None, 'CA-NS_M', 'CA-NS_CB')
cut('CA-NL', lambda q: q.centroid.y < 51.7 and q.centroid.x > -59.6, None, 'CA-NL_I', 'CA-NL_L')

covered_union = unary_union([Polygon([(lo, la) for la, lo in ring]).buffer(0) for rings in cov_shapes.values() for ring in rings])

# simplify all pieces together so shared borders stay shared
ids = list(pieces)
simp = shapely.coverage_simplify([pieces[i] for i in ids], 0.03)
pieces = {i: g.buffer(0) for i, g in zip(ids, simp)}

def drop_small(g, min_area):
    return unary_union([q for q in poly_parts(g) if q.area >= min_area or (q.centroid.y < 27 and q.area >= 0.004)])

land = drop_small(unary_union(list(pieces.values())), 0.02)

# ---- period rules ------------------------------------------------------------------------------
US = lambda *a: ['US-' + x for x in a]
CA = lambda *a: ['CA-' + x for x in a]
C = lambda *a: ['C-' + x for x in a]
PLAINS = US('ND', 'SD', 'NE', 'KS', 'OK', 'MT', 'WY', 'CO')
WEST_LA = US('LA', 'AR', 'MO', 'IA', 'MN_W') + PLAINS
SW = US('TX', 'NM', 'AZ', 'CA', 'NV', 'UT')
CENTAM = C('Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama')
RUPERT = CA('ON_N', 'QC_N', 'MB', 'SK', 'AB', 'NU')
BRIT_ISLES = C('Jamaica', 'Bahamas', 'Bermuda', 'Barbados', 'Antigua and Barb.', 'St. Kitts and Nevis', 'Montserrat', 'Anguilla', 'British Virgin Is.', 'Cayman Is.', 'Turks and Caicos Is.')
FR_ISLES = C('France-carib')
DUTCH = C('Netherlands-carib', 'Aruba', 'Curaçao', 'Sint Maarten')
X = '9999'
R = lambda *steps: list(steps)

WARS = {}
WARS['fiw'] = [
  (CA('QC_S', 'ON_S'), R(('1760-09-08', 'New France (Canada)', 'b'), (X, 'Canada, British from 1760', 'r'))),
  (CA('NB'), R(('1755-06-16', 'Acadia, French claim', 'b'), (X, 'Nova Scotia', 'r'))),
  (CA('NS_CB', 'PE'), R(('1758-07-26', 'Île Royale and Île Saint-Jean', 'b'), (X, 'Nova Scotia', 'r'))),
  (CA('NS_M'), R((X, 'Nova Scotia', 'r'))),
  (CA('NL_I'), R((X, 'Newfoundland', 'r'))),
  (CA('NL_L'), R(('1763-02-10', 'Native nations', 'nat'), (X, 'Newfoundland', 'r'))),
  (RUPERT, R((X, "Rupert's Land (Hudson's Bay Co.)", 'r'))),
  (CA('NT', 'YT', 'BC') + US('AK', 'WA', 'OR', 'ID'), R((X, 'Native nations', 'nat'))),
  (US('MI'), R(('1760-11-29', "Pays d'en Haut", 'b'), (X, 'Reserved for Native nations (British)', 'r'))),
  (US('WI', 'IL', 'MN_E'), R(('1763-02-10', "Pays d'en Haut", 'b'), (X, 'Reserved for Native nations (British)', 'r'))),
  (US('AL_N'), R((X, 'Native nations', 'nat'))),
  (US('AL_S'), R(('1763-02-10', 'Louisiana', 'b'), (X, 'West Florida (British)', 'r'))),
  (WEST_LA, R(('1763-02-10', 'Louisiana', 'b'), (X, 'Louisiana, Spanish from 1762', 'es'))),
  (SW + CENTAM + C('Cuba', 'Puerto Rico', 'Dominican Rep.', 'Trinidad and Tobago'), R((X, 'New Spain', 'es'))),
  (C('Haiti') + FR_ISLES + C('Saint Lucia'), R((X, 'French Caribbean', 'b'))),
  (C('Dominica', 'Grenada', 'St. Vin. and Gren.'), R(('1763-02-10', 'French Caribbean', 'b'), (X, 'British Caribbean', 'r'))),
  (BRIT_ISLES, R((X, 'British Caribbean', 'r'))),
  (C('St. Pierre and Miquelon'), R(('1763-02-10', 'Newfoundland', 'r'), (X, 'Saint-Pierre (French)', 'b'))),
  (C('U.S. Virgin Is.') + DUTCH + C('Greenland'), R((X, 'Danish and Dutch', 'neu'))),
]
WARS['rev'] = [
  (CA('QC_S', 'ON_S'), R((X, 'Province of Quebec', 'r'))),
  (US('MI', 'WI', 'MN_E'), R(('1783-09-03', 'Province of Quebec', 'r'), (X, 'United States (1783 treaty)', 'b'))),
  (US('IL'), R(('1778-07-04', 'Province of Quebec', 'r'), (X, 'Illinois County, Virginia', 'b'))),
  (US('AL_N'), R((X, 'Native nations', 'nat'))),
  (US('AL_S'), R(('1780-03-14', 'West Florida (British)', 'r'), (X, 'West Florida (Spanish from 1780)', 'es'))),
  (WEST_LA, R((X, 'Louisiana (Spanish)', 'es'))),
  (SW + CENTAM + C('Cuba', 'Puerto Rico', 'Dominican Rep.', 'Trinidad and Tobago'), R((X, 'New Spain', 'es'))),
  (CA('NB', 'NS_M', 'NS_CB', 'PE'), R((X, 'Nova Scotia', 'r'))),
  (CA('NL_I', 'NL_L'), R((X, 'Newfoundland', 'r'))),
  (RUPERT, R((X, "Rupert's Land (Hudson's Bay Co.)", 'r'))),
  (CA('NT', 'YT', 'BC') + US('AK', 'WA', 'OR', 'ID'), R((X, 'Native nations', 'nat'))),
  (C('Haiti', 'Saint Lucia', 'St. Pierre and Miquelon') + FR_ISLES, R((X, 'France (U.S. ally)', 'b2'))),
  (BRIT_ISLES + C('Dominica', 'Grenada', 'St. Vin. and Gren.'), R((X, 'British Caribbean', 'r'))),
  (C('U.S. Virgin Is.') + DUTCH + C('Greenland'), R((X, 'Danish and Dutch', 'neu'))),
]
WARS['w12'] = [
  (CA('ON_S'), R((X, 'Upper Canada', 'r'))),
  (CA('QC_S'), R((X, 'Lower Canada', 'r'))),
  (CA('NB', 'NS_M', 'NS_CB', 'PE', 'NL_I', 'NL_L'), R((X, 'British Atlantic colonies', 'r'))),
  (RUPERT + CA('NT', 'YT'), R((X, "Rupert's Land (Hudson's Bay Co.)", 'r'))),
  (US('LA'), R((X, 'United States', 'b'))),
  (US('MI'), R(('1812-08-16', 'U.S. territories', 'b2'), ('1813-09-29', 'Michigan, British-occupied', 'r'), (X, 'U.S. territories', 'b2'))),
  (US('WI', 'IL', 'MN_E', 'AL_N') + US('MN_W', 'IA', 'MO', 'AR') + PLAINS, R((X, 'U.S. territories', 'b2'))),
  (US('AL_S'), R(('1813-04-15', 'West Florida (Spanish)', 'es'), (X, 'U.S. territories', 'b2'))),
  (SW + CENTAM + C('Cuba', 'Puerto Rico', 'Dominican Rep.'), R((X, 'New Spain', 'es'))),
  (US('WA', 'OR', 'ID') + CA('BC'), R((X, 'Oregon Country (disputed)', 'dis'))),
  (US('AK'), R((X, 'Russian America', 'ru'))),
  (C('Haiti'), R((X, 'Haiti (independent 1804)', 'neu'))),
  (BRIT_ISLES + FR_ISLES + C('Saint Lucia', 'Dominica', 'Grenada', 'St. Vin. and Gren.', 'Trinidad and Tobago', 'U.S. Virgin Is.', 'Curaçao', 'St. Pierre and Miquelon'), R((X, 'British Caribbean', 'r'))),
  (C('Netherlands-carib', 'Aruba', 'Sint Maarten', 'Greenland'), R((X, 'Danish and Dutch', 'neu'))),
]
WARS['tx'] = [
  (US('LA', 'AR', 'MO', 'MI', 'IL', 'WI', 'MN_E', 'MN_W', 'IA', 'KS', 'NE', 'ND', 'SD', 'MT', 'WY', 'CO', 'AL_N', 'AL_S'), R((X, 'United States (neutral)', 'neu'))),
  (US('OK'), R((X, 'Indian Territory (U.S.)', 'nat'))),
  (US('NM', 'AZ', 'CA', 'NV', 'UT') + C('Mexico'), R((X, 'Mexico', 'r'))),
  (US('WA', 'OR', 'ID') + CA('BC'), R((X, 'Oregon Country (joint U.S.–British)', 'dis'))),
  (CA('ON_S', 'QC_S', 'NB', 'NS_M', 'NS_CB', 'PE', 'NL_I', 'NL_L') + RUPERT + CA('NT', 'YT'), R((X, 'British North America', 'gb'))),
  (US('AK'), R((X, 'Russian America', 'ru'))),
  (C('Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Haiti', 'Dominican Rep.'), R((X, 'Other', 'neu'))),
  (C('Cuba', 'Puerto Rico'), R((X, 'Spanish', 'es'))),
  (BRIT_ISLES + C('Saint Lucia', 'Dominica', 'Grenada', 'St. Vin. and Gren.', 'Trinidad and Tobago'), R((X, 'British North America', 'gb'))),
  (FR_ISLES + DUTCH + C('U.S. Virgin Is.', 'Greenland', 'St. Pierre and Miquelon'), R((X, 'Other', 'neu'))),
]
UNION_ST = US('MI', 'IL', 'WI', 'MN_E', 'MN_W', 'IA', 'MO', 'CA', 'OR')
WARS['cw'] = [
  (UNION_ST, R((X, 'Union', 'b'))),
  (US('KS'), R(('1861-01-29', 'U.S. territories', 'b2'), (X, 'Union', 'b'))),
  (US('NV'), R(('1864-10-31', 'U.S. territories', 'b2'), (X, 'Union', 'b'))),
  (US('WA', 'ID', 'MT', 'WY', 'ND', 'SD', 'NE', 'CO', 'UT', 'NM', 'AZ'), R((X, 'U.S. territories', 'b2'))),
  (US('OK'), R((X, 'Indian Territory', 'nat'))),
  (US('AL_N', 'AL_S'), R(('1861-01-11', 'Union', 'b'), ('1865-05-04', 'Confederacy', 'r'), (X, 'Union', 'b'))),
  (US('LA'), R(('1861-01-26', 'Union', 'b'), ('1865-05-26', 'Confederacy', 'r'), (X, 'Union', 'b'))),
  (US('TX'), R(('1861-02-01', 'Union', 'b'), ('1865-06-02', 'Confederacy', 'r'), (X, 'Union', 'b'))),
  (US('AR'), R(('1861-05-06', 'Union', 'b'), ('1865-05-26', 'Confederacy', 'r'), (X, 'Union', 'b'))),
  (CA('ON_S', 'QC_S'), R((X, 'Province of Canada', 'gb'))),
  (CA('NB', 'NS_M', 'NS_CB', 'PE', 'NL_I', 'NL_L'), R((X, 'British Atlantic colonies', 'gb'))),
  (RUPERT + CA('NT', 'YT'), R((X, "Rupert's Land (Hudson's Bay Co.)", 'gb'))),
  (CA('BC'), R((X, 'British Columbia', 'gb'))),
  (US('AK'), R((X, 'Russian America', 'ru'))),
  (C('Mexico'), R(('1864-04-10', 'Mexico', 'neu'), (X, 'Mexican Empire (French-backed)', 'neu'))),
  (C('Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Haiti'), R((X, 'Independent', 'neu'))),
  (C('Dominican Rep.'), R(('1861-03-18', 'Independent', 'neu'), ('1865-07-11', 'Spanish', 'es'), (X, 'Independent', 'neu'))),
  (C('Cuba', 'Puerto Rico'), R((X, 'Spanish', 'es'))),
  (BRIT_ISLES + C('Belize', 'Saint Lucia', 'Dominica', 'Grenada', 'St. Vin. and Gren.', 'Trinidad and Tobago'), R((X, 'British', 'gb'))),
  (FR_ISLES + DUTCH + C('U.S. Virgin Is.', 'Greenland', 'St. Pierre and Miquelon'), R((X, 'Other European', 'neu'))),
]
LABELS = {  # [lat, lon, text, size, from, to]
 'fiw': [[49.2, -73.5, 'NEW FRANCE', 'l', '', '1760-09-08'], [49.2, -73.5, 'CANADA · British from 1760', 'l', '1760-09-08', X],
         [35.5, -99.5, 'LOUISIANA · French', 'l', '', '1763-02-10'], [35.5, -99.5, 'LOUISIANA · Spanish from 1762', 'l', '1763-02-10', X],
         [44.3, -88.3, "PAYS D'EN HAUT", 's', '', '1763-02-10'], [44.3, -88.3, 'Reserved for Native nations', 's', '1763-02-10', X],
         [57.5, -96.0, "RUPERT'S LAND · Hudson's Bay Co.", 'l', '', X], [25.5, -103.0, 'NEW SPAIN', 'l', '', X],
         [39.2, -78.2, 'BRITISH COLONIES', 'l', '', X], [47.0, -117.0, 'NATIVE NATIONS', 's', '', X], [62.0, -124.0, 'NATIVE NATIONS', 's', '', X],
         [36.4, -86.2, 'Cherokee and Shawnee lands', 's', '', X], [45.3, -63.4, 'NOVA SCOTIA', 's', '', X], [48.8, -56.2, 'NEWFOUNDLAND', 's', '', X],
         [21.7, -79.6, 'CUBA · Spanish', 's', '', X], [19.1, -72.6, 'SAINT-DOMINGUE · French', 's', '', X]],
 'rev': [[39.4, -77.6, 'THIRTEEN COLONIES', 'l', '', '1776-07-04'], [39.4, -77.6, 'UNITED STATES', 'l', '1776-07-04', X],
         [48.8, -73.5, 'PROVINCE OF QUEBEC · British', 'l', '', X], [44.6, -88.6, 'Quebec Act lands · British', 's', '', '1783-09-03'],
         [44.6, -88.6, 'United States by the 1783 treaty', 's', '1783-09-03', X], [40.0, -89.2, 'Illinois County, Virginia', 's', '1778-07-04', X],
         [35.0, -100.5, 'LOUISIANA · Spanish', 'l', '', X], [57.5, -96.0, "RUPERT'S LAND · Hudson's Bay Co.", 'l', '', X], [25.5, -103.0, 'NEW SPAIN', 'l', '', X],
         [47.0, -117.0, 'NATIVE NATIONS', 's', '', X], [62.0, -124.0, 'NATIVE NATIONS', 's', '', X], [33.2, -86.6, 'Creek and Choctaw lands', 's', '', X],
         [35.9, -86.4, 'Cherokee lands', 's', '', X], [31.3, -88.6, 'WEST FLORIDA', 's', '', X], [45.3, -63.4, 'NOVA SCOTIA', 's', '', X],
         [48.8, -56.2, 'NEWFOUNDLAND', 's', '', X], [21.7, -79.6, 'CUBA · Spanish', 's', '', X], [19.1, -72.6, 'SAINT-DOMINGUE · French', 's', '', X]],
 'w12': [[39.4, -77.6, 'UNITED STATES', 'l', '', X], [45.0, -79.8, 'UPPER CANADA', 'l', '', X], [47.6, -71.8, 'LOWER CANADA', 'l', '', X],
         [57.5, -96.0, "RUPERT'S LAND · Hudson's Bay Co.", 'l', '', X], [42.5, -102.0, 'LOUISIANA PURCHASE · U.S. territory', 'l', '', X],
         [44.6, -88.6, 'Michigan and Illinois territories', 's', '', X], [25.5, -103.0, 'NEW SPAIN', 'l', '', X],
         [46.0, -120.0, 'OREGON COUNTRY · disputed', 'l', '', X], [63.5, -152.0, 'RUSSIAN AMERICA', 'l', '', X], [29.3, -82.3, 'SPANISH FLORIDA', 's', '', X],
         [46.4, -66.3, 'NEW BRUNSWICK', 's', '', X], [21.7, -79.6, 'CUBA · Spanish', 's', '', X], [19.1, -72.6, 'HAITI', 's', '', X]],
 'tx': [[31.6, -99.6, 'MEXICAN TEXAS', 'l', '', '1836-03-02'], [31.6, -99.6, 'REPUBLIC OF TEXAS', 'l', '1836-03-02', X],
        [33.8, -101.2, 'Comanchería', 's', '', X], [25.8, -103.0, 'MEXICO', 'l', '', X], [34.6, -106.2, 'Nuevo México', 's', '', X], [37.0, -119.8, 'Alta California', 's', '', X],
        [40.5, -89.5, 'UNITED STATES', 'l', '', X], [35.6, -97.2, 'Indian Territory', 's', '', X], [46.0, -120.0, 'OREGON COUNTRY', 'l', '', X],
        [57.5, -96.0, "RUPERT'S LAND · Hudson's Bay Co.", 'l', '', X], [63.5, -152.0, 'RUSSIAN AMERICA', 'l', '', X], [21.7, -79.6, 'CUBA · Spanish', 's', '', X]],
 'cw': [[42.6, -75.6, 'UNION', 'l', '', X], [31.6, -86.9, 'CONFEDERACY', 'l', '', X], [43.5, -90.0, 'UNION', 'l', '', X],
        [30.6, -100.2, 'CONFEDERATE TEXAS', 'l', '1861-02-01', '1865-06-02'], [41.5, -106.0, 'U.S. TERRITORIES', 'l', '', X],
        [35.6, -97.2, 'Indian Territory', 's', '', X], [48.9, -76.0, 'PROVINCE OF CANADA · British', 'l', '', X],
        [57.5, -96.0, "RUPERT'S LAND · Hudson's Bay Co.", 'l', '', X], [54.0, -124.5, 'BRITISH COLUMBIA', 's', '', X], [63.5, -152.0, 'RUSSIAN AMERICA', 'l', '', X],
        [24.5, -102.5, 'MEXICO', 'l', '', '1864-04-10'], [24.5, -102.5, 'MEXICAN EMPIRE · French-backed', 'l', '1864-04-10', X],
        [21.7, -79.6, 'CUBA · Spanish', 's', '', X]],
}
LEGEND = {
 'fiw': [['b', 'French'], ['r', "British (and Hudson's Bay Co.)"], ['es', 'Spanish'], ['nat', 'Native nations'], ['neu', 'Danish and Dutch']],
 'rev': [['b', 'United States'], ['b2', 'France (U.S. ally)'], ['r', 'British'], ['es', 'Spanish'], ['nat', 'Native nations'], ['neu', 'Danish and Dutch']],
 'w12': [['b', 'United States'], ['b2', 'U.S. territories'], ['r', 'British'], ['es', 'Spanish'], ['dis', 'Oregon Country (disputed)'], ['ru', 'Russian'], ['neu', 'Other']],
 'tx': [['r', 'Mexico'], ['neu', 'United States (neutral) and others'], ['nat', 'Indian Territory'], ['dis', 'Oregon Country (joint U.S.–British)'], ['gb', 'British North America'], ['ru', 'Russian'], ['es', 'Spanish']],
 'cw': [['b', 'Union'], ['b2', 'U.S. territories'], ['r', 'Confederacy'], ['nat', 'Indian Territory'], ['gb', 'British North America'], ['es', 'Spanish'], ['ru', 'Russian'], ['neu', 'Mexico and others']],
}
COV = {  # mapped states with no default war shading: tint them with their period class
 'fiw': {'KY': [[X, 'nat']], 'TN': [[X, 'nat']], 'TX': [[X, 'es']]},
 'rev': {'TN': [[X, 'nat']], 'MS': [[X, 'nat']], 'FL': [['1783-09-03', ''], [X, 'es']], 'TX': [[X, 'es']]},
 'w12': {'FL': [[X, 'es']], 'TX': [[X, 'es']]},
 'tx': {st: [[X, 'neu']] for st in ['NC', 'SC', 'VA', 'WV', 'TN', 'GA', 'FL', 'MA', 'DC', 'RI', 'NH', 'ME', 'NY', 'VT', 'CT', 'DE', 'NJ', 'MD', 'PA', 'IN', 'KY', 'OH', 'MS']},
 'cw': {},
}

def rings_of(g, nd=2):
    out = []
    for q in poly_parts(g):
        for ring in [q.exterior] + list(q.interiors):
            pts = [[round(y, nd), round(x, nd)] for x, y in ring.coords]
            if len(pts) >= 4: out.append(pts)
    return out

uncov, covpieces = {}, []
for pid, g in pieces.items():
    if pid.startswith('SA-') or (pid.startswith('US-') and pid[3:5] in COVERED):
        covpieces.append(g); continue
    u = drop_small(g.difference(covered_union).buffer(0), 0.02)
    if not u.is_empty and u.centroid.y > 60: u = drop_small(u, 0.08)
    if not u.is_empty: uncov[pid] = u

used = set()
wars = {}
for war, rules in WARS.items():
    for ids_, _ in rules:
        for i in ids_:
            if i not in pieces: raise SystemExit('unknown piece ' + i)
    cuts = sorted({u for _, steps in rules for u, _, _ in steps if u != X})
    bounds = [''] + cuts
    slices = []
    for k, start in enumerate(bounds):
        end = bounds[k + 1] if k + 1 < len(bounds) else X
        probe = start or '0000'
        regs, idx, mp = [], {}, {}
        for ids_, steps in rules:
            for until, name, cls in steps:
                if probe < until: break
            if (name, cls) not in idx: idx[(name, cls)] = len(regs); regs.append([name, cls])
            for i in ids_:
                used.add(i)
                if i in uncov: mp[i] = idx[(name, cls)]
        slices.append({'from': start, 'to': end, 'regions': regs, 'map': mp})
    wars[war] = {'slices': slices, 'labels': LABELS[war], 'legend': LEGEND[war], 'cov': COV[war]}

missing = sorted(i for i in uncov if i not in used)
edges = []
ks = sorted(uncov)
for i, a in enumerate(ks):
    for b in ks[i + 1:]:
        if not uncov[a].intersects(uncov[b]): continue
        sh = uncov[a].boundary.intersection(uncov[b].boundary)
        sh = shapely.line_merge(sh) if not sh.is_empty and sh.geom_type in ('MultiLineString',) else sh
        lines = [g for g in getattr(sh, 'geoms', [sh]) if g.geom_type == 'LineString' and g.length > 0.05]
        for ln in lines: edges.append([a, b, [[round(y, 2), round(x, 2)] for x, y in ln.coords]])
lk = []
for f in lakes:
    if not f['geometry']: continue
    g = shape(f['geometry']).buffer(0)
    if not g.intersects(NA_BOX) or g.area < 0.15: continue
    g = g.difference(covered_union).simplify(0.02).buffer(0)
    if not g.is_empty: lk += rings_of(g)
cov_land = drop_small(unary_union(covpieces), 0.02)
out = {'src': 'Natural Earth 1:50m (public domain); period borders approximate',
       'pieces': {k: rings_of(v) for k, v in uncov.items()}, 'covland': rings_of(cov_land), 'lakes': lk, 'edges': edges, 'wars': wars}
s = json.dumps(out, separators=(',', ':'))
open(OUT, 'w').write(s)
print('pieces', len(uncov), 'not assigned:', missing, 'edges', len(edges))
print('size KB', len(s) // 1024, 'piece pts', sum(len(r) for v in out['pieces'].values() for r in v), 'cov pts', sum(len(r) for r in out['covland']), 'lake rings', len(lk))
