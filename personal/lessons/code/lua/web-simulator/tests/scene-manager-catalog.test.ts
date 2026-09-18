import { matchesCatalogFilter, getCatalogCategory } from '../public/modules/ui/scene-manager/catalog.js';
import { getSceneTypePreviewConfig } from '../public/modules/ui/scene-manager/support/type-preview-config.js';
import { getTransformValues } from '../public/modules/ui/scene-manager/render/details/transform.js';
import { renderSelectedDetailsMarkup } from '../public/modules/ui/scene-manager/render/details/markup.js';
import type { SceneManagerEntry } from '../public/modules/ui/scene-manager/types.js';

describe('scene manager catalog and inspector', () => {
    test('search handles case, spaces and Russian ё while respecting the category', () => {
        expect(matchesCatalogFilter('tree', 'Ель', ' ЕЛЬ ', 'landscape')).toBe(true);
        expect(matchesCatalogFilter('gate', 'Пролётные ворота', 'пролет', 'flight')).toBe(true);
        expect(matchesCatalogFilter('aruco-map', 'ArUco карта', 'ARUCO', 'markers')).toBe(true);
        expect(matchesCatalogFilter('aruco-map', 'ArUco карта', 'ARUCO', 'equipment')).toBe(false);
        expect(getCatalogCategory('light-tower')).toBe('equipment');
    });
    test('every selectable object has specific explanatory content', () => {
        const types = ['gate','pylon','flag','building','aruco','aruco-map','apriltag','apriltag-map','road','rail','hill','arena-hills','tree','forest-patch','settlement','transport','cargo','start-position','heliport','charge-station','locus-beacon','light-tower','video-tower','control-station','arena-space','pad-h','pad-charge'];
        for (const type of types) expect(getSceneTypePreviewConfig(type).description).not.toContain('Базовый объект');
    });
    test('rotation readout uses degrees and the horizontal heading uses Z', () => {
        const entry = {name:'<объект>',sceneType:'gate',draggable:true,position:{x:1,y:2,z:3},rotation:{x:0,y:Math.PI,z:Math.PI/2},scale:{x:1,y:1,z:1}} as SceneManagerEntry;
        expect(getTransformValues(entry, 'rotate')).toEqual({x:0,y:180,z:90});
        expect(getTransformValues(entry, 'translate')).toEqual(entry.position);
        const markup = renderSelectedDetailsMarkup(entry);
        expect(markup).toContain('90.0°');
        expect(markup).not.toContain('180.0°');
        expect(markup).toContain('&lt;объект&gt;');
    });
});
