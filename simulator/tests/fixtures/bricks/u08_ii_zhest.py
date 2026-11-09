img = None
from pioneer_sdk2 import Pioneer
pioneer = Pioneer()
import cv2
import os
import sys
from collections import defaultdict
import numpy as np
queries_dict: defaultdict = defaultdict(set)
images = {}

def model_name_picker(name: str):
    if name == "Yolo":
        return "yolov8n"
    elif name == "YoloPose":
        return "yolov8n-pose"
    elif name == "PaddleOCR":
        return "PP-OCRv5_mobile_det", "eslav_PP-OCRv5_mobile_rec"

from pioneer_rknn import YoloPose
import math
classNames_yolopose = ["person"]

def resize_img_yolopose(img):
    img_copy = cv2.resize(img, IMG_SIZE)
    img_copy = np.expand_dims(img_copy, 0)
    return img_copy


# Thresholds
MIN_KPT_CONF = 0.20
STABLE_FRAMES = 18
HYSTERESIS_FRAMES = 8
THRESHOLD = HYSTERESIS_FRAMES


# Keypoint indices (COCO-17)
LS, RS, LW, RW, LH, RH = 5, 6, 9, 10, 11, 12

def get_kpts_array(kpts_obj):
    # Supports:
    # - Ultralytics-like object with .data tensor
    # - Box.keypoint as list/np.array of length 51 or shape (17,3) or (1,51), etc.
    if hasattr(kpts_obj, 'data'):
        raw = kpts_obj.data
        try:
            raw = raw.cpu().numpy()
        except Exception:
            raw = np.asarray(raw)
        raw = np.squeeze(raw)
        arr = np.asarray(raw)
    else:
        arr = np.asarray(kpts_obj)

    if arr.size == 0:
        return None

    # Flatten and reshape to (..., 3)
    arr = arr.astype(float).reshape(-1)
    if arr.size % 3 != 0:
        return None
    arr = arr.reshape(-1, 3)

    # Expect at least 17 keypoints; take the first 17
    if arr.shape[0] < 17:
        return None
    arr = arr[:17, :]
    return arr


def _angle_deg(dx, dy):
    # angle between vector and vertical axis: 0 means up, 90 means horizontal
    return abs(math.degrees(math.atan2(dx, dy)))


def classify_gesture(kp):
    # kp: (17,3)
    needed = [LS, RS, LW, RW, LH, RH]
    if (kp[needed, 2] < MIN_KPT_CONF).any():
        return 'none'

    lx, ly = kp[LS][:2]
    rx, ry = kp[RS][:2]
    lwx, lwy = kp[LW][:2]
    rwx, rwy = kp[RW][:2]
    lhy, rhy = kp[LH][1], kp[RH][1]

    shoulder_span = max(1.0, abs(rx - lx))
    torso_len = max(1.0, max(abs(ly - lhy), abs(ry - rhy)))

    # Wrist relative to shoulders (up-positive)
    dx_l, dy_l_up = lwx - lx, ly - lwy
    dx_r, dy_r_up = rwx - rx, ry - rwy

    len_l = math.hypot(dx_l, dy_l_up)
    len_r = math.hypot(dx_r, dy_r_up)

    ang_l = _angle_deg(dx_l, dy_l_up)
    ang_r = _angle_deg(dx_r, dy_r_up)

    ANG_UP_THR = 25
    ANG_SIDE_THR = 25
    LEN_UP_K = 0.32
    LEN_SIDE_K = 0.48
    OFF_UP_K = 0.28
    OFF_SIDE_K = 0.55
    VERT_TOL_K = 0.32

    wrist_centre_thr_px = max(40.0, 0.18 * shoulder_span)

    l_up = (ang_l < ANG_UP_THR and len_l > LEN_UP_K * torso_len) or (lwy < ly - OFF_UP_K * torso_len)
    r_up = (ang_r < ANG_UP_THR and len_r > LEN_UP_K * torso_len) or (rwy < ry - OFF_UP_K * torso_len)

    l_side = (
        abs(ang_l - 90) < ANG_SIDE_THR and len_l > LEN_SIDE_K * shoulder_span
    ) or (
        lwx < lx - OFF_SIDE_K * shoulder_span and abs(lwy - ly) < VERT_TOL_K * torso_len
    )

    r_side = (
        abs(ang_r - 90) < ANG_SIDE_THR and len_r > LEN_SIDE_K * shoulder_span
    ) or (
        rwx > rx + OFF_SIDE_K * shoulder_span and abs(rwy - ry) < VERT_TOL_K * torso_len
    )

    if math.hypot(lwx - rwx, lwy - rwy) < wrist_centre_thr_px:
        return 'wrist_centre'
    if l_up and r_up:
        return 'two_hand_up'
    if l_side and r_side:
        return 'two_hand_side'
    if l_up:
        return 'left_up'
    if r_up:
        return 'right_up'
    if l_side:
        return 'left_side'
    if r_side:
        return 'right_side'

    return 'none'

