/** Deterministic camera projection for exercising student algorithms with the production cv2 prelude. */
export function visionHarness(number: number, seed: number, prelude: string): string {
    return `
import math
frame_serial=0
frame_markers={}
marker_positions=[(10,-1,1,0.03),(11,1,-1,0.03),(12,0.6,0.3,0.03)]
if ${number} in [101,102,105]: marker_positions=[(12,0,8,0.03),(13,0,16,0.03)]
if ${number}==103: marker_positions=[(102,9,-7,6.63),(101,-9,-7,5.53)]
if ${number}==104: marker_positions=[(10,-9.5,10.5,0.03),(11,-8.5,10.5,0.03)]
if ${number}>=107: marker_positions[-1]=(12,0.4+${seed}%7*0.1,0.2+${seed}%5*0.1,0.03)
def pose(): return dict(zip(['x','y','z'],position))
def project_markers():
    result=[]
    for marker_id,x,y,z in marker_positions:
        depth=position[2]+0.02-z
        if depth<=0: continue
        focal=180/math.tan(math.radians(36))
        points=[]
        for ox,oy in [(-0.3,0.3),(0.3,0.3),(0.3,-0.3),(-0.3,-0.3)]:
            dx=x+ox-position[0]; dy=y+oy-position[1]
            points.append([320+focal*(dx*math.cos(yaw)+dy*math.sin(yaw))/depth,180-focal*(-dx*math.sin(yaw)+dy*math.cos(yaw))/depth])
        if all(0<=px<=640 and 0<=py<=360 for px,py in points): result.append(dict(id=marker_id,corners=points))
    return result
def detect(dictionary,token):
    markers=frame_markers.get(token,[]) if dictionary=='DICT_6X6_250' else []
    events.append(dict(kind='detect',time=clock,frameId=token,dictionary=dictionary,markers=markers,pos=pose(),yaw=yaw))
    return [(marker['id'],marker['corners']) for marker in markers]
def display(name,width,height,pixels,texts=None,fmt='bgr'):
    channels=4 if fmt=='rgba' else 3
    assert getattr(pixels,'nbytes',None) or len(pixels)==width*height*channels
    assert getattr(pixels,'nbytes',width*height*channels)==width*height*channels
    events.append(dict(kind='display',time=clock,width=width,height=height))
def annotation(x,y): events.append(dict(kind='annotation',time=clock,point=dict(x=x,y=y)))
js=types.SimpleNamespace(pioneer_cv_detect_markers=detect,pioneer_cv_imshow_pixels=display,pioneer_cv_annotation=annotation,pioneer_cv_destroy_all_windows=lambda:None,pioneer_cv_wait_key=lambda delay:-1)
exec(${JSON.stringify(prelude)})
_np_checked=True
_np_module=None
class Camera:
    def __init__(self,view='front',**kwargs): self.view=view
    def get_cv_frame(self):
        global frame_serial
        frame_serial+=1
        markers=project_markers()
        frame_markers[frame_serial]=markers
        frame=SimCvFrame(data=bytes(640*360*3),width=640,height=360)
        _remember_frame(frame,frame_serial)
        events.append(dict(kind='camera',time=clock,frameId=frame_serial,width=640,height=360,view=self.view,pos=pose(),yaw=yaw,markers=markers))
        return frame
sdk.Camera=Camera
`;
}
