/*
 * Стартовая программа Bricks: легковесный модуль без Blockly (его читает workspace.ts, который
 * не должен тянуть пакет blockly при загрузке страницы).
 */
const NAMESPACE = 'https://developers.google.com/blockly/xml';

export const BRICKS_STARTER_XML = `
    <xml xmlns="${NAMESPACE}">
        <block type="bricks_start_block" deletable="false" x="32" y="32">
            <next>
                <block type="bricks_preflight">
                    <next>
                        <block type="bricks_take_off">
                            <next>
                                <block type="bricks_landing"></block>
                            </next>
                        </block>
                    </next>
                </block>
            </next>
        </block>
    </xml>
`;
