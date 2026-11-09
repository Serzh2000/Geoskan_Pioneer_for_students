import { Order } from 'blockly/python';
import {
    ARUCO_FIND,
    FIND_POSES,
    POSE_COMPARE,
    POSE_INIT,
    YOLO_DRAW,
    YOLO_FIND,
    YOLO_HEAD,
    YOLO_RESIZE
} from './python-lib.js';
import { BINARY_MASK, COLOR_MASK, CONTOUR_SHAPE, OBJECT_BOX, OBJECT_COORDS, OBJECT_SIZE } from './python-lib-extra.js';
import {
    aiCommon,
    arg,
    colourHelper,
    define,
    fn,
    imageName,
    importCv2,
    importDeque,
    importNumpy,
    inferCache,
    inferCall,
    value,
    type BlockGen
} from './generator-kit.js';

/** Генераторы блоков категорий «ИИ» и «Компьютерное зрение». */
export const aiGenerators: Record<string, BlockGen> = {
    // ---------- ИИ ----------
    ai_model_init: (block) => {
        const model = String(block.getFieldValue('chosen_model'));
        aiCommon();
        let code = `print("Выбрана модель:${model}")\n`;
        if (model === 'YoloPose') {
            define('rknn_yolopose', fn(POSE_INIT));
            code += `IMG_SIZE = (640, 640)\n\nmodel_yolopose = YoloPose(model_name=model_name_picker("YoloPose"))\n`;
        } else if (model === 'PaddleOCR') {
            define('rknn_ppocr', 'from pioneer_rknn import PaddleOCR');
            code += 'model_ppocr = PaddleOCR(det_model_name=model_name_picker("PaddleOCR")[0],\n'
                + '                  rec_model_name=model_name_picker("PaddleOCR")[1])\n';
        } else {
            define('rknn_yolo', YOLO_HEAD);
            define('resize_img_yolo', fn(YOLO_RESIZE));
            define('yolo_find', fn(YOLO_FIND));
            define('yolo_draw', fn(YOLO_DRAW));
            code += `IMG_SIZE = (640, 640)\n\nmodel_yolo = Yolo(model_name=model_name_picker("Yolo"))\n`;
        }
        return code;
    },
    yolo_object: (block) => {
        const image = arg(block, 'img', 'None');
        const name = imageName(block, 'img');
        const choice = String(block.getFieldValue('choice'));
        if (choice !== 'all') define(`queries_${name}_${choice}`, `queries_dict["${name}"].add("${choice}")`);
        inferCache();
        const filter = choice === 'all' ? '' : `, class_filter=["${choice}"]`;
        const call = inferCall(name, image, 'model_yolo.run([resize_img_yolo(fr)])');
        return value(`yolo_find_on_image(${image}, ${call}, classNames_yolo${filter})`);
    },
    yolo_pose_object: (block) => {
        const image = arg(block, 'img', 'None');
        const name = imageName(block, 'img');
        define('find_poses', fn(FIND_POSES));
        inferCache();
        return value(`find_poses(${image}, ${inferCall(name, image, 'model_yolopose.run([resize_img_yolopose(fr)])')})`);
    },
    pose_compare: (block) => {
        const pose = arg(block, 'obj', 'None');
        importDeque();
        define('pose_compare_fn', fn(POSE_COMPARE.replace(/^from collections import deque, defaultdict\n+/, '')));
        return value(`pose_compare(${pose}, "${block.getFieldValue('choice')}", last_cmds)`);
    },
    ppocr_text_find: (block) => {
        const image = arg(block, 'img', 'None');
        const name = imageName(block, 'img');
        inferCache();
        return value(`[${inferCall(name, image, 'model_ppocr.run(fr)', 'results_ppocr').slice(1, -1)}]`, Order.ATOMIC);
    },
    ppocr_text_selection_from_object: (block) => {
        const result = arg(block, 'ppocr', 'None', Order.MEMBER);
        const join = (variable: string) => `"\\n".join([text for group in ${variable}[0][1] for (text, _) in group])`;
        // Вложенный блок распознавания даёт := внутри генератора списка - в Python это SyntaxError
        // (так ломается Bricks 2.3.0). Для сложного выражения результат передаётся через lambda.
        return value(/^[A-Za-z_]\w*$/.test(result) ? join(result) : `(lambda ocr: ${join('ocr')})(${result})`);
    },

    // ---------- Компьютерное зрение ----------
    aruco_find: (block) => {
        const image = arg(block, 'IMG', 'None');
        const name = imageName(block, 'IMG');
        importCv2();
        define('import_cv2_aruco', 'import cv2.aruco');
        define('aruco_find', fn(ARUCO_FIND));
        return value(`aruco_find_on_image('${name}', ${image}, cv2.aruco.${block.getFieldValue('FAMILY')})`);
    },
    cv_object_coords: (block) => {
        importNumpy();
        define('object_box', fn(OBJECT_BOX));
        define('object_coords', fn(OBJECT_COORDS));
        return value(`object_coords(${arg(block, 'obj', 'None')}, "${block.getFieldValue('mode')}", ${arg(block, 'ident', '0')})`);
    },
    cv_object_size: (block) => {
        importNumpy();
        define('object_box', fn(OBJECT_BOX));
        define('object_size', fn(OBJECT_SIZE));
        return value(`object_size(${arg(block, 'obj', 'None')}, "${block.getFieldValue('mode')}", ${arg(block, 'ident', '0')})`);
    },
    cv_contour_shape: (block) => {
        importCv2();
        define('contour_shape', fn(CONTOUR_SHAPE));
        return value(`contour_shape(${arg(block, 'contour', 'None')}, ${arg(block, 'index', '0')})`);
    },
    cv_gaussian_blur: (block) => {
        importCv2();
        const k = arg(block, 'k', '5');
        return value(`cv2.GaussianBlur(${arg(block, 'img', 'None')}, (${k}, ${k}), 0)`);
    },
    cv_canny: (block) => {
        importCv2();
        return value(`cv2.Canny(${arg(block, 'img', 'None')}, ${Number(block.getFieldValue('low'))}, ${Number(block.getFieldValue('high'))})`);
    },
    cv_color_mask: (block) => {
        importCv2();
        importNumpy();
        colourHelper();
        define('color_mask', fn(COLOR_MASK));
        return value(`color_mask(${arg(block, 'img', 'None')}, ${arg(block, 'lower', '"#000000"')}, ${arg(block, 'upper', '"#ffffff"')})`);
    },
    cv_threshold: (block) => {
        importCv2();
        define('binary_mask', fn(BINARY_MASK));
        return value(`binary_mask(${arg(block, 'img', 'None')}, ${Number(block.getFieldValue('threshold'))})`);
    },
    cv_contours: (block) => {
        importCv2();
        return value(`cv2.findContours(${arg(block, 'mask', 'None')}, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]`, Order.MEMBER);
    },

};
