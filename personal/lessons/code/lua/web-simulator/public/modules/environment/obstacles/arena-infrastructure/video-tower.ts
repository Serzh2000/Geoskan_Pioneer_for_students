import * as THREE from 'three';
import { setCommonMeta } from '../utils.js';
import { OBJECT_TYPE } from '../../../shared/object-types.js';
import { attachInfraNode } from '../infra-props.js';

export function createVideoTowerMesh() {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.VIDEO_TOWER, {
        collidableRadius: 0.55,
        connectable: true,
        connectionRadius: 8,
        streamHeight: 3.15
    });
    attachInfraNode(group, 'VideoTower');

    group.userData.getContextMenuActions = () => ({
        infoTitle: 'О видеомачте',
        infoItems: [
            {
                title: 'Что это',
                text: 'Стационарный источник видеопотока для задач компьютерного зрения и отладки работы с камерой.'
            },
            {
                title: 'Как пользоваться',
                text: 'Разместите мачту рядом с нужной зоной, подведите к ней дрон на расстояние до 8 м и подключитесь из программы через pioneer_camera_connect(). После этого можно проверять связь через pioneer_camera_connected() и получать кадры через pioneer_camera_get_frame() или pioneer_camera_get_cv_frame().'
            }
        ]
    });

    return group;
}