from pioneer_sdk2 import Camera, ImageViewer, CameraType

cam_main, cam_opt = Camera(camera_type=CameraType.MAIN), Camera(camera_type=CameraType.OPT)
iv = ImageViewer()
cams_dict = {}
cams_dict["img"] = "cam_main"

def find_poses(img, det_boxes):
    """Run model inference on *img* and return a structured result object.

    Returns a dict with:
        - poses: list of pose dicts, each with keys
            - bbox: [x1, y1, x2, y2] in *img* pixel coordinates
            - kpts: numpy.ndarray of shape (17, 3) with x, y, conf
        - total_dets: total number of raw detections returned by the model
    """
    ih, iw = img.shape[:2]

    # Factors to convert network coordinates → input frame coordinates
    sx = iw / float(IMG_SIZE[0])
    sy = ih / float(IMG_SIZE[1])

    poses = []
    for box in det_boxes:
        x1, y1, x2, y2 = float(box.xmin), float(box.ymin), float(box.xmax), float(box.ymax)

        # Convert key-points to an array and skip invalid ones
        karr = get_kpts_array(np.asarray(box.keypoint))
        if karr is None:
            continue

        # Scale key-points and bbox to the original frame size
        karr = karr.copy()
        karr[:, 0] *= sx
        karr[:, 1] *= sy
        bbox_scaled = [x1 * sx, y1 * sy, x2 * sx, y2 * sy]

        poses.append({
            'bbox': bbox_scaled,
            'kpts': karr,
        })

    return {
        'poses': poses,
        'total_dets': len(det_boxes),
    }



_infer_cache_per_frame = {}

def infer_cache_per_frame(cache_key, frame, infer_fn):
    frame_id = id(frame)
    cached = _infer_cache_per_frame.get(cache_key)
    if cached is None or cached["frame_id"] != frame_id:
        cached = {
            "frame_id": frame_id,
            "result": infer_fn(frame),
        }
        _infer_cache_per_frame[cache_key] = cached
    return cached["result"]

from collections import deque, defaultdict

def should_execute(cmd, last_cmds_deque, target_pose, threshold=THRESHOLD):
    if cmd != target_pose:
        last_cmds_deque.clear()
        return False
    last_cmds_deque.append(cmd)
    if len(last_cmds_deque) < threshold:
        return False
    if all(c == target_pose for c in last_cmds_deque):
        last_cmds_deque.clear()
        return True
    return False


def _select_primary_pose(poses):
    if not poses:
        return None
    def _area(p):
        x1, y1, x2, y2 = p['bbox']
        return max(0.0, x2 - x1) * max(0.0, y2 - y1)
    return max(poses, key=_area)


def pose_compare(result, target_pose, last_cmds, threshold=THRESHOLD, selector='largest'):
    poses = result.get('poses', [])
    pose_entry = _select_primary_pose(poses) if selector == 'largest' else (poses[0] if poses else None)
    if pose_entry is None:
        return False

    pose_name = classify_gesture(pose_entry['kpts'])

    # last_cmds can be either a single deque or a mapping {pose_name: deque}
    dq = last_cmds.get(target_pose) if isinstance(last_cmds, dict) else last_cmds
    if dq is None:
        # Fallback: create a small deque on the fly if target key missing
        dq = deque(maxlen=threshold)
        if isinstance(last_cmds, dict):
            last_cmds[target_pose] = dq

    if should_execute(pose_name, dq, target_pose, threshold):
        #print(f"***************** EXECUTE → {pose_name}")
        return True
    return False


last_cmds = {pose_name: deque(maxlen=8) for pose_name in [
    'left_up', 'right_up', 'left_side', 'right_side', 'two_hand_up', 'two_hand_side', 'wrist_centre'
]}


def hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
    if hex_color.startswith("#"):
        hex_color = hex_color[1:]
    if len(hex_color) != 6:
        raise ValueError("Hex color must be in format #RRGGBB")

    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    return (b, g, r)


POSE_PALETTE = np.array(
    [
        [255, 128, 0], [255, 153, 51], [255, 178, 102], [230, 230, 0], [255, 153, 255],
        [153, 204, 255], [255, 102, 255], [255, 51, 255], [102, 178, 255], [51, 153, 255],
        [255, 153, 153], [255, 102, 102], [255, 51, 51], [153, 255, 153], [102, 255, 102],
        [51, 255, 51], [0, 255, 0], [0, 0, 255], [255, 0, 0], [255, 255, 255]
    ], dtype=np.uint8
)
KPT_COLOR = POSE_PALETTE[[16, 16, 16, 16, 16, 0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9]]
SKELETON_PAIRS = [
    [16, 14], [14, 12], [17, 15], [15, 13], [12, 13], [6, 12], [7, 13], [6, 7], [6, 8],
    [7, 9], [8, 10], [9, 11], [2, 3], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7]
]
LIMB_COLOR = POSE_PALETTE[[9, 9, 9, 9, 7, 7, 7, 0, 0, 0, 0, 0, 16, 16, 16, 16, 16, 16, 16]]
SKELETON = [(a - 1, b - 1) for a, b in SKELETON_PAIRS]

# Keypoint indices (COCO-17)
LS, RS, LW, RW, LH, RH = 5, 6, 9, 10, 11, 12

