from pathlib import Path
import cv2, numpy as np, json, time
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
url=(root/'index.html').as_uri()
output=str(root/'scene03_v11_visual_prototype.mp4')
frames=180
fps=15
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',args=['--allow-file-access-from-files','--disable-web-security'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url,wait_until='load',timeout=30000)
 page.wait_for_timeout(800)
 print('API',page.evaluate('typeof window.KBV_SCENE03'),flush=True)
 writer=cv2.VideoWriter(output,cv2.VideoWriter_fourcc(*'mp4v'),fps,(1600,900))
 if not writer.isOpened(): raise RuntimeError('VideoWriter open failed')
 for i in range(frames):
  phase=i/(frames-1)
  page.evaluate('(t)=>window.KBV_SCENE03.renderAt(t)',phase)
  raw=page.screenshot(type='png',animations='disabled')
  frame=cv2.imdecode(np.frombuffer(raw,dtype=np.uint8),cv2.IMREAD_COLOR)
  writer.write(frame)
  if i%30==0:print('frame',i,'/',frames,'errors',len(errors),flush=True)
 writer.release()
 print('errors',json.dumps(errors[:8],ensure_ascii=False),flush=True)
 browser.close()
print('VIDEO',output,Path(output).stat().st_size,flush=True)
