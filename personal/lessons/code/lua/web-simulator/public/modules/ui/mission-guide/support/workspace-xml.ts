export function buildTargetWorkspaceXml(lessonId: string, targetBlockIds: string[]): string {
    if (lessonId === 'lua-led-sequence') {
        return `
            <xml>
                <block type="lua_ledbar_new">
                    <field name="COUNT">29</field>
                    <next>
                        <block type="lua_timer_calllater">
                            <field name="DELAY">1</field>
                            <statement name="CALLBACK">
                                <block type="lua_led_set">
                                    <field name="INDEX">0</field>
                                    <field name="R">0</field>
                                    <field name="G">0</field>
                                    <field name="B">1</field>
                                </block>
                            </statement>
                            <next>
                                <block type="lua_timer_calllater">
                                    <field name="DELAY">2</field>
                                    <statement name="CALLBACK">
                                        <block type="lua_led_set">
                                            <field name="INDEX">0</field>
                                            <field name="R">0</field>
                                            <field name="G">1</field>
                                            <field name="B">0</field>
                                        </block>
                                    </statement>
                                    <next>
                                        <block type="lua_timer_calllater">
                                            <field name="DELAY">3</field>
                                            <statement name="CALLBACK">
                                                <block type="lua_led_set">
                                                    <field name="INDEX">0</field>
                                                    <field name="R">1</field>
                                                    <field name="G">0</field>
                                                    <field name="B">0</field>
                                                </block>
                                            </statement>
                                        </block>
                                    </next>
                                </block>
                            </next>
                        </block>
                    </next>
                </block>
            </xml>
        `;
    }

    let blockMarkup = '';
    for (let index = targetBlockIds.length - 1; index >= 0; index -= 1) {
        const blockId = targetBlockIds[index];
        blockMarkup = blockMarkup === ''
            ? `<block type="${blockId}"></block>`
            : `<block type="${blockId}"><next>${blockMarkup}</next></block>`;
    }

    return `<xml>${blockMarkup}</xml>`;
}