def draw_pose(frame, kpts_arr, thickness=3, bbox=None, label=None, label_color=(50, 220, 50)):
    xy = kpts_arr[:, :2].astype(int)
    conf = kpts_arr[:, 2]
    valid = (conf > MIN_KPT_CONF) & ~np.all(xy == 0, axis=1)

    for idx, (x, y) in enumerate(xy):
        if valid[idx]:
            col = tuple(int(c) for c in KPT_COLOR[idx])
            cv2.circle(frame, (x, y), thickness + 2, col, -1, lineType=cv2.LINE_AA)

    for i, (p1, p2) in enumerate(SKELETON):
        if valid[p1] and valid[p2]:
            pt1, pt2 = tuple(xy[p1]), tuple(xy[p2])
            col = tuple(int(c) for c in LIMB_COLOR[i])
            cv2.line(frame, pt1, pt2, col, thickness, lineType=cv2.LINE_AA)

    if bbox is not None:
        x1, y1, x2, y2 = map(int, bbox)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (13, 76, 236), thickness + 1)
        if label:
            cv2.putText(
                frame,
                label,
                (x1, max(0, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                label_color,
                max(1, thickness - 1),
                lineType=cv2.LINE_AA,
            )


def get_kpts_array(kpts_obj):
    # Supports:
    # - Ultralytics-like object with .data tensor
    # - Box.keypoint as list/np.array of length 51 or shape (17,3) or (1,51), etc.
    if hasattr(kpts_obj, 'data'):
        raw = kpts_obj.data
        try:
            raw = raw.cpu().numpy()
        except Exception:
            raw = np.asarray(raw)
        raw = np.squeeze(raw)
        arr = np.asarray(raw)
    else:
        arr = np.asarray(kpts_obj)

    if arr.size == 0:
        return None

    # Flatten and reshape to (..., 3)
    arr = arr.astype(float).reshape(-1)
    if arr.size % 3 != 0:
        return None
    arr = arr.reshape(-1, 3)

    # Expect at least 17 keypoints; take the first 17
    if arr.shape[0] < 17:
        return None
    arr = arr[:17, :]
    return arr


def _angle_deg(dx, dy):
    # angle between vector and vertical axis: 0 means up, 90 means horizontal
    return abs(math.degrees(math.atan2(dx, dy)))


# Temporal smoothing (functional state)

def smoother_new(stable_frames=STABLE_FRAMES, hysteresis_frames=HYSTERESIS_FRAMES):
    return {
        'history': deque(maxlen=max(stable_frames, hysteresis_frames)),
        'stable_frames': stable_frames,
        'hysteresis_frames': hysteresis_frames,
        'current': 'none',
    }


def smoother_update(state, gesture):
    state['history'].append(gesture)
    counts = defaultdict(int)
    for g in state['history']:
        counts[g] += 1
    winner = max(counts.items(), key=lambda x: x[1])[0]

    if winner != state['current']:
        if counts[winner] >= state['hysteresis_frames']:
            state['current'] = winner
    stable = counts[state['current']] >= state['stable_frames']
    return state['current'], stable

# Simple IoU tracker (functional state)
def iou_xyxy(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
    union = area_a + area_b - inter + 1e-6
    return inter / union


def tracker_new(iou_thr=0.35):
    return {
        'tracks': {},   # tid -> {'bbox': list[4], 'smoother': smoother_state}
        'next_id': 1,
        'iou_thr': iou_thr,
    }


def tracker_match_and_update(state, boxes):
    assigns = {}
    unmatched = set(range(len(boxes)))

    # Greedy match existing tracks
    for tid, tr in list(state['tracks'].items()):
        best_j, best_iou = None, 0.0
        for j in list(unmatched):
            iou = iou_xyxy(tr['bbox'], boxes[j])
            if iou > best_iou:
                best_iou, best_j = iou, j
        if best_j is not None and best_iou >= state['iou_thr']:
            assigns[best_j] = tid
            unmatched.remove(best_j)
            state['tracks'][tid]['bbox'] = boxes[best_j]

    # Create new tracks for unmatched
    for j in unmatched:
        tid = state['next_id']
        state['next_id'] += 1
        assigns[j] = tid
        state['tracks'][tid] = {
            'bbox': boxes[j],
            'smoother': smoother_new(),
        }

    # Prune unmatched old tracks (keep only currently assigned)
    keep_ids = set(assigns.values())
    state['tracks'] = {tid: tr for tid, tr in state['tracks'].items() if tid in keep_ids}

    return assigns

def draw_poses(img, result, tracker_state):
    """Draw poses from structured result on *img* and update *tracker_state*.

    Besides rendering the skeleton, the gesture for every tracked person is
    classified, temporally smoothed and optionally printed to stdout when it
    becomes stable.
    """
    poses = result.get('poses', [])
    total_dets = result.get('total_dets', 0)

    if poses:
        boxes = [p['bbox'] for p in poses]
        assigns = tracker_match_and_update(tracker_state, boxes)

        for j, tid in assigns.items():
            karr = poses[j]['kpts']

            gesture = classify_gesture(karr)
            current, stable = smoother_update(
                tracker_state['tracks'][tid]['smoother'], gesture
            )

            label_color = (0, 255, 0) if stable and current != 'none' else (0, 200, 255)
            draw_pose(img, karr, thickness=3, bbox=boxes[j], label=current, label_color=label_color)

            if stable and current != 'none':
                #print(f"EXECUTE -> id={tid} gesture={current}")
                pass
    else:
        # No valid poses – still might have raw detections that were dropped
        if total_dets > 0:
            print(f"No drawable poses parsed; raw detections: {total_dets}")
        tracker_state['tracks'].clear()


tracker_state = tracker_new(iou_thr=0.35)

print("Начало программы")
try:
    print('Высота по дальномеру, м: ' + str(pioneer.get_dist_sensor_data()))
    print("Выбрана модель:YoloPose")
    IMG_SIZE = (640, 640)

    model_yolopose = YoloPose(model_name=model_name_picker("YoloPose"))
    while True:
      img = cam_main.get_cv_frame()

      if pose_compare(find_poses(img, (results_img := infer_cache_per_frame("results_img", img, lambda fr: model_yolopose.run([resize_img_yolopose(fr)]))))
      , "two_hand_up", last_cmds):
        pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#00ff00")][::-1])
      else:
        pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#000000")][::-1])
      draw_poses(img, find_poses(img, (results_img := infer_cache_per_frame("results_img", img, lambda fr: model_yolopose.run([resize_img_yolopose(fr)]))))
      , tracker_state)
      iv.imshow(name='pose', frame=img)
except Exception as e:
    print(e)
finally:
    pio = locals().get("pioneer")
    if pio is not None:
        try:
            pio.wait_callback = False
            pio.land()
            pio.close_connection()
        except Exception:
            pass

    for cam_name in ("cam_main", "cam_opt"):
        cam = locals().get(cam_name)
        if cam is not None:
            try:
                cam.stop()
            except Exception:
                pass

    viewer = locals().get("iv")
    if viewer is not None:
        try:
            viewer.close()
        except Exception:
            pass
        del viewer

    if pio is not None:
        del pio
    print("Конец программы")