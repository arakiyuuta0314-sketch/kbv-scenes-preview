"""Read-only audit of JV-CS course-key coverage; NO copyrighted description payload exported."""
import argparse,sqlite3,json,pathlib
P=argparse.ArgumentParser()
P.add_argument('--db',default=r'C:\KBV\qa_incremental_20261027\kbv_work.sqlite')
P.add_argument('--out',default=str(pathlib.Path(__file__).parent/'coverage_v13.json'))
args=P.parse_args()
base=pathlib.Path(__file__).parent
registry=json.loads((base/'course_catalog.json').read_text('utf8'))['courses']
supported={(v['venueCode'],v['distance'],v['trackCode']) for v in registry.values()}
db=sqlite3.connect('file:'+args.db+'?mode=ro',uri=True,timeout=5)
db.execute('PRAGMA query_only=ON')
records=db.execute('SELECT f004,f005,f006,COUNT(*) FROM jv_r_CS GROUP BY f004,f005,f006 ORDER BY f004,f005,f006').fetchall()
total=db.execute('SELECT COUNT(*) FROM jv_r_CS').fetchone()[0]
db.close()
keys=[{'venue_code':v,'distance_m':d,'track_code':t,'source_versions':n,'geometry_registered':(v,d,t) in supported} for v,d,t,n in records]
result={'schema':'kbv.scene03.coverage_qa/v13','cs_records':total,'unique_venue_distance_track_keys':len(keys),
  'geometry_keys_registered':sum(k['geometry_registered'] for k in keys),
  'unsupported_keys':sum(not k['geometry_registered'] for k in keys),
  'warning':'Coverage includes historical JV-CS keys and is NOT a list of active race conditions.',
  'registered_course_ids':list(registry),'keys':keys}
pathlib.Path(args.out).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:result[k] for k in ['cs_records','unique_venue_distance_track_keys','geometry_keys_registered','unsupported_keys']},ensure_ascii=False))
